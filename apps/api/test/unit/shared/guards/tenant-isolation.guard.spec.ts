import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { TenantIsolationGuard } from '../../../../src/shared/guards/tenant-isolation.guard'
import { IS_PUBLIC_KEY } from '../../../../src/shared/decorators/public.decorator'

function createMockContext(overrides: {
  user?: Record<string, unknown>
  params?: Record<string, unknown>
  isPublic?: boolean
}): ExecutionContext {
  const { user = {}, params = {} } = overrides
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}

describe('TenantIsolationGuard', () => {
  let guard: TenantIsolationGuard
  let reflector: jest.Mocked<Reflector>

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>
    guard = new TenantIsolationGuard(reflector)
  })

  describe('Public routes', () => {
    it('should skip validation when route is decorated with @Public()', () => {
      reflector.getAllAndOverride.mockReturnValue(true) // IS_PUBLIC_KEY is true
      const ctx = createMockContext({ isPublic: true })
      expect(guard.canActivate(ctx)).toBe(true)
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    })
  })

  describe('Admin role', () => {
    it('should allow access when role is admin regardless of organizationId', () => {
      reflector.getAllAndOverride.mockReturnValue(false)
      const ctx = createMockContext({
        user: { role: 'admin' }, // admin has no organizationId
        params: { organizationId: 'org-any-123' },
      })
      expect(guard.canActivate(ctx)).toBe(true)
    })
  })

  describe('Tenant matching', () => {
    it('should allow access when token organizationId matches route organizationId param', () => {
      reflector.getAllAndOverride.mockReturnValue(false)
      const ctx = createMockContext({
        user: { role: 'gestor', organizationId: 'org-abc' },
        params: { organizationId: 'org-abc' },
      })
      expect(guard.canActivate(ctx)).toBe(true)
    })

    it('should block access when token organizationId differs from route organizationId param', () => {
      reflector.getAllAndOverride.mockReturnValue(false)
      const ctx = createMockContext({
        user: { role: 'gestor', organizationId: 'org-abc' },
        params: { organizationId: 'org-xyz' },
      })
      expect(guard.canActivate(ctx)).toBe(false)
    })

    it('should block access when token organizationId differs from route organizationId for operador', () => {
      reflector.getAllAndOverride.mockReturnValue(false)
      const ctx = createMockContext({
        user: { role: 'operador', organizationId: 'org-1' },
        params: { organizationId: 'org-2' },
      })
      expect(guard.canActivate(ctx)).toBe(false)
    })
  })

  describe('Routes without organizationId param', () => {
    it('should allow access when route has no organizationId param (non-tenant-scoped route)', () => {
      reflector.getAllAndOverride.mockReturnValue(false)
      const ctx = createMockContext({
        user: { role: 'gestor', organizationId: 'org-abc' },
        params: {}, // no organizationId in route
      })
      expect(guard.canActivate(ctx)).toBe(true)
    })
  })
})
