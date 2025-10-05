import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { QuerySitesDto } from './dto/query-sites.dto';

@Injectable()
export class SitesService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: number, dto: CreateSiteDto) {
    // Validate client ownership
    const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
    if (!client || client.companyId !== companyId) throw new BadRequestException('Client not found');

    const site = await this.prisma.site.create({
      data: {
        clientId: dto.clientId,
        name: dto.name,
        road: dto.road ?? null,
        postalCode: dto.postalCode ?? null,
        address: dto.address,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        countryCode: dto.countryCode ?? null,
        stateCode: dto.stateCode ?? null,
      },
    });

    return site;
  }

  async findAll(companyId: number, options: QuerySitesDto = {}) {
    const {
      page = 1,
      pageSize = 25,
      search = '',
      clientId,
      deletedOnly = false,
    } = options;

    const where: any = { client: { companyId } };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (clientId) where.clientId = clientId;
    if (deletedOnly) where.isDeleted = true;
    else where.isDeleted = false;

    const total = await this.prisma.site.count({ where });
    const data = await this.prisma.site.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    return { total, page, pageSize, data };
  }

  async findOne(companyId: number, id: number) {
    const site = await this.prisma.site.findUnique({
      where: { id },
      include: {
        client: true,
      },
    });
    if (!site || site.client.companyId !== companyId) throw new NotFoundException('Site not found');
    return site;
  }

  async update(companyId: number, id: number, dto: UpdateSiteDto) {
    const site = await this.prisma.site.findUnique({ where: { id }, include: { client: true } });
    if (!site || site.client.companyId !== companyId) throw new NotFoundException('Site not found');
    if (site.isDeleted) throw new BadRequestException('Cannot update deleted site');

    if (dto.clientId && dto.clientId !== site.clientId) {
      const newClient = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!newClient || newClient.companyId !== companyId) throw new BadRequestException('Invalid client');
    }

    const updated = await this.prisma.site.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async remove(companyId: number, id: number) {
    const site = await this.prisma.site.findUnique({ where: { id }, include: { client: true } });
    if (!site || site.client.companyId !== companyId) throw new NotFoundException('Site not found');

    if (site.isDeleted) return { id: site.id, isDeleted: true };

    const updated = await this.prisma.site.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
      select: { id: true, isDeleted: true },
    });

    return updated;
  }

  async restore(companyId: number, id: number) {
    const site = await this.prisma.site.findUnique({ where: { id }, include: { client: true } });
    if (!site || site.client.companyId !== companyId) throw new NotFoundException('Site not found');

    if (!site.isDeleted) return { id: site.id, isDeleted: false };

    const updated = await this.prisma.site.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      select: { id: true, isDeleted: true },
    });

    return updated;
  }
}