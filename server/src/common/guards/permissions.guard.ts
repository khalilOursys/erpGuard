import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new ForbiddenException('Unauthenticated');

    // fast path: JWT included permissions
    if (Array.isArray(user.permissions)) {
      const has = required.every((p) => user.permissions.includes(p));
      if (!has) throw new ForbiddenException('Missing permissions');
      return true;
    }

    // otherwise deny: we will fallback to DB-check style guard when needed
    throw new ForbiddenException('Missing permissions information');
  }
}
