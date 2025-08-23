import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  async create(dto: CreateUserDto) {
    // normalize identifier
    const identifier = dto.identifier.trim();

    // unique identifier check
    const existing = await this.prisma.user.findUnique({ where: { identifier } });
    if (existing) throw new ConflictException('Identifier already exists');

    // company check
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    if (!company) throw new BadRequestException('Company not found');

    const hashed = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        companyId: dto.companyId,
        identifier,
        displayname: dto.displayname,
        email: dto.email,
        password: hashed,
        role: dto.role,
      },
      select: {
        id: true,
        companyId: true,
        identifier: true,
        displayname: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        identifier: true,
        displayname: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        identifier: true,
        displayname: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({ where: { identifier } });
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // check identifier change uniqueness if provided
    if (dto.identifier && dto.identifier !== user.identifier) {
      const ex = await this.prisma.user.findUnique({ where: { identifier: dto.identifier } });
      if (ex) throw new ConflictException('Identifier already in use');
    }

    // if companyId changed, ensure company exists
    if (dto.companyId && dto.companyId !== user.companyId) {
      const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
      if (!company) throw new BadRequestException('Company not found');
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await this.hashPassword(dto.password);
    }
    if (dto.identifier) data.identifier = dto.identifier.trim();

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        identifier: true,
        displayname: true,
        email: true,
        role: true,
        companyId: true,
        updatedAt: true,
      },
    });
    return updated;
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }

  async restore(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
      select: { id: true, deletedAt: true },
    });
  }
}
