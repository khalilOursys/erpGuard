// src/modules/client/client.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import {  UpsertClientContactDto, UpsertSiteDto } from './dto/update-client.dto';

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
      include: { 
        contacts: { where: { isDeleted: false } },
        sites: { where: { isDeleted: false } },
      },
    });

    return { total, page, pageSize, data: items };
  }

  async findOne(companyId: number, id: number, withDeleted = false) {
    const includeDeleted = withDeleted; // Optional: if withDeleted=true, include soft-deleted relations
    const client = await this.prisma.client.findUnique({
      where: { id },
      include: { 
        contacts: { where: { isDeleted: includeDeleted ? undefined : false } },
        sites: { where: { isDeleted: includeDeleted ? undefined : false } },
        contracts: true,
      },
    });
    if (!client || (!withDeleted && client.isDeleted) || client.companyId !== companyId) {
      throw new NotFoundException('Client not found');
    }
    return client;
  }

async update(companyId: number, id: number, dto: UpdateClientDto) {
    const existing = await this.prisma.client.findUnique({
      where: { id },
      include: {
        contacts: true,
        sites: true,
      },
    });
    if (!existing || existing.companyId !== companyId) {
      throw new NotFoundException('Client not found');
    }
    if (existing.isDeleted) {
      throw new BadRequestException('Cannot update deleted client');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update core client fields
      const clientData: any = {};
      if (dto.name !== undefined) clientData.name = dto.name;
      if (dto.type !== undefined) clientData.type = dto.type;
      if (dto.address !== undefined) clientData.address = dto.address ?? null;
      if (dto.tax_number !== undefined) clientData.tax_number = dto.tax_number ?? null;
      if (dto.rib !== undefined) clientData.rib = dto.rib ?? null;

      const updatedClient = await tx.client.update({
        where: { id },
        data: clientData,
      });

      // Handle contacts (full sync: update/create existing/submitted, soft-delete removed)
      const existingContacts = existing.contacts || [];
      const submittedContacts: UpsertClientContactDto[] = dto.contacts || [];
      const existingContactIds = existingContacts.map((c) => c.id);
      const submittedContactIds = submittedContacts
        .filter((c) => c.id !== undefined && c.id !== null)
        .map((c) => c.id);

      // Soft-delete removed contacts
      const contactsToDelete = existingContactIds.filter(
        (contactId) => !submittedContactIds.includes(contactId),
      );
      if (contactsToDelete.length > 0) {
        await tx.clientContact.updateMany({
          where: {
            id: { in: contactsToDelete },
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      }

      // Update or create contacts
      for (const contact of submittedContacts) {
        if (contact.id !== undefined && contact.id !== null) {
          // Update existing (verify it belongs to this client)
          const existingContact = await tx.clientContact.findUnique({
            where: { id: contact.id },
          });
          if (existingContact && existingContact.clientId === id) {
            await tx.clientContact.update({
              where: { id: contact.id },
              data: {
                type: contact.type,
                value: contact.value,
              },
            });
          }
        } else {
          // Create new
          await tx.clientContact.create({
            data: {
              clientId: id,
              type: contact.type,
              value: contact.value,
            },
          });
        }
      }

      // Handle sites (full sync: update/create existing/submitted, soft-delete removed)
      const existingSites = existing.sites || [];
      const submittedSites: UpsertSiteDto[] = dto.sites || [];
      const existingSiteIds = existingSites.map((s) => s.id);
      const submittedSiteIds = submittedSites
        .filter((s) => s.id !== undefined && s.id !== null)
        .map((s) => s.id);

      // Soft-delete removed sites
      const sitesToDelete = existingSiteIds.filter(
        (siteId) => !submittedSiteIds.includes(siteId),
      );
      if (sitesToDelete.length > 0) {
        await tx.site.updateMany({
          where: {
            id: { in: sitesToDelete },
          },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
          },
        });
      }

      // Update or create sites
      for (const site of submittedSites) {
        if (site.id !== undefined && site.id !== null) {
          // Update existing (verify it belongs to this client)
          const existingSite = await tx.site.findUnique({
            where: { id: site.id },
          });
          if (existingSite && existingSite.clientId === id) {
            await tx.site.update({
              where: { id: site.id },
              data: {
                name: site.name ?? null,
                road: site.road ?? null,
                postalCode: site.postalCode ?? null,
                address: site.address,
                countryCode: site.countryCode ?? null,
                stateCode: site.stateCode ?? null,
              },
            });
          }
        } else {
          // Create new
          await tx.site.create({
            data: {
              clientId: id,
              name: site.name ?? null,
              road: site.road ?? null,
              postalCode: site.postalCode ?? null,
              address: site.address,
              countryCode: site.countryCode ?? null,
              stateCode: site.stateCode ?? null,
            },
          });
        }
      }

      // Return the fully updated client with relations
      return tx.client.findUnique({
        where: { id },
        include: {
          contacts: {
            where: { isDeleted: false }, // Exclude soft-deleted
          },
          sites: {
            where: { isDeleted: false }, // Exclude soft-deleted
          },
        },
      });
    });
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