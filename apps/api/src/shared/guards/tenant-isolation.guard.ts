import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'
import { JwtPayload } from '../interfaces/jwt-payload.interface'

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) {
      return true
    }

    const request = context.switchToHttp().getRequest<{
      user: JwtPayload
      params: Record<string, string>
    }>()

    const { user, params } = request

    if (user?.role === 'admin') {
      return true
    }

    const routeOrganizationId = params?.organizationId

    if (!routeOrganizationId) {
      return true
    }

    return user?.organizationId === routeOrganizationId
  }
}
