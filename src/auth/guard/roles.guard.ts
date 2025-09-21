import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorator/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      Array<'admin' | 'doctor' | 'reception'>
    >(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // JwtStrategy.validate() qaytargan payload
    return requiredRoles.includes(user.role);
  }
}
