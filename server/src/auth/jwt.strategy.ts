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
    // payload must contain sub (userId) and tokenVersion
    const userId = payload.sub;
    if (!userId) throw new UnauthorizedException('Invalid token payload');

    // fetch current tokenVersion for user and compare
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, role: true, identifier: true, tokenVersion: true },
    });

    if (!user) throw new UnauthorizedException('User not found');

    const tokenVersionInToken = payload.tokenVersion ?? 0;
    if (tokenVersionInToken !== user.tokenVersion) {
      // token is stale
      throw new UnauthorizedException('Token revoked - please log in again');
    }

    // Return the user payload as req.user
    return {
      id: user.id,
      companyId: user.companyId,
      role: user.role,
      identifier: user.identifier,
      permissions: payload.permissions ?? [],
    };
  }
}
