import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

  async create(createServiceDto: CreateServiceDto) {
    // Check if service with same name already exists for this company
    const existingService = await this.prisma.service.findFirst({
      where: {
        companyId: createServiceDto.companyId,
        OR: [
          { name: createServiceDto.name },
          ...(createServiceDto.code ? [{ code: createServiceDto.code }] : []),
        ],
      },
    });

    if (existingService) {
      throw new BadRequestException(
        `Service with name '${createServiceDto.name}' or code '${createServiceDto.code}' already exists for this company`,
      );
    }

    return this.prisma.service.create({
      data: createServiceDto,
    });
  }

  async findServices(companyId: number, page: number, limit: number) {
    const skip = page * limit;

    const where: any = { deletedAt: null };
    if (companyId) where.companyId = companyId;

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              personnel: true,
              BillingLine: true,
              MissionServiceRequirement: true,
              ClientContractService: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.service.count({ where }),
    ]);

    return {
      data: services,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllServices(companyId: number) {
    return this.prisma.service.findMany({
      where: { companyId, deletedAt: null },
    });
  }

  async findOne(id: number) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        personnel: true,
      },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return service;
  }

  async update(id: number, updateServiceDto: UpdateServiceDto) {
    await this.findOne(id); // Verify service exists

    // If updating name or code, check for duplicates within the same company
    if (updateServiceDto.name || updateServiceDto.code) {
      const existingService = await this.prisma.service.findFirst({
        where: {
          id: { not: id },
          companyId: updateServiceDto.companyId,
          OR: [
            ...(updateServiceDto.name ? [{ name: updateServiceDto.name }] : []),
            ...(updateServiceDto.code ? [{ code: updateServiceDto.code }] : []),
          ],
        },
      });

      if (existingService) {
        throw new BadRequestException(
          `Service with name '${updateServiceDto.name}' or code '${updateServiceDto.code}' already exists for this company`,
        );
      }
    }

    return this.prisma.service.update({
      where: { id },
      data: updateServiceDto,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: {
        id: true,
        deletedAt: true,
      },
    });
  }
}
