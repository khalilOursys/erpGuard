import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCompanyDto) {
    // check unique name
    const existing = await this.prisma.company.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Company name already in use');

    const company = await this.prisma.company.create({
      data: {
        name: dto.name,
        address: dto.address ?? null,
        baseCurrency: dto.baseCurrency ?? undefined, // prisma will use default if undefined
      },
      select: {
        id: true,
        name: true,
        address: true,
        baseCurrency: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return company;
  }

  /**
   * Paginated listing with search, sorting and deletedOnly flag
   */
  async findAll(options: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    deletedOnly?: boolean;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize =
      options.pageSize && options.pageSize > 0
        ? Math.min(options.pageSize, 200)
        : 25;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: any = {};

    if (options.deletedOnly) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    if (options.search && options.search.trim().length > 0) {
      const q = options.search.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
    }

    const allowedSortFields = ['name', 'createdAt', 'updatedAt'];
    const rawSortBy = options.sortBy ?? 'name';
    const sortBy = allowedSortFields.includes(rawSortBy) ? rawSortBy : 'name';
    const sortOrder = options.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy: Record<string, any> = {};
    orderBy[sortBy] = sortOrder;

    const [total, data] = await Promise.all([
      this.prisma.company.count({ where }),
      this.prisma.company.findMany({
        where,
        skip,
        take,
        orderBy: orderBy as any,
        select: {
          id: true,
          name: true,
          address: true,
          baseCurrency: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize: take,
      data,
    };
  }

  async findOne(id: number) {
    const company = await this.prisma.company.findUnique({
      where: { id },
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: number, dto: any, file?: Express.Multer.File) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    // Check name uniqueness if changing
    if (dto.name && dto.name !== company.name) {
      const exists = await this.prisma.company.findUnique({
        where: { name: dto.name },
      });
      if (exists) throw new ConflictException('Company name already in use');
    }

    // Check email uniqueness if changing
    if (dto.email && dto.email !== company.email) {
      const exists = await this.prisma.company.findFirst({
        where: {
          email: dto.email,
          id: { not: id },
        },
      });
      if (exists) throw new ConflictException('Email already in use');
    }

    // Validate currency code if provided
    if (dto.baseCurrency && !/^[A-Z]{3}$/.test(dto.baseCurrency)) {
      throw new BadRequestException(
        'Base currency must be a 3-letter ISO code',
      );
    }

    // Handle file upload if provided
    let logoId = company.logoId;
    if (file) {
      const uploadedFile = await this.prisma.file.create({
        data: {
          filename: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          url: file.path, // or your file URL logic
          provider: 'local', // or your storage provider
        },
      });
      logoId = uploadedFile.id;
    }

    const data: any = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.address !== undefined && { address: dto.address }),
      ...(dto.baseCurrency !== undefined && { baseCurrency: dto.baseCurrency }),
      ...(dto.rib !== undefined && { rib: dto.rib }),
      ...(dto.matriculeFiscale !== undefined && {
        matriculeFiscale: dto.matriculeFiscale,
      }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(logoId !== undefined && { logoId }),
    };

    const updated = await this.prisma.company.update({
      where: { id },
      data,
      include: {
        logo: true, // Include logo relation
      },
    });

    return updated;
  }

  // Soft delete (idempotent)
  async remove(id: number) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    if (company.deletedAt) {
      return { id: company.id, deletedAt: company.deletedAt };
    }

    const now = new Date();
    const updated = await this.prisma.company.update({
      where: { id },
      data: { deletedAt: now },
      select: { id: true, name: true, deletedAt: true },
    });

    return updated;
  }

  // Restore soft-deleted
  async restore(id: number) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) throw new NotFoundException('Company not found');

    if (!company.deletedAt) {
      return { id: company.id, deletedAt: company.deletedAt };
    }

    const updated = await this.prisma.company.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, name: true, deletedAt: true },
    });

    return updated;
  }
}
