import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { extname, join } from 'path';
import * as fs from 'fs/promises';
import { Prisma } from '@prisma/client';
import { CreatePersonnelContractDto } from './dto/create-personnel-contract.dto';
import { UpdatePersonnelContractDto } from './dto/update-personnel-contract.dto';

@Injectable()
export class PersonnelContractService {
  private readonly uploadDir = join(process.cwd(), 'uploads/personnelContracts');

  constructor(private prisma: PrismaService) {
    fs.mkdir(this.uploadDir, { recursive: true }).catch((e) =>
      console.error('Failed to create upload directory:', e),
    );
  }

  async findAllForPersonnel(
    companyId: number,
    personnelId: number,
    options: {
      page: number;
      pageSize: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      deletedOnly?: boolean;
    },
  ) {
    const {
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'startDate',
      sortOrder = 'asc',
      deletedOnly = false,
    } = options;
    const skip = (page - 1) * pageSize;
    const where: Prisma.PersonnelContractWhereInput = {
      personnelId,
      companyId,
    };

    if (search) {
      where.OR = [{ contractNumber: { contains: search, mode: 'insensitive' } }];
    }

    if (deletedOnly) {
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
    }

    const [data, total] = await Promise.all([
      this.prisma.personnelContract.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
        include: { file: true },
      }),
      this.prisma.personnelContract.count({ where }),
    ]);

    return { data, total };
  }

  async create(
    companyId: number,
    personnelId: number,
    dto: CreatePersonnelContractDto,
    file?: Express.Multer.File,
  ) {
    const personnel = await this.prisma.personnel.findUnique({
      where: { id: personnelId },
    });
    if (!personnel || personnel.companyId !== companyId) {
      throw new NotFoundException('Personnel not found');
    }

    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) {
      throw new BadRequestException('End date must be after start date');
    }

    let fileId: number | undefined;
    let tempFilePath: string | undefined;

    if (file) {
      tempFilePath = file.path;
      try {
        await fs.access(tempFilePath);
      } catch (error) {
        throw new BadRequestException(`Uploaded file not found: ${error.message}`);
      }

      const fileRecord = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          url: '',
          mimeType: file.mimetype,
          size: file.size,
        },
      });
      fileId = fileRecord.id;
    }

    const contractData = {
      contractNumber: dto.contractNumber,
      startDate: start,
      endDate: end,
      personnel: { connect: { id: personnelId } },
      companyId,
    };

    if (fileId) {
      (contractData as any).file = { connect: { id: fileId } };
    }

    const contract = await this.prisma.personnelContract.create({
      data: contractData,
      include: { file: true },
    });

    if (file && fileId && tempFilePath) {
      const ext = extname(file.originalname);
      const newFilename = `${contract.id}${ext}`;
      const newFilePath = join(this.uploadDir, newFilename);

      try {
        await fs.rename(tempFilePath, newFilePath);
        await this.prisma.file.update({
          where: { id: fileId },
          data: { url: `/uploads/personnelContracts/${newFilename}` },
        });
      } catch (error) {
        // Rollback
        await this.prisma.personnelContract.update({
          where: { id: contract.id },
          data: { fileId: null },
        });
        await this.prisma.file.delete({ where: { id: fileId } });
        throw new BadRequestException(`Failed to save file: ${error.message}`);
      }
    }

    return contract;
  }

  async update(
    companyId: number,
    personnelId: number,
    id: number,
    dto: UpdatePersonnelContractDto,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.personnelContract.findUnique({
      where: { id },
      include: { personnel: true, file: true },
    });
    if (!existing || existing.personnelId !== personnelId || existing.companyId !== companyId) {
      throw new NotFoundException('Contract not found');
    }
    if (existing.isDeleted) {
      throw new ForbiddenException('Cannot update deleted contract');
    }

    let updateData: any = {};

    if (dto.contractNumber) updateData.contractNumber = dto.contractNumber;

    if (dto.startDate || dto.endDate) {
      const start = dto.startDate ? new Date(dto.startDate) : new Date(existing.startDate);
      const end = dto.endDate ? new Date(dto.endDate) : new Date(existing.endDate);
      if (end < start) {
        throw new BadRequestException('End date must be after start date');
      }
      updateData.startDate = start;
      updateData.endDate = end;
    }

    let fileId = existing.fileId;

    if (file) {
      // Delete old file if exists
      if (fileId) {
        const oldFile = existing.file;
        if (oldFile) {
          const oldFilename = oldFile.url.split('/').pop();
          if (oldFilename) {
            const oldPath = join(this.uploadDir, oldFilename);
            try {
              await fs.unlink(oldPath);
            } catch (e) {
              if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw new BadRequestException(`Failed to delete old file: ${e.message}`);
              }
            }
            await this.prisma.file.delete({ where: { id: fileId } });
          }
        }
      }

      // Save new file
      const savedFilePath = file.path;
      try {
        await fs.access(savedFilePath);
      } catch (error) {
        throw new BadRequestException(`Uploaded file not found: ${error.message}`);
      }

      const ext = extname(file.originalname);
      const newFilename = `${id}${ext}`;
      const newFileUrl = `/uploads/personnelContracts/${newFilename}`;
      const fileRecord = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          url: newFileUrl,
          mimeType: file.mimetype,
          size: file.size,
        },
      });
      fileId = fileRecord.id;
      updateData.file = { connect: { id: fileId } };
    }

    const updatedContract = await this.prisma.personnelContract.update({
      where: { id },
      data: updateData,
      include: { file: true },
    });

    return updatedContract;
  }

  async softDelete(companyId: number, personnelId: number, id: number) {
    const existing = await this.prisma.personnelContract.findUnique({ where: { id } });
    if (!existing || existing.personnelId !== personnelId || existing.companyId !== companyId) {
      throw new NotFoundException('Contract not found');
    }
    return this.prisma.personnelContract.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restore(companyId: number, personnelId: number, id: number) {
    const existing = await this.prisma.personnelContract.findUnique({ where: { id } });
    if (!existing || existing.personnelId !== personnelId || existing.companyId !== companyId) {
      throw new NotFoundException('Contract not found');
    }
    return this.prisma.personnelContract.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });
  }
}