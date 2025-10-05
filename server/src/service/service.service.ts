import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServiceService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditLogService,
  ) {}

  // Utility to build Prisma data object for create, omitting undefined fields
  private buildCreateData(dto: CreateServiceDto & { companyId: number }) {
    const data: Prisma.ServiceCreateInput = {
      company: { connect: { id: dto.companyId } },
      name: dto.name,
    };
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.defaultBasePay !== undefined) data.defaultBasePay = dto.defaultBasePay;
    if (dto.defaultExtraPay !== undefined) data.defaultExtraPay = dto.defaultExtraPay;
    if (dto.defaultClientPrice !== undefined) data.defaultClientPrice = dto.defaultClientPrice;
    return data;
  }

  // Utility to build Prisma data object for update, omitting undefined fields
  private buildUpdateData(dto: UpdateServiceDto) {
    const data: Prisma.ServiceUpdateInput = {};
    if (dto.name !== undefined) data.name = { set: dto.name };
    if (dto.code !== undefined) data.code = { set: dto.code };
    if (dto.description !== undefined) data.description = { set: dto.description };
    if (dto.isActive !== undefined) data.isActive = { set: dto.isActive };
    if (dto.defaultBasePay !== undefined) data.defaultBasePay = { set: dto.defaultBasePay };
    if (dto.defaultExtraPay !== undefined) data.defaultExtraPay = { set: dto.defaultExtraPay };
    if (dto.defaultClientPrice !== undefined) data.defaultClientPrice = { set: dto.defaultClientPrice };
    return data;
  }

  async create(createServiceDto: CreateServiceDto & { companyId: number }, actorUserId: number) {
    const { companyId, ...dto } = createServiceDto;

    // Check for duplicates in same company
    const existing = await this.prisma.service.findFirst({
      where: {
        companyId,
        OR: [
          { name: dto.name },
          ...(dto.code ? [{ code: dto.code }] : []),
        ],
        isDeleted: false,
      },
    });
    if (existing) {
      throw new BadRequestException('Service with this name or code already exists in your company');
    }

    const data = this.buildCreateData(createServiceDto);

    const service = await this.prisma.service.create({ data });

    await this.auditService.createAuditLog({
      userId: actorUserId,
      action: 'CREATE',
      entity: 'Service',
      entityId: service.id,
      previousData: null,
      newData: service,
    });

    return service;
  }

  async findAll(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      deletedOnly?: boolean;
      inactiveOnly?: boolean;
      code?: string;
    } = {},
  ) {
    const {
      page = 1,
      pageSize = 25,
      search = '',
      sortBy = 'name',
      sortOrder = 'asc',
      deletedOnly = false,
      inactiveOnly = false,
      code,
    } = options;

    console.log('FindAll Options:', { companyId, ...options }); // Debug log

    const where: Prisma.ServiceWhereInput = { 
      companyId,
      isDeleted: deletedOnly,
      isActive: !inactiveOnly, // Show active (true) by default, inactive (false) when inactiveOnly=true
    };
    if (search || code) {
      where.AND = [];
      if (search) {
        where.AND.push({
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
            { description: { contains: search, mode: 'insensitive' } },
          ],
        });
      }
      if (code) {
        where.AND.push({ code: { equals: code, mode: 'insensitive' } });
      }
    }

    console.log('Where clause:', JSON.stringify(where, null, 2)); // Debug log

    const total = await this.prisma.service.count({ where });
    const data = await this.prisma.service.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
    });

    return { total, page, pageSize, data };
  }

  async findOne(companyId: number, id: number) {
    const service = await this.prisma.service.findUnique({
      where: { id },
    });
    if (!service || service.companyId !== companyId) {
      throw new NotFoundException('Service not found');
    }
    return service;
  }

  async update(
    companyId: number,
    id: number,
    updateServiceDto: UpdateServiceDto & { companyId: number },
    actorUserId: number,
  ) {
    const existing = await this.findOne(companyId, id);

    const { companyId: _, ...dto } = updateServiceDto; // Ignore companyId from DTO

    // Check duplicates if updating name or code
    if (dto.name || dto.code) {
      const duplicate = await this.prisma.service.findFirst({
        where: {
          id: { not: id },
          companyId,
          OR: [
            ...(dto.name ? [{ name: dto.name }] : []),
            ...(dto.code ? [{ code: dto.code }] : []),
          ],
          isDeleted: false,
        },
      });
      if (duplicate) {
        throw new BadRequestException('Service with this name or code already exists in your company');
      }
    }

    const data = this.buildUpdateData(dto);

    const updated = await this.prisma.service.update({
      where: { id },
      data,
    });

    await this.auditService.createAuditLog({
      userId: actorUserId,
      action: 'UPDATE',
      entity: 'Service',
      entityId: id,
      previousData: existing,
      newData: updated,
    });

    return updated;
  }

  async remove(companyId: number, id: number, actorUserId: number) {
    const existing = await this.findOne(companyId, id);

    const updated = await this.prisma.service.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    await this.auditService.createAuditLog({
      userId: actorUserId,
      action: 'DELETE',
      entity: 'Service',
      entityId: id,
      previousData: existing,
      newData: updated,
    });

    return updated;
  }

  async restore(companyId: number, id: number, actorUserId: number) {
    const existing = await this.findOne(companyId, id);
    if (!existing.isDeleted) {
      return existing;
    }

    const updated = await this.prisma.service.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });

    await this.auditService.createAuditLog({
      userId: actorUserId,
      action: 'RESTORE',
      entity: 'Service',
      entityId: id,
      previousData: existing,
      newData: updated,
    });

    return updated;
  }
}