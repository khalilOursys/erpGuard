import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateCompanyContactDto } from './dto/create-company-contact.dto';
import { UpdateCompanyContactDto } from './dto/update-company-contact.dto';

@Injectable()
export class CompanyContactService {
  constructor(private prisma: PrismaService) {}

  async create(companyIdParam: number, dto: CreateCompanyContactDto, actorCompanyId: number) {
    // ensure tenant matches
    if (companyIdParam !== actorCompanyId) {
      throw new ForbiddenException('Cannot create contact for another company');
    }

    // create
    const contact = await this.prisma.companyContact.create({
      data: {
        companyId: companyIdParam,
        type: dto.type,
        value: dto.value,
      },
    });

    return contact;
  }

  async findAll(companyIdParam: number, actorCompanyId: number) {
    if (companyIdParam !== actorCompanyId) {
      throw new ForbiddenException('Cannot list contacts for another company');
    }

    const contacts = await this.prisma.companyContact.findMany({
      where: { companyId: companyIdParam },
      orderBy: { id: 'asc' },
    });

    return contacts;
  }

  async findOne(companyIdParam: number, id: number, actorCompanyId: number) {
    const contact = await this.prisma.companyContact.findUnique({ where: { id } });
    if (!contact) throw new NotFoundException('Contact not found');
    if (contact.companyId !== companyIdParam || companyIdParam !== actorCompanyId) {
      throw new ForbiddenException('Contact not accessible');
    }
    return contact;
  }

  async update(companyIdParam: number, id: number, dto: UpdateCompanyContactDto, actorCompanyId: number) {
    const existing = await this.prisma.companyContact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contact not found');
    if (existing.companyId !== companyIdParam || companyIdParam !== actorCompanyId) {
      throw new ForbiddenException('Contact not accessible');
    }

    const updated = await this.prisma.companyContact.update({
      where: { id },
      data: { ...(dto.type !== undefined ? { type: dto.type } : {}), ...(dto.value !== undefined ? { value: dto.value } : {}) },
    });

    return updated;
  }

  async remove(companyIdParam: number, id: number, actorCompanyId: number) {
    const existing = await this.prisma.companyContact.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Contact not found');
    if (existing.companyId !== companyIdParam || companyIdParam !== actorCompanyId) {
      throw new ForbiddenException('Contact not accessible');
    }

    // since CompanyContact doesn't have a deletedAt field in your schema we perform hard delete
    await this.prisma.companyContact.delete({ where: { id } });
    return { id, deleted: true };
  }
}
