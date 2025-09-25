import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreatePersonnelDto } from './dto/create-personnel.dto';
import { UpdatePersonnelDto } from './dto/update-personnel.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class PersonnelService {
  constructor(private prisma: PrismaService) {}

  async create(createPersonnelDto: CreatePersonnelDto) {
    return this.prisma.$transaction(async (tx) => {
      // Check for duplicate email
      const existingPersonnel = await tx.personnel.findUnique({
        where: { email: createPersonnelDto.email },
      });

      if (existingPersonnel) {
        throw new BadRequestException(
          'Personnel with this email already exists',
        );
      }
      const prismaData = {
        ...createPersonnelDto,
        hireDate: createPersonnelDto.hireDate
          ? new Date(createPersonnelDto.hireDate)
          : undefined,
      };
      // Create personnel
      return tx.personnel.create({
        data: prismaData,
        include: {
          company: true,
          service: true,
        },
      });
    });
  }
  //This function fetches paginated data
  async findPersonnels(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      deletedOnly?: boolean;
    } = {},
  ) {
    const {
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'identifier',
      sortOrder = 'asc',
    } = options;

    const where: any = { companyId };
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { identifier: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const deletedOnly = options.deletedOnly ?? false; // Explicitly handle undefined
    if (deletedOnly === true) {
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
    }
    console.log('findAll - where clause:', where); // Temporary debug

    const total = await this.prisma.personnel.count({ where });
    const data = await this.prisma.personnel.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    return { total, page, pageSize, data };
  }

  //This function fetches all data without pagination
  async findAllPersonnels(companyId: number) {
    return this.prisma.personnel.findMany({
      where: { companyId, deletedAt: null },
    });
  }

  async findOne(id: number) {
    const personnel = await this.prisma.personnel.findUnique({
      where: { id, deletedAt: null },
      include: {
        contracts: {
          where: { deletedAt: null },
          include: {
            file: true,
          },
        },
        company: true,
        service: true,
      },
    });

    if (!personnel) {
      throw new NotFoundException(`Personnel with ID ${id} not found`);
    }

    return personnel;
  }

  async update(id: number, updatePersonnelDto: UpdatePersonnelDto) {
    await this.findOne(id); // Verify personnel exists

    const prismaData = {
      ...updatePersonnelDto,
      hireDate: updatePersonnelDto.hireDate
        ? new Date(updatePersonnelDto.hireDate)
        : undefined,
    };
    return this.prisma.personnel.update({
      where: { id },
      data: prismaData,
      include: {
        company: true,
        service: true,
      },
    });
  }

  async remove(id: number) {
    const personnel = await this.prisma.personnel.findUnique({ where: { id } });
    if (!personnel) throw new NotFoundException('personnel not found');

    if (personnel.isDeleted) {
      return {
        id: personnel.id,
        isDeleted: personnel.isDeleted,
      };
    }

    const updated = await this.prisma.personnel.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return updated;
  }

  async restore(id: number) {
    const personnel = await this.prisma.personnel.findUnique({ where: { id } });
    if (!personnel) throw new NotFoundException('personnel not found');

    if (!personnel.isDeleted) {
      return {
        id: personnel.id,
        isDeleted: personnel.isDeleted,
      };
    }

    const updated = await this.prisma.personnel.update({
      where: { id },
      data: {
        isDeleted: false,
      },
    });

    return updated;
  }

  // Contract methods
  async getPersonnelContracts(
    personnelId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      deletedOnly?: boolean;
      startDate?: Date | string; // Add startDate filter
      endDate?: Date | string; // Add endDate filter
    } = {},
  ) {
    const {
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'contractNumber',
      sortOrder = 'asc',
      startDate,
      endDate,
    } = options;

    const where: any = { personnelId };

    // Search filter
    if (search) {
      where.OR = [
        { contractNumber: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Deleted filter
    const deletedOnly = options.deletedOnly ?? false;
    if (deletedOnly === true) {
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
    }

    // Date range filtering
    if (startDate || endDate) {
      where.startDate = {};

      if (startDate) {
        where.startDate.gte = new Date(startDate);
      }

      if (endDate) {
        where.startDate.lte = new Date(endDate);
      }
    }

    console.log('findAll - where clause:', where); // Temporary debug

    const total = await this.prisma.personnelContract.count({ where });
    const data = await this.prisma.personnelContract.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    return { total, page, pageSize, data };
  }

  async createContractWithFile(
    createContractDto: any,
    file: Express.Multer.File,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const normalizedDto = {
        ...createContractDto,
        personnelId: Number(createContractDto.personnelId),
        companyId: Number(createContractDto.companyId),
        startDate: new Date(createContractDto.startDate),
        endDate: new Date(createContractDto.endDate),
      };

      const contract = await tx.personnelContract.create({
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

      await tx.personnelContract.update({
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
      const existingContract = await tx.personnelContract.findUnique({
        where: { id: contractId },
        include: { file: true },
      });

      if (!existingContract) {
        throw new Error(`Contract with id ${contractId} not found`);
      }

      const normalizedDto: any = {
        ...updateContractDto,
        ...(updateContractDto.personnelId && {
          personnelId: Number(updateContractDto.personnelId),
        }),
        ...(updateContractDto.companyId && {
          companyId: Number(updateContractDto.companyId),
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
        const fileRecord = await tx.file.create({
          data: {
            filename: file.filename,
            url: file.path.replace(/\\/g, '/'),
            mimeType: file.mimetype,
            size: file.size,
          },
        });

        normalizedDto.fileId = fileRecord.id;
      }

      const updatedContract = await tx.personnelContract.update({
        where: { id: contractId },
        data: normalizedDto,
        include: { file: true },
      });

      return updatedContract;
    });
  }

  async uploadContractFile(contractId: number, file: Express.Multer.File) {
    const contract = await this.prisma.personnelContract.findUnique({
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

      await tx.personnelContract.update({
        where: { id: contractId },
        data: { fileId: fileRecord.id },
      });

      return fileRecord;
    });
  }

  async getContractWithFile(contractId: number) {
    const contract = await this.prisma.personnelContract.findUnique({
      where: { id: contractId },
      include: {
        file: true,
        personnel: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    return contract;
  }

  async removeContract(id: number) {
    const personnelContract = await this.prisma.personnelContract.findUnique({
      where: { id },
    });
    if (!personnelContract)
      throw new NotFoundException('personnelContract not found');

    if (personnelContract.isDeleted) {
      return {
        id: personnelContract.id,
        isDeleted: personnelContract.isDeleted,
      };
    }

    const updated = await this.prisma.personnelContract.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });

    return updated;
  }

  async restoreContract(id: number) {
    const personnelContract = await this.prisma.personnelContract.findUnique({
      where: { id },
    });
    if (!personnelContract)
      throw new NotFoundException('personnelContract not found');

    if (!personnelContract.isDeleted) {
      return {
        id: personnelContract.id,
        isDeleted: personnelContract.isDeleted,
      };
    }

    const updated = await this.prisma.personnelContract.update({
      where: { id },
      data: {
        isDeleted: false,
      },
    });

    return updated;
  }
}
