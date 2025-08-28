import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  // validate user by identifier + password
  async validateUser(identifier: string, pass: string) {
    if (!identifier || !pass) {
      // invalid request shape
      throw new BadRequestException('identifier and password are required');
    }

    const user = await this.prisma.user.findUnique({ where: { identifier } });
    if (!user || user.deletedAt) return null;
    const match = await bcrypt.compare(pass, user.password);
    if (!match) return null;
    return user;
  }

  // build effective permissions: rolePermissions + userPermissions (not revoked)
  async getEffectivePermissions(userId: number, roleName: string) {
    const userPerms = await this.prisma.userPermission.findMany({
      where: { userId, revokedAt: null },
      include: { permission: true },
    });
    const rolePerms = await this.prisma.rolePermission.findMany({
      where: { roleName },
      include: { permission: true },
    });
    const set = new Set<string>();
    userPerms.forEach((p) => set.add(p.permission.name));
    rolePerms.forEach((p) => set.add(p.permission.name));
    return Array.from(set);
  }

  async login(identifier: string, password: string) {
    const user = await this.validateUser(identifier, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const perms = await this.getEffectivePermissions(user.id, user.role);

    const payload = {
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      identifier: user.identifier,
      permissions: perms,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        identifier: user.identifier,
        role: user.role,
        companyId: user.companyId,
        permissions: perms,
      },
    };
  }
}
