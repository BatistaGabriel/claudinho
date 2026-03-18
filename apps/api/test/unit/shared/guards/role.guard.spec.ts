import { ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { RoleGuard } from '../../../../src/shared/guards/role.guard'
import { ROLES_KEY } from '../../../../src/shared/decorators/roles.decorator'

function createMockContext(user: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}

describe('RoleGuard', () => {
  let guard: RoleGuard
  let reflector: jest.Mocked<Reflector>

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>
    guard = new RoleGuard(reflector)
  })

  describe('No roles restriction', () => {
    it('should allow access when no roles are defined for the endpoint', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined)
      const ctx = createMockContext({ role: 'operador' })
      expect(guard.canActivate(ctx)).toBe(true)
    })

    it('should allow access when roles list is empty', () => {
      reflector.getAllAndOverride.mockReturnValue([])
      const ctx = createMockContext({ role: 'operador' })
      expect(guard.canActivate(ctx)).toBe(true)
    })
  })

  describe('Role matching', () => {
    it('should allow access when user role is in the allowed roles list', () => {
      reflector.getAllAndOverride.mockReturnValue(['gestor', 'admin'])
      const ctx = createMockContext({ role: 'gestor' })
      expect(guard.canActivate(ctx)).toBe(true)
    })

    it('should allow access when user role is admin and admin is in allowed list', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin'])
      const ctx = createMockContext({ role: 'admin' })
      expect(guard.canActivate(ctx)).toBe(true)
    })

    it('should block access when user role is not in the allowed roles list', () => {
      reflector.getAllAndOverride.mockReturnValue(['gestor', 'admin'])
      const ctx = createMockContext({ role: 'operador' })
      expect(guard.canActivate(ctx)).toBe(false)
    })

    it('should block operador from accessing gestor-only endpoints', () => {
      reflector.getAllAndOverride.mockReturnValue(['gestor'])
      const ctx = createMockContext({ role: 'operador' })
      expect(guard.canActivate(ctx)).toBe(false)
    })

    it('should block gestor from accessing admin-only endpoints', () => {
      reflector.getAllAndOverride.mockReturnValue(['admin'])
      const ctx = createMockContext({ role: 'gestor' })
      expect(guard.canActivate(ctx)).toBe(false)
    })
  })

  describe('Reflector key', () => {
    it('should call getAllAndOverride with ROLES_KEY', () => {
      reflector.getAllAndOverride.mockReturnValue(['gestor'])
      const ctx = createMockContext({ role: 'gestor' })
      guard.canActivate(ctx)
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ])
    })
  })
})
