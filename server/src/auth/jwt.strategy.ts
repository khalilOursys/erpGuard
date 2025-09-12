import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private cfg: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: cfg.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'changeme',
    });
  }

  async validate(payload: any) {
    console.log("JwtStrategy - Payload:", payload); // Debug payload
    const userId = payload.sub;
    if (!userId) throw new UnauthorizedException('Invalid token payload');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, role: true, identifier: true, tokenVersion: true },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const tokenVersionInToken = payload.tokenVersion ?? 0;
    console.log("JwtStrategy - Token Version:", tokenVersionInToken, "DB Version:", user.tokenVersion); // Debug version
    if (tokenVersionInToken !== user.tokenVersion) {
      throw new UnauthorizedException('Token revoked - please log in again');
    }

    // Debug the permission query
    const permissions = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    }).then((perms) => {
      console.log("JwtStrategy - Raw Permissions from DB:", perms); // Debug raw DB result
      return perms.map((p) => p.permission.name);
    });

    console.log("JwtStrategy - Resolved Permissions:", permissions); // Debug resolved permissions
    if (!permissions || permissions.length === 0) {
      console.log("JwtStrategy - Warning: No permissions found for userId:", userId); // Debug warning
    }

    return {
      id: user.id,
      companyId: user.companyId,
      role: user.role,
      identifier: user.identifier,
      permissions: permissions, // Use resolved permissions from DB
    };
  }
}