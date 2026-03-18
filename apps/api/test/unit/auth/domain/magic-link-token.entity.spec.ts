import { MagicLinkToken } from '../../../../src/modules/auth/domain/magic-link-token.entity'

describe('MagicLinkToken', () => {
  const futureDate = () => new Date(Date.now() + 15 * 60 * 1000) // 15 min from now
  const pastDate = () => new Date(Date.now() - 1 * 60 * 1000) // 1 min ago

  describe('create()', () => {
    it('should create a token with a cryptographically random value', () => {
      const tokenA = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      const tokenB = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      expect(tokenA.value).not.toBe(tokenB.value)
    })

    it('should create a token with at least 32 characters', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      expect(token.value.length).toBeGreaterThanOrEqual(32)
    })

    it('should set usedAt to null on creation', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      expect(token.usedAt).toBeNull()
    })
  })

  describe('isValid()', () => {
    it('should return true when not expired and not used', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      expect(token.isValid()).toBe(true)
    })

    it('should return false when token is expired', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: pastDate() })
      expect(token.isValid()).toBe(false)
    })

    it('should return false when token has been used', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      token.markAsUsed()
      expect(token.isValid()).toBe(false)
    })
  })

  describe('isExpired()', () => {
    it('should return true when expiresAt is in the past', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: pastDate() })
      expect(token.isExpired()).toBe(true)
    })

    it('should return false when expiresAt is in the future', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      expect(token.isExpired()).toBe(false)
    })
  })

  describe('markAsUsed()', () => {
    it('should set usedAt to a Date when called', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      token.markAsUsed()
      expect(token.usedAt).toBeInstanceOf(Date)
    })

    it('should make isValid() return false after being called', () => {
      const token = MagicLinkToken.create({ userId: 'user-1', expiresAt: futureDate() })
      token.markAsUsed()
      expect(token.isValid()).toBe(false)
    })
  })

  describe('reconstitute()', () => {
    it('should reconstruct a token from persistence data without regenerating the value', () => {
      const existingValue = 'persisted-token-value-abc123'
      const token = MagicLinkToken.reconstitute({
        id: 'token-id-1',
        userId: 'user-1',
        value: existingValue,
        usedAt: null,
        expiresAt: futureDate(),
      })
      expect(token.value).toBe(existingValue)
    })
  })
})
