import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateClientContractDto } from './dto/create-client-contract.dto';
import { UpdatClientContractDto } from './dto/update-client-contract.dto';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async create(createClientDto: CreateClientDto) {
    const { contacts, locations, ...clientData } = createClientDto;

    // Validate all city IDs exist
    if (locations && locations.length > 0) {
      const cityIds = locations.map((loc) => loc.cityId);
      const existingCities = await this.prisma.city.findMany({
        where: { id: { in: cityIds } },
        select: { id: true },
      });

      const existingCityIds = existingCities.map((city) => city.id);
      const missingCityIds = cityIds.filter(
        (id) => !existingCityIds.includes(id),
      );

      if (missingCityIds.length > 0) {
        throw new NotFoundException(
          `Cities with IDs ${missingCityIds.join(', ')} not found`,
        );
      }
    }
    console.log(clientData);

    return this.prisma.client.create({
      data: {
        ...clientData,
        contacts: contacts
          ? {
              create: contacts.map((contact) => ({
                type: contact.type,
                value: contact.value,
              })),
            }
          : undefined,
        locations: locations
          ? {
              create: locations.map((location) => ({
                address: location.address,
                city: { connect: { id: location.cityId } },
              })),
            }
          : undefined,
      },
      include: {
        contacts: true,
        locations: {
          include: {
            city: true,
          },
        },
      },
    });
  }

  async findAll(companyId: number, page: number = 0, limit: number = 10) {
    const skip = page * limit;

    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        include: {
          contacts: true,
          locations: {
            include: {
              city: true,
            },
          },
          contracts: true,
          company: true,
          _count: {
            select: {
              contracts: {
                where: { deletedAt: null },
              },
              locations: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        locations: {
          include: {
            city: true,
          },
        },
        contracts: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
          include: {
            file: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async update(id: number, updateClientDto: UpdateClientDto) {
    const { contacts, locations, ...clientData } = updateClientDto;

    // Validate city IDs if locations are provided
    if (locations && locations.length > 0) {
      const cityIds = locations.map((loc) => loc.cityId);
      const existingCities = await this.prisma.city.findMany({
        where: { id: { in: cityIds } },
        select: { id: true },
      });

      const existingCityIds = existingCities.map((city) => city.id);
      const missingCityIds = cityIds.filter(
        (id) => !existingCityIds.includes(id),
      );

      if (missingCityIds.length > 0) {
        throw new NotFoundException(
          `Cities with IDs ${missingCityIds.join(', ')} not found`,
        );
      }
    }

    const updateData: any = { ...clientData };

    if (contacts !== undefined) {
      await this.prisma.clientContact.deleteMany({
        where: { clientId: id },
      });

      if (contacts && contacts.length > 0) {
        updateData.contacts = {
          create: contacts.map((contact) => ({
            type: contact.type,
            value: contact.value,
          })),
        };
      }
    }

    if (locations !== undefined) {
      await this.prisma.location.deleteMany({
        where: { clientId: id },
      });

      if (locations && locations.length > 0) {
        updateData.locations = {
          create: locations.map((location) => ({
            address: location.address,
            city: { connect: { id: location.cityId } },
          })),
        };
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: updateData,
      include: {
        contacts: true,
        locations: {
          include: {
            city: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        deletedAt: true,
        name: true,
      },
    });
  }
  async restore(id: number) {
    // find any user by id (deleted or not)
    const client = await this.prisma.client.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    // restore
    return this.prisma.client.update({
      where: { id },
      data: {
        deletedAt: null,
      },
      select: {
        id: true,
        deletedAt: true,
        name: true,
      },
    });
  }
  async createContract(createContractDto: any) {
    return this.prisma.clientContract.create({
      data: createContractDto,
    });
  }

  async createClientWithContract(createClientWithContractDto: any) {
    const { client, contract } = createClientWithContractDto;

    return this.prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          ...client,
          contacts: client.contacts
            ? {
                create: client.contacts.map((contact) => ({
                  type: contact.type,
                  value: contact.value,
                })),
              }
            : undefined,
        },
      });

      const newContract = await tx.clientContract.create({
        data: {
          ...contract,
          clientId: newClient.id,
          companyId: client.companyId,
        },
      });

      return {
        client: newClient,
        contract: newContract,
      };
    });
  }

  async createContractWithFile(
    createContractDto: any,
    file: Express.Multer.File,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const normalizedDto = {
        ...createContractDto,
        clientId: Number(createContractDto.clientId),
        companyId: Number(createContractDto.companyId),
        startDate: new Date(createContractDto.startDate),
        endDate: new Date(createContractDto.endDate),
      };

      // Check if contract number already exists
      const existingContract = await tx.clientContract.findFirst({
        where: {
          contractNumber: normalizedDto.contractNumber,
          companyId: normalizedDto.companyId,
          clientId: normalizedDto.clientId,
        },
      });

      if (existingContract) {
        throw new ConflictException(
          `Contract number ${normalizedDto.contractNumber} already exists`,
        );
      }

      console.log('eeeeee', normalizedDto);
      const contract = await tx.clientContract.create({
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

      await tx.clientContract.update({
        where: { id: contract.id },
        data: { fileId: fileRecord.id },
      });

      return { ...contract, file: fileRecord };
    });
  }

  async uploadContractFile(contractId: number, file: Express.Multer.File) {
    const contract = await this.prisma.clientContract.findUnique({
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

      await tx.clientContract.update({
        where: { id: contractId },
        data: { fileId: fileRecord.id },
      });

      return fileRecord;
    });
  }

  async getClientContracts(
    clientId: number,
    page: number = 0,
    limit: number = 10,
  ) {
    const skip = page * limit;

    // Build where clause
    const where: any = { deletedAt: null };
    if (clientId) where.clientId = clientId;

    const [clients, total] = await Promise.all([
      this.prisma.clientContract.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDate: 'desc' },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          file: true,
        },
      }),
      this.prisma.clientContract.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getContractWithFile(contractId: number) {
    const contract = await this.prisma.clientContract.findUnique({
      where: { id: contractId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        file: true,
      },
    });

    if (!contract) {
      throw new NotFoundException(`Contract with ID ${contractId} not found`);
    }

    return contract;
  }

  async updateContractWithFile(
    contractId: number,
    updateContractDto: any,
    file?: Express.Multer.File,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const existingContract = await tx.clientContract.findUnique({
        where: { id: contractId },
        include: { file: true },
      });

      if (!existingContract) {
        throw new Error(`Contract with id ${contractId} not found`);
      }

      const normalizedDto: any = {
        ...updateContractDto,
        ...(updateContractDto.clientId && {
          clientId: Number(updateContractDto.clientId),
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

      // Check if contract number already exists (excluding current contract)
      if (
        updateContractDto.contractNumber &&
        updateContractDto.contractNumber !== existingContract.contractNumber
      ) {
        const contractWithSameNumber = await tx.clientContract.findFirst({
          where: {
            contractNumber: updateContractDto.contractNumber,
            companyId: normalizedDto.companyId || existingContract.companyId,
            id: { not: contractId }, // Exclude current contract
          },
        });

        if (contractWithSameNumber) {
          throw new ConflictException(
            `Contract number ${updateContractDto.contractNumber} already exists`,
          );
        }
      }

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

      const updatedContract = await tx.clientContract.update({
        where: { id: contractId },
        data: normalizedDto,
        include: { file: true },
      });

      return updatedContract;
    });
  }

  async removeContract(id: number) {
    return this.prisma.clientContract.update({
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
    // find any user by id (deleted or not)
    const client = await this.prisma.clientContract.findUnique({
      where: { id },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    // restore
    return this.prisma.clientContract.update({
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
