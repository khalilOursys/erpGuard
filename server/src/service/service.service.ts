import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { PrismaService } from 'src/prisma.service';
import { AuditLogService } from 'src/audit-log/audit-log.service';

@Injectable()
export class ServiceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditLogService,
  ) {}

  async create(createServiceDto: CreateServiceDto, actorUserId: number) {
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
    const service = await this.prisma.service.create({
      data: createServiceDto,
    });
    await this.auditService.createAuditLog({
      userId: actorUserId,
      action: 'CREATE',
      entity: 'Service',
      entityId: service.id,
      previousData: service,
      newData: service,
    });

    return service;
  }

  /**
   * Paginated user listing with:
   * - deletedOnly: boolean (if true => only deleted users; if false => only non-deleted)
   * - search: free text on identifier/displayname/email
   * - sorting, pagination
   */
  async findServices(
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
      sortBy = 'name',
      sortOrder = 'asc',
    } = options;

    const where: any = { companyId };
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    const deletedOnly = options.deletedOnly ?? false; // Explicitly handle undefined
    if (deletedOnly === true) {
      where.isDeleted = true;
    } else {
      where.isDeleted = false;
    }
    console.log('findAll - where clause:', where); // Temporary debug

    const total = await this.prisma.service.count({ where });
    const data = await this.prisma.service.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    return { total, page, pageSize, data };
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

  async update(
    id: number,
    updateServiceDto: UpdateServiceDto,
    actorUserId: number,
  ) {
    const existingService = await this.findOne(id); // Verify service exists

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

    const updatedService = await this.prisma.service.update({
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

    // Audit log
    await this.auditService.createAuditLog({
      userId: actorUserId,
      action: 'UPDATE',
      entity: 'Service',
      entityId: id,
      previousData: existingService,
      newData: updatedService,
    });

    return updatedService;
  }

  async remove(id: number, actorUserId: number) {
    const existingService = await this.findOne(id);

    const result = await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date(), isDeleted: true },
    });

    // Audit log
    await this.auditService.createAuditLog({
      userId: actorUserId,
      action: 'DELETE',
      entity: 'Service',
      entityId: id,
      newData: result,
      previousData: existingService,
    });

    return result;
  }

  async restore(id: number, actorUserId: number) {
    const service = await this.prisma.service.findUnique({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');

    if (!service.isDeleted) {
      return {
        id: service.id,
        isDeleted: service.isDeleted,
      };
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: {
        isDeleted: false,
      },
    });

    // Audit log
    await this.auditService.createAuditLog({
      userId: actorUserId,
      action: 'RESTORE',
      entity: 'Service',
      entityId: id,
      previousData: service,
      newData: updated,
    });

    return updated;
  }
}
