// src/users/user.service.ts
import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  private async hashPassword(password: string) {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  // Create user
  async create(createUserDto: any, actorUserId?: number) {
    const existing = await this.prisma.user.findUnique({ where: { identifier: createUserDto.identifier } });
    if (existing) throw new ConflictException('Identifier already in use');

    const company = await this.prisma.company.findUnique({ where: { id: createUserDto.companyId } });
    if (!company) throw new BadRequestException('Company not found');

    const hashed = await this.hashPassword(createUserDto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          companyId: createUserDto.companyId,
          identifier: createUserDto.identifier,
          displayname: createUserDto.displayname ?? null,
          email: createUserDto.email ?? null,
          password: hashed,
          role: createUserDto.role ?? 'COMMERCIAL',
        },
        select: {
          id: true, identifier: true, companyId: true, role: true, displayname: true, email: true, createdAt: true,
        },
      });

      if (createUserDto.permissions && createUserDto.permissions.length > 0) {
        const perms = await tx.permission.findMany({
          where: { name: { in: createUserDto.permissions } },
        });

        if (perms.length !== createUserDto.permissions.length) {
          const missing = createUserDto.permissions.filter((p: string) => !perms.some((x) => x.name === p));
          throw new BadRequestException(`Unknown permissions: ${missing.join(', ')}`);
        }

        await tx.userPermission.createMany({
          data: perms.map((p) => ({
            userId: user.id,
            permissionId: p.id,
            grantedById: actorUserId ?? null,
          })),
          skipDuplicates: true,
        });

        // defensive tokenVersion bump
        await tx.user.update({
          where: { id: user.id },
          data: { tokenVersion: { increment: 1 } },
        });
      }

      return user;
    });
  }

  /**
   * Paginated user listing with:
   * - deletedOnly: boolean (if true => only deleted users; if false => only non-deleted)
   * - search: free text on identifier/displayname/email
   * - role: UserRole filter
   * - permission: permission name (returns users who have that permission via userPermissions)
   * - sorting, pagination
   */
  async findAll(companyId: number, options: {
    page?: number;
    pageSize?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    deletedOnly?: boolean;
    role?: UserRole | string;
    permission?: string;
  }) {
    const page = options.page && options.page > 0 ? options.page : 1;
    const pageSize = options.pageSize && options.pageSize > 0 ? Math.min(options.pageSize, 200) : 25;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // Build where clause
    const where: any = { companyId };

    // deletedOnly true => only deleted; otherwise only non-deleted
    if (options.deletedOnly) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    if (options.role) {
      where.role = options.role as UserRole;
    }

    if (options.search && options.search.trim().length > 0) {
      const q = options.search.trim();
      where.OR = [
        { identifier: { contains: q, mode: 'insensitive' } },
        { displayname: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ];
    }

    // If permission filter specified, we'll use relation filter
    const permissionFilter = options.permission?.trim();

    // Build orderBy safely
    const allowedSortFields = ['displayname', 'identifier', 'email', 'createdAt', 'updatedAt', 'role'];
    const rawSortBy = (options.sortBy ?? 'displayname') as string;
    const sortBy = allowedSortFields.includes(rawSortBy) ? rawSortBy : 'displayname';
    const sortOrder = options.sortOrder === 'desc' ? 'desc' : 'asc';

    // Build orderBy object as Record<string, any> to satisfy TS
    const orderBy: Record<string, any> = {};
    orderBy[sortBy] = sortOrder;

    // total count (if permissionFilter used, counting requires relation condition)
    let total: number;
    if (permissionFilter) {
      total = await this.prisma.user.count({
        where: {
          ...where,
          userPermissions: {
            some: {
              permission: { name: permissionFilter },
            },
          },
        },
      });
    } else {
      total = await this.prisma.user.count({ where });
    }

    // Pull data
    const users = await this.prisma.user.findMany({
      where: permissionFilter
        ? {
            ...where,
            userPermissions: {
              some: {
                permission: { name: permissionFilter },
              },
            },
          }
        : where,
      skip,
      take,
      orderBy: orderBy as any,
      select: {
        id: true,
        identifier: true,
        displayname: true,
        email: true,
        role: true,
        companyId: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        userPermissions: {
          select: {
            permission: {
              select: { name: true },
            },
          },
        },
      },
    });

    const mapped = users.map((u: any) => ({
      id: u.id,
      identifier: u.identifier,
      displayname: u.displayname,
      email: u.email,
      role: u.role,
      companyId: u.companyId,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      deletedAt: u.deletedAt,
      permissions: (u.userPermissions || []).map((up: any) => up.permission.name),
    }));

    return {
      total,
      page,
      pageSize: take,
      data: mapped,
    };
  }

  // findOne returns safe user
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
        deletedAt: true,
        userPermissions: {
          select: {
            permission: { select: { name: true } },
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      identifier: user.identifier,
      displayname: user.displayname,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
      permissions: (user.userPermissions || []).map((up: any) => up.permission.name),
    };
  }

  async update(id: number, dto: any, actorUserId?: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    if (dto.identifier && dto.identifier !== user.identifier) {
      const exists = await this.prisma.user.findUnique({ where: { identifier: dto.identifier } });
      if (exists) throw new ConflictException('Identifier already in use');
    }

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await this.hashPassword(dto.password);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, identifier: true, displayname: true, email: true, role: true, updatedAt: true },
    });

    return updated;
  }

  // Soft delete (idempotent). Also increments tokenVersion to invalidate tokens.
  async remove(id: number, actorUserId?: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (user.deletedAt) {
      return {
        id: user.id,
        identifier: user.identifier,
        deletedAt: user.deletedAt,
      };
    }

    const now = new Date();
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: now,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, identifier: true, deletedAt: true },
    });

    return updated;
  }

  // Restore soft-deleted user. increments tokenVersion to force re-login.
  async restore(id: number, actorUserId?: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.deletedAt) {
      return {
        id: user.id,
        identifier: user.identifier,
        deletedAt: user.deletedAt,
      };
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: null,
        tokenVersion: { increment: 1 },
      },
      select: { id: true, identifier: true, deletedAt: true },
    });

    return updated;
  }

  // Grant permissions and bump tokenVersion
  async grantPermissions(userId: number, permissionNames: string[], grantedById?: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const perms = await this.prisma.permission.findMany({
      where: { name: { in: permissionNames } },
    });

    if (perms.length !== permissionNames.length) {
      const missing = permissionNames.filter((p) => !perms.some((x) => x.name === p));
      throw new BadRequestException(`Unknown permissions: ${missing.join(', ')}`);
    }

    const createData = perms.map((p) => ({
      userId,
      permissionId: p.id,
      grantedById: grantedById ?? null,
    }));

    await this.prisma.userPermission.createMany({
      data: createData,
      skipDuplicates: true,
    });

    // increment tokenVersion so existing tokens are invalidated
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    const updated = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    return updated.map((r) => r.permission.name);
  }

  async revokePermission(userId: number, permissionName: string) {
    const perm = await this.prisma.permission.findUnique({ where: { name: permissionName } });
    if (!perm) throw new BadRequestException('Permission not found');

    await this.prisma.userPermission.deleteMany({
      where: { userId, permissionId: perm.id },
    });

    // increment tokenVersion so existing tokens are invalidated
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });

    const updated = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    return updated.map((r) => r.permission.name);
  }

  async getEffectivePermissions(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const userPerms = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    const roleMap = await this.prisma.rolePermission.findMany({
      where: { roleName: user.role },
      include: { permission: true },
    });

    const set = new Set<string>();
    userPerms.forEach((p) => set.add(p.permission.name));
    roleMap.forEach((r) => set.add(r.permission.name));
    return Array.from(set);
  }
}
