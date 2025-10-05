// src/modules/client/client.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class ClientService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: number, dto: CreateClientDto, actorUserId?: number) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new BadRequestException('Company not found');

    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          companyId,
          name: dto.name,
          type: dto.type,
          address: dto.address ?? null,
          tax_number: dto.tax_number ?? null,
          rib: dto.rib ?? null,
        },
      });

      if (dto.contacts && dto.contacts.length > 0) {
        const contactsData = dto.contacts.map((c) => ({ ...c, clientId: client.id }));
        await tx.clientContact.createMany({ data: contactsData, skipDuplicates: true });
      }

      if (dto.sites && dto.sites.length > 0) {
        const sitesData = dto.sites.map((s) => ({
          clientId: client.id,
          name: s.name ?? null,
          road: s.road ?? null,
          postalCode: s.postalCode ?? null,
          address: s.address,
          latitude: s.latitude ?? null,
          longitude: s.longitude ?? null,
          countryCode: s.countryCode ?? null, // Explicitly typed as string | null
          stateCode: s.stateCode ?? null,    // Explicitly typed as string | null
        }));
        await tx.site.createMany({ data: sitesData, skipDuplicates: true });
      }

      return this.prisma.client.findUnique({
        where: { id: client.id },
        include: {
          contacts: true,
          sites: true,
        },
      });
    });
  }

  async findAll(
    companyId: number,
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      deletedOnly?: boolean;
      type?: string;
    } = {},
  ) {
    const { page = 1, pageSize = 25, search = '', deletedOnly = false, type } = options;
    const where: any = { companyId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { tax_number: { contains: search, mode: 'insensitive' } },
        { rib: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (typeof type !== 'undefined') where.type = type;
    where.isDeleted = deletedOnly === true;

    const total = await this.prisma.client.count({ where });
    const items = await this.prisma.client.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
      include: { contacts: true, sites: true },
    });

    return { total, page, pageSize, data: items };
  }

  async findOne(companyId: number, id: number, withDeleted = false) {
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { contacts: true, sites: true, contracts: true },
    });
    if (!client || (!withDeleted && client.isDeleted) || client.companyId !== companyId) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

  async update(companyId: number, id: number, dto: UpdateClientDto) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) throw new NotFoundException('Client not found');
    if (existing.isDeleted) throw new BadRequestException('Cannot update deleted client');

    const data: any = { ...dto };
    delete data.sites;
    delete data.contacts;

    const updated = await this.prisma.client.update({
      where: { id },
      data,
      include: { contacts: true, sites: true },
    });
    return updated;
  }

  async remove(companyId: number, id: number) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) throw new NotFoundException('Client not found');

    if (existing.isDeleted) {
      return { id: existing.id, name: existing.name, isDeleted: true };
    }
    return this.prisma.client.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restore(companyId: number, id: number) {
    const existing = await this.prisma.client.findUnique({ where: { id } });
    if (!existing || existing.companyId !== companyId) throw new NotFoundException('Client not found');

    if (!existing.isDeleted) {
      return { id: existing.id, name: existing.name, isDeleted: false };
    }
    return this.prisma.client.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });
  }

  async addSite(companyId: number, clientId: number, dto: CreateSiteDto) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client || client.companyId !== companyId) throw new NotFoundException('Client not found');

    const site = await this.prisma.site.create({
      data: {
        clientId,
        name: dto.name ?? null,
        road: dto.road ?? null,
        postalCode: dto.postalCode ?? null,
        address: dto.address,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        countryCode: dto.countryCode ?? null, // Ensure this is string | null
        stateCode: dto.stateCode ?? null,    // Ensure this is string | null
      },
    });
    return site;
  }

  async updateSite(companyId: number, siteId: number, dto: UpdateSiteDto) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const client = await this.prisma.client.findUnique({ where: { id: site.clientId } });
    if (!client || client.companyId !== companyId) throw new NotFoundException('Site not found');

    const data: any = { ...dto };

    return this.prisma.site.update({
      where: { id: siteId },
      data,
    });
  }

  async removeSite(companyId: number, siteId: number) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const client = await this.prisma.client.findUnique({ where: { id: site.clientId } });
    if (!client || client.companyId !== companyId) throw new NotFoundException('Site not found');

    if (site.isDeleted) return { id: site.id, isDeleted: true };
    return this.prisma.site.update({
      where: { id: siteId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restoreSite(companyId: number, siteId: number) {
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException('Site not found');

    const client = await this.prisma.client.findUnique({ where: { id: site.clientId } });
    if (!client || client.companyId !== companyId) throw new NotFoundException('Site not found');

    if (!site.isDeleted) return { id: site.id, isDeleted: false };
    return this.prisma.site.update({
      where: { id: siteId },
      data: { isDeleted: false, deletedAt: null },
    });
  }

  async addContact(companyId: number, clientId: number, dto: any) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client || client.companyId !== companyId) throw new NotFoundException('Client not found');
    return this.prisma.clientContact.create({ data: { ...dto, clientId } });
  }

  async updateContact(companyId: number, contactId: number, dto: any) {
    const contact = await this.prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');
    const client = await this.prisma.client.findUnique({ where: { id: contact.clientId } });
    if (!client || client.companyId !== companyId) throw new NotFoundException('Contact not found');
    return this.prisma.clientContact.update({ where: { id: contactId }, data: dto });
  }

  async removeContact(companyId: number, contactId: number) {
    const contact = await this.prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');
    const client = await this.prisma.client.findUnique({ where: { id: contact.clientId } });
    if (!client || client.companyId !== companyId) throw new NotFoundException('Contact not found');

    if ('isDeleted' in contact && contact.isDeleted) return { id: contact.id, isDeleted: true };
    return this.prisma.clientContact.update({
      where: { id: contactId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }

  async restoreContact(companyId: number, contactId: number) {
    const contact = await this.prisma.clientContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new NotFoundException('Contact not found');
    const client = await this.prisma.client.findUnique({ where: { id: contact.clientId } });
    if (!client || client.companyId !== companyId) throw new NotFoundException('Contact not found');

    if ('isDeleted' in contact && !contact.isDeleted) return { id: contact.id, isDeleted: false };
    return this.prisma.clientContact.update({
      where: { id: contactId },
      data: { isDeleted: false, deletedAt: null },
    });
  }
}