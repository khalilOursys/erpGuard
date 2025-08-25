import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateGuardDto } from './dto/create-guard.dto';
import { UpdateGuardDto } from './dto/update-guard.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class GuardService {
  constructor(private prisma: PrismaService) {}

  async create(createGuardDto: CreateGuardDto) {
    const { qualifications, ...guardData } = createGuardDto;

    return this.prisma.$transaction(async (tx) => {
      // Validate qualifications exist
      if (qualifications && qualifications.length > 0) {
        const qualificationIds = qualifications.map((q) => q.qualificationId);
        const existingQualifications = await tx.guardQualification.findMany({
          where: { id: { in: qualificationIds } },
          select: { id: true },
        });

        const existingIds = existingQualifications.map((q) => q.id);
        const missingIds = qualificationIds.filter(
          (id) => !existingIds.includes(id),
        );

        if (missingIds.length > 0) {
          throw new NotFoundException(
            `Qualifications not found: ${missingIds.join(', ')}`,
          );
        }
      }

      // Check for duplicate email
      const existingGuard = await tx.guard.findUnique({
        where: { email: guardData.email },
      });

      if (existingGuard) {
        throw new BadRequestException('Guard with this email already exists');
      }

      // Create guard with qualifications
      return tx.guard.create({
        data: {
          ...guardData,
          qualifications: qualifications
            ? {
                create: qualifications.map((qual) => ({
                  qualificationId: qual.qualificationId,
                  issuedAt: qual.issuedAt ? new Date(qual.issuedAt) : null,
                  expiresAt: qual.expiresAt ? new Date(qual.expiresAt) : null,
                })),
              }
            : undefined,
        },
        include: {
          qualifications: {
            include: {
              qualification: true,
            },
          },
          company: true,
        },
      });
    });
  }

  async findAll(companyId: number, page: number, limit: number) {
    const skip = page * limit;
    const [guards, total] = await Promise.all([
      this.prisma.guard.findMany({
        where: { companyId, deletedAt: null },
        skip,
        take: limit,
        include: {
          qualifications: {
            include: {
              qualification: true,
            },
          },
          contracts: {
            where: { deletedAt: null },
          },
          company: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.guard.count({
        where: { companyId, deletedAt: null },
      }),
    ]);

    return {
      data: guards,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const guard = await this.prisma.guard.findUnique({
      where: { id, deletedAt: null },
      include: {
        qualifications: {
          include: {
            qualification: true,
          },
        },
        contracts: {
          where: { deletedAt: null },
          include: {
            file: true,
          },
        },
        company: true,
      },
    });

    if (!guard) {
      throw new NotFoundException(`Guard with ID ${id} not found`);
    }

    return guard;
  }

  async update(id: number, updateGuardDto: UpdateGuardDto) {
    await this.findOne(id); // Verify guard exists

    return this.prisma.guard.update({
      where: { id },
      data: updateGuardDto,
      include: {
        qualifications: {
          include: {
            qualification: true,
          },
        },
        company: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id); // Verify guard exists

    return this.prisma.guard.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number) {
    const guard = await this.prisma.guard.findUnique({
      where: { id },
    });

    if (!guard) {
      throw new NotFoundException(`Guard with ID ${id} not found`);
    }

    return this.prisma.guard.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        qualifications: {
          include: {
            qualification: true,
          },
        },
        company: true,
      },
    });
  }

  // Contract methods
  async getGuardContracts(guardId: number) {
    await this.findOne(guardId); // Verify guard exists

    return this.prisma.guardContract.findMany({
      where: { guardId, deletedAt: null },
      include: {
        file: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createContractWithFile(
    createContractDto: any,
    file: Express.Multer.File,
  ) {
    console.log(createContractDto);

    return this.prisma.$transaction(async (tx) => {
      const normalizedDto = {
        ...createContractDto,
        guardId: Number(createContractDto.guardId),
        startDate: new Date(createContractDto.startDate),
        endDate: new Date(createContractDto.endDate),
      };

      console.log('normalizedDto', normalizedDto);
      const contract = await tx.guardContract.create({
        data: normalizedDto,
      });

      const fileRecord = await tx.file.create({
        data: {
          filename: file.filename,
          url: file.path.replace(/\\/g, '/'),
          mimeType: file.mimetype,
          size: file.size,
        },
      });

      await tx.guardContract.update({
        where: { id: contract.id },
        data: { fileId: fileRecord.id },
      });

      return { ...contract, file: fileRecord };
    });
  }

  async updateContractWithFile(
    contractId: number,
    updateContractDto: any,
    file?: Express.Multer.File,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingContract = await tx.guardContract.findUnique({
        where: { id: contractId },
        include: { file: true },
      });

      if (!existingContract) {
        throw new Error(`Contract with id ${contractId} not found`);
      }
      const normalizedDto: any = {
        ...updateContractDto,
        ...(updateContractDto.clientId && {
          guardId: Number(updateContractDto.guardId),
        }),
        ...(updateContractDto.startDate && {
          startDate: new Date(updateContractDto.startDate),
        }),
        ...(updateContractDto.endDate && {
          endDate: new Date(updateContractDto.endDate),
        }),
      };

      normalizedDto.fileId = existingContract.fileId;
      if (file) {
        let fileRecord = await tx.file.create({
          data: {
            filename: file.filename,
            url: file.path.replace(/\\/g, '/'),
            mimeType: file.mimetype,
            size: file.size,
          },
        });

        normalizedDto.fileId = fileRecord.id;
      }

      const updatedContract = await tx.guardContract.update({
        where: { id: contractId },
        data: normalizedDto,
        include: { file: true }, // will auto-include linked file if exists
      });

      return updatedContract;
    });
  }

  async uploadContractFile(contractId: number, file: Express.Multer.File) {
    const contract = await this.prisma.guardContract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    if (contract.fileId) {
      throw new BadRequestException('Contract already has a file attached');
    }

    return this.prisma.$transaction(async (tx) => {
      const fileRecord = await tx.file.create({
        data: {
          filename: file.filename,
          url: file.path.replace(/\\/g, '/'),
          mimeType: file.mimetype,
          size: file.size,
        },
      });

      await tx.guardContract.update({
        where: { id: contractId },
        data: { fileId: fileRecord.id },
      });

      return fileRecord;
    });
  }

  async getContractWithFile(contractId: number) {
    const contract = await this.prisma.guardContract.findUnique({
      where: { id: contractId },
      include: {
        file: true,
        guard: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    return contract;
  }
}
