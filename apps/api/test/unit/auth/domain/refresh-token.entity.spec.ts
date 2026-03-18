import { RefreshToken } from '../../../../src/modules/auth/domain/refresh-token.entity'

describe('RefreshToken', () => {
  describe('create()', () => {
    it('should create a token with a cryptographically random value', () => {
      const tokenA = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      const tokenB = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      expect(tokenA.value).not.toBe(tokenB.value)
    })

    it('should create a token with at least 32 characters', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      expect(token.value.length).toBeGreaterThanOrEqual(32)
    })

    it('should set rotatedAt to null on creation', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      expect(token.rotatedAt).toBeNull()
    })

    it('should set revokedAt to null on creation', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      expect(token.revokedAt).toBeNull()
    })
  })

  describe('TTL by role', () => {
    it('should set expiresAt to ~8 hours from now for gestor role', () => {
      const before = Date.now()
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      const after = Date.now()

      const expectedMs = 8 * 60 * 60 * 1000
      const expiresAtMs = token.expiresAt.getTime()
      // allow a 1 second window for test execution time
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + expectedMs - 1000)
      expect(expiresAtMs).toBeLessThanOrEqual(after + expectedMs + 1000)
    })

    it('should set expiresAt to ~7 days from now for operador role', () => {
      const before = Date.now()
      const token = RefreshToken.create({ userId: 'user-1', role: 'operador' })
      const after = Date.now()

      const expectedMs = 7 * 24 * 60 * 60 * 1000
      const expiresAtMs = token.expiresAt.getTime()
      expect(expiresAtMs).toBeGreaterThanOrEqual(before + expectedMs - 1000)
      expect(expiresAtMs).toBeLessThanOrEqual(after + expectedMs + 1000)
    })

    it('gestor token should expire before operador token when created at the same time', () => {
      const gestorToken = RefreshToken.create({ userId: 'u1', role: 'gestor' })
      const operadorToken = RefreshToken.create({ userId: 'u2', role: 'operador' })
      expect(gestorToken.expiresAt.getTime()).toBeLessThan(operadorToken.expiresAt.getTime())
    })
  })

  describe('isValid()', () => {
    it('should return true for a fresh token', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      expect(token.isValid()).toBe(true)
    })

    it('should return false after rotation', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      token.markAsRotated()
      expect(token.isValid()).toBe(false)
    })

    it('should return false after revocation', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      token.revoke()
      expect(token.isValid()).toBe(false)
    })

    it('should return false when expired', () => {
      const token = RefreshToken.reconstitute({
        userId: 'user-1',
        role: 'gestor',
        value: 'abc',
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
        rotatedAt: null,
        revokedAt: null,
      })
      expect(token.isValid()).toBe(false)
    })
  })

  describe('isRotated() and isPotentialCompromise()', () => {
    it('should return false for isRotated() on a fresh token', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      expect(token.isRotated()).toBe(false)
    })

    it('should return true for isRotated() after markAsRotated()', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      token.markAsRotated()
      expect(token.isRotated()).toBe(true)
    })

    it('isPotentialCompromise() should return true when token is already rotated', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      token.markAsRotated()
      expect(token.isPotentialCompromise()).toBe(true)
    })

    it('isPotentialCompromise() should return false on a fresh token', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      expect(token.isPotentialCompromise()).toBe(false)
    })
  })

  describe('revoke()', () => {
    it('should set revokedAt to a Date', () => {
      const token = RefreshToken.create({ userId: 'user-1', role: 'gestor' })
      token.revoke()
      expect(token.revokedAt).toBeInstanceOf(Date)
    })
  })

  describe('reconstitute()', () => {
    it('should reconstruct without regenerating the token value', () => {
      const token = RefreshToken.reconstitute({
        userId: 'user-1',
        role: 'gestor',
        value: 'existing-token-value-xyz',
        expiresAt: new Date(Date.now() + 3600000),
        rotatedAt: null,
        revokedAt: null,
      })
      expect(token.value).toBe('existing-token-value-xyz')
    })
  })
})
