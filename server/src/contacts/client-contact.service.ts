import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateClientContactDto } from './dto/create-client-contact.dto';
import { UpdateClientContactDto } from './dto/update-client-contact.dto';

@Injectable()
export class ClientContactService {
  constructor(private prisma: PrismaService) {}

  async create(clientIdParam: number, dto: CreateClientContactDto, actorCompanyId: number) {
    // Validate client belongs to actor company
    const client = await this.prisma.client.findUnique({ where: { id: clientIdParam } });
    if (!client) throw new NotFoundException('Client not found');
    if (client.companyId !== actorCompanyId) throw new ForbiddenException('Cannot add contact to a client of another company');

    const contact = await this.prisma.clientContact.create({
      data: {
        clientId: clientIdParam,
        type: dto.type,
        value: dto.value,
      },
    });

    return contact;
  }

  async findAll(clientIdParam: number, actorCompanyId: number) {
    const client = await this.prisma.client.findUnique({ where: { id: clientIdParam } });
    if (!client) throw new NotFoundException('Client not found');
    if (client.companyId !== actorCompanyId) throw new ForbiddenException('Cannot list contacts for a client of another company');

    const contacts = await this.prisma.clientContact.findMany({
      where: { clientId: clientIdParam },
      orderBy: { id: 'asc' },
    });

    return contacts;
  }

  async findOne(clientIdParam: number, id: number, actorCompanyId: number) {
    const contact = await this.prisma.clientContact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');

    const client = await this.prisma.client.findUnique({ where: { id: contact.clientId } });
    if (!client) throw new NotFoundException('Client not found'); // defensive
    if (client.companyId !== actorCompanyId || contact.clientId !== clientIdParam) {
      throw new ForbiddenException('Contact not accessible');
    }
    return contact;
  }

  async update(clientIdParam: number, id: number, dto: UpdateClientContactDto, actorCompanyId: number) {
    const contact = await this.prisma.clientContact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');

    const client = await this.prisma.client.findUnique({ where: { id: contact.clientId } });
    if (!client) throw new NotFoundException('Client not found');
    if (client.companyId !== actorCompanyId || contact.clientId !== clientIdParam) {
      throw new ForbiddenException('Contact not accessible');
    }

    const updated = await this.prisma.clientContact.update({
      where: { id },
      data: { ...(dto.type !== undefined ? { type: dto.type } : {}), ...(dto.value !== undefined ? { value: dto.value } : {}) },
    });

    return updated;
  }

  async remove(clientIdParam: number, id: number, actorCompanyId: number) {
    const contact = await this.prisma.clientContact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');

    const client = await this.prisma.client.findUnique({ where: { id: contact.clientId } });
    if (!client) throw new NotFoundException('Client not found');
    if (client.companyId !== actorCompanyId || contact.clientId !== clientIdParam) {
      throw new ForbiddenException('Contact not accessible');
    }

    await this.prisma.clientContact.delete({ where: { id } });
    return { id, deleted: true };
  }
}
