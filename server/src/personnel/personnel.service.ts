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
  async findPersonnels(companyId: number, page: number, limit: number) {
    const skip = page * limit;
    const [personnel, total] = await Promise.all([
      this.prisma.personnel.findMany({
        where: { companyId, deletedAt: null },
        skip,
        take: limit,
        include: {
          contracts: {
            where: { deletedAt: null },
          },
          company: true,
          service: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.personnel.count({
        where: { companyId, deletedAt: null },
      }),
    ]);

    return {
      data: personnel,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
    await this.findOne(id); // Verify personnel exists

    return this.prisma.personnel.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async restore(id: number) {
    const personnel = await this.prisma.personnel.findUnique({
      where: { id },
    });

    if (!personnel) {
      throw new NotFoundException(`Personnel with ID ${id} not found`);
    }

    return this.prisma.personnel.update({
      where: { id },
      data: { deletedAt: null },
      include: {
        company: true,
        service: true,
      },
    });
  }

  // Contract methods
  async getPersonnelContracts(
    personnelId: number,
    page: number = 0,
    limit: number = 10,
  ) {
    const skip = page * limit;

    const where: any = { deletedAt: null, personnelId };

    const [contracts, total] = await Promise.all([
      this.prisma.personnelContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          personnel: true,
          file: true,
        },
      }),
      this.prisma.personnelContract.count({ where }),
    ]);

    return {
      data: contracts,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
      console.log(normalizedDto);

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
    return this.prisma.personnelContract.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        deletedAt: true,
        contractNumber: true,
      },
    });
  }

  async restoreContract(id: number) {
    const contract = await this.prisma.personnelContract.findUnique({
      where: { id },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${id} not found`);
    }

    return this.prisma.personnelContract.update({
      where: { id },
      data: {
        deletedAt: null,
      },
      select: {
        id: true,
        deletedAt: true,
        contractNumber: true,
      },
    });
  }
}
