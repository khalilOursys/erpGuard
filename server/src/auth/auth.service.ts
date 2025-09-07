import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from 'src/prisma.service';
import { UserService } from 'src/users/user.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {}

  async validateUser(identifier: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { identifier },
    });
    if (!user) return null;
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) return null;

    const { password, ...safe } = user as any;
    return safe;
  }

  async login(user: any) {
    // read latest tokenVersion from DB (so we include the current version)
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { tokenVersion: true },
    });
    const tokenVersion = dbUser?.tokenVersion ?? 0;

    const effectivePermissions = await this.userService.getEffectivePermissions(user.id);

    const payload = {
      sub: user.id,
      companyId: user.companyId,
      role: user.role,
      identifier: user.identifier,
      permissions: effectivePermissions,
      tokenVersion,
    };

    const token = this.jwtService.sign(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        identifier: user.identifier,
        role: user.role,
        companyId: user.companyId,
        permissions: effectivePermissions,
      },
    };
  }

  async validateAndLogin(identifier: string, password: string) {
    const user = await this.validateUser(identifier, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.login(user);
  }
}
