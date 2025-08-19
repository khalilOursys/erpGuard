// src/companies/companies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async create(createCompanyDto: CreateCompanyDto) {
    const { contacts, ...companyData } = createCompanyDto;

    return this.prisma.company.create({
      data: {
        ...companyData,
        contacts: contacts
          ? {
              create: contacts.map((contact) => ({
                type: contact.type,
                value: contact.value,
              })),
            }
          : undefined,
      },
      include: {
        contacts: true,
      },
    });
  }

  async findAll() {
    return this.prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        contacts: true,
        _count: {
          select: {
            users: true,
            clients: true,
            guards: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id, deletedAt: null },
      include: {
        contacts: true,
        users: true,
        clients: true,
        guards: true,
      },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return company;
  }

  async update(id: number, updateCompanyDto: UpdateCompanyDto) {
    const { contacts, ...companyData } = updateCompanyDto;

    // Check if company exists and is not deleted
    await this.findOne(id);

    return this.prisma.company.update({
      where: { id },
      data: {
        ...companyData,
        contacts: contacts
          ? {
              deleteMany: {}, // Remove existing contacts
              create: contacts.map((contact) => ({
                type: contact.type,
                value: contact.value,
              })),
            }
          : undefined,
      },
      include: {
        contacts: true,
      },
    });
  }

  async remove(id: number) {
    // Soft delete implementation
    await this.findOne(id); // Check if company exists

    return this.prisma.company.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        // Optionally cascade soft delete to related entities
        users: {
          updateMany: {
            where: { companyId: id },
            data: { deletedAt: new Date() },
          },
        },
      },
    });
  }

  async restore(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        deletedAt: null,
        users: {
          updateMany: {
            where: { companyId: id },
            data: { deletedAt: null },
          },
        },
      },
    });
  }
}
