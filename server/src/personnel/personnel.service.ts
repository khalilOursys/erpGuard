import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { extname, join } from 'path';
import * as fs from 'fs/promises';
import { Prisma, IdentifierType } from '@prisma/client';

@Injectable()
export class PersonnelService {
  private readonly uploadDir = join(process.cwd(), 'uploads/idpapers');
  private readonly contractUploadDir = join(process.cwd(), 'uploads/personnelContracts');

  constructor(private prisma: PrismaService) {
    fs.mkdir(this.uploadDir, { recursive: true }).catch((e) =>
      console.error('Failed to create upload directory:', e),
    );
    fs.mkdir(this.contractUploadDir, { recursive: true }).catch((e) =>
      console.error('Failed to create contract upload directory:', e),
    );
  }

  async findAll(
    companyId: number,
    options: {
      page: number;
      pageSize: number;
      search: string;
      identifierType?: string;
      deletedOnly: boolean;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
    },
  ) {
    const {
      page,
      pageSize,
      search,
      identifierType,
      deletedOnly,
      sortBy,
      sortOrder,
    } = options;
    const skip = (page - 1) * pageSize;
    const where: Prisma.PersonnelWhereInput = { companyId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (identifierType) {
      where.identifierType = identifierType as IdentifierType;
    }
    if (deletedOnly) {
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
    }

    const [data, total] = await Promise.all([
      this.prisma.personnel.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: pageSize,
        include: { idPicture: true },
      }),
      this.prisma.personnel.count({ where }),
    ]);

    return { data, total };
  }

  async create(companyId: number, dto: any, file?: Express.Multer.File) {
    // Validate required fields
    if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }
    if (dto.identifier && !dto.identifierType) {
      throw new BadRequestException(
        'Identifier type required if identifier is provided',
      );
    }
    if (dto.baseSalary === undefined || dto.baseSalary === null) {
      throw new BadRequestException('Base salary is required');
    }

    let idPictureId: number | undefined;
    let tempFilePath: string | undefined;

    if (file) {
      tempFilePath = file.path;
      console.log(
        'Create: Attempting to access uploaded file at:',
        tempFilePath,
      );

      try {
        await fs.access(tempFilePath);
        console.log('Create: File access successful');
      } catch (error) {
        console.error('Create: File access failed:', error);
        throw new BadRequestException(
          `Uploaded file not found on server: ${error.message}`,
        );
      }

      const fileRecord = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          url: '',
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: dto.uploadedById || null,
        },
      });
      idPictureId = fileRecord.id;
    }

    const personnelData = {
      company: { connect: { id: companyId } },
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      identifier: dto.identifier,
      identifierType: dto.identifierType as IdentifierType | undefined,
      baseSalary: dto.baseSalary,
    };

    if (idPictureId) {
      (personnelData as any).idPicture = { connect: { id: idPictureId } };
    }

    const personnel = await this.prisma.personnel.create({
      data: personnelData,
      include: { idPicture: true },
    });

    if (file && idPictureId && tempFilePath) {
      const ext = extname(file.originalname);
      const newFilename = `${personnel.id}${ext}`;
      const newFilePath = join(this.uploadDir, newFilename);
      console.log(
        `Create: Renaming file from ${tempFilePath} to ${newFilePath}`,
      );

      try {
        await fs.rename(tempFilePath, newFilePath);
        console.log('Create: File rename successful');
        await this.prisma.file.update({
          where: { id: idPictureId },
          data: { url: `/uploads/idpapers/${newFilename}` },
        });
      } catch (error) {
        console.error('Create: File rename failed:', error);
        // Rollback: Disconnect and delete file record
        await this.prisma.personnel.update({
          where: { id: personnel.id },
          data: { idPictureId: null },
        });
        await this.prisma.file.delete({ where: { id: idPictureId } });
        throw new BadRequestException(
          `Failed to rename uploaded file: ${error.message}`,
        );
      }
    }

    return personnel;
  }

  async update(
    companyId: number,
    id: number,
    dto: any,
    file?: Express.Multer.File,
  ) {
    const existing = await this.prisma.personnel.findUnique({
      where: { id },
      include: { company: true, idPicture: true },
    });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Personnel not found');
    }
    if (existing.isDeleted) {
      throw new ForbiddenException('Cannot update deleted personnel');
    }

    // Validate required fields
    if (!dto.firstName?.trim() || !dto.lastName?.trim()) {
      throw new BadRequestException('First name and last name are required');
    }
    if (dto.identifier && !dto.identifierType) {
      throw new BadRequestException(
        'Identifier type required if identifier is provided',
      );
    }
    if (
      dto.baseSalary === undefined ||
      dto.baseSalary === null ||
      dto.baseSalary === ''
    ) {
      throw new BadRequestException('Base salary is required');
    }

    let updateData: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      identifier: dto.identifier,
      identifierType: dto.identifierType as IdentifierType | undefined,
      baseSalary: dto.baseSalary,
    };

    let idPictureId = existing.idPictureId;

    if (file) {
      console.log('Update: Received new file:', {
        path: file.path,
        filename: file.filename,
        originalname: file.originalname,
      });

      // Delete old file record and physical file if exists
      if (idPictureId) {
        const oldFile = existing.idPicture;
        if (oldFile) {
          const oldFilename = oldFile.url.split('/').pop();
          if (oldFilename) {
            const oldPath = join(this.uploadDir, oldFilename);
            try {
              await fs.unlink(oldPath);
              console.log(`Update: Deleted old file: ${oldPath}`);
            } catch (e) {
              if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
                console.error('Update: Failed to delete old file:', e);
                throw new BadRequestException(
                  `Failed to delete old file: ${e.message}`,
                );
              }
            }
            await this.prisma.file.delete({ where: { id: idPictureId } });
          }
        }
      }

      // For update, Multer already saved with final name, so no rename needed
      // Just verify file exists and create record
      const savedFilePath = file.path;
      console.log('Update: Verifying saved file at:', savedFilePath);

      try {
        await fs.access(savedFilePath);
        console.log('Update: Saved file access successful');
      } catch (error) {
        console.error('Update: Saved file access failed:', error);
        throw new BadRequestException(
          `Uploaded file not found on server: ${error.message}`,
        );
      }

      // Create new file record with the saved URL
      const ext = extname(file.originalname);
      const newFilename = `${id}${ext}`;
      const newFileUrl = `/uploads/idpapers/${newFilename}`;
      const fileRecord = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          url: newFileUrl,
          mimeType: file.mimetype,
          size: file.size,
          uploadedById: dto.uploadedById || null,
        },
      });
      idPictureId = fileRecord.id;

      // Connect the new file
      updateData.idPicture = { connect: { id: idPictureId } };
    }
    // If no file, omit idPicture from updateData to avoid unnecessary reconnect

    const updatedPersonnel = await this.prisma.personnel.update({
      where: { id },
      data: updateData,
      include: { idPicture: true },
    });

    return updatedPersonnel;
  }

  async softDelete(companyId: number, id: number) {
    const existing = await this.prisma.personnel.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Personnel not found');
    }
    return this.prisma.personnel.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restore(companyId: number, id: number) {
    const existing = await this.prisma.personnel.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Personnel not found');
    }
    return this.prisma.personnel.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });
  }
}