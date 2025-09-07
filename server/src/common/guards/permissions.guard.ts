import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PERMISSIONS_ANY_KEY } from '../decorators/permissions-any.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredAll = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) ?? [];

    const requiredAny = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_ANY_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) ?? [];

    // if neither present, allow
    if ((requiredAll.length === 0) && (requiredAny.length === 0)) return true;

    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    const userPerms: string[] = user?.permissions ?? [];

    // check any-of semantics first (if provided)
    if (requiredAny.length > 0) {
      const hasAny = requiredAny.some((p) => userPerms.includes(p));
      if (hasAny) return true;

      const missingAny = requiredAny.filter((p) => !userPerms.includes(p));
      const msg = `Missing at least one of permissions (any-of): ${requiredAny.join(', ')}`;
      this.logger.warn(`Permission denied: user=${user?.id ?? 'anon'} path=${req.url} missingAny=[${missingAny.join(', ')}]`);
      throw new ForbiddenException({
        onmessage,
        missingPermissions: missingAny,
        requiredPermissionsAny: requiredAny,
      });
    }

    // otherwise enforce all-of semantics
    const missingAll = requiredAll.filter((p) => !userPerms.includes(p));
    if (missingAll.length === 0) {
      return true;
    }

    // log and throw
    const userId = user?.id ?? 'anonymous';
    const msg = `Permission denied: user=${userId} method=${req.method} path=${req.url} missingAll=[${missingAll.join(', ')}]`;
    this.logger.warn(msg);

    throw new ForbiddenException({
      message: `Missing permission(s): ${missingAll.join(', ')}`,
      missingPermissions: missingAll,
      requiredPermissions: requiredAll,
    });
  }
}
