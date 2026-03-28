import { createHash } from 'crypto'
import { MagicLinkToken } from '../../../src/modules/auth/domain/magic-link-token.entity'
import { PrismaMagicLinkTokenRepository } from '../../../src/modules/auth/infrastructure/prisma-magic-link-token.repository'
import { cleanDatabase } from '../db-cleanup'
import { prisma } from '../prisma'

const USER_EMAIL = 'user@example.com'
const OTHER_USER_EMAIL = 'other@example.com'

async function seedUser(overrides: { id?: string; email?: string } = {}): Promise<{
  id: string
  email: string
}> {
  const id = overrides.id ?? 'user-id-1'
  const email = overrides.email ?? USER_EMAIL
  await prisma.user.create({
    data: { id, email, role: 'gestor' },
  })
  return { id, email }
}

describe('PrismaMagicLinkTokenRepository', () => {
  let repository: PrismaMagicLinkTokenRepository

  beforeAll(() => {
    repository = new PrismaMagicLinkTokenRepository(prisma)
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('save', () => {
    it('should persist a magic link token hashing the value', async () => {
      const { id: userId } = await seedUser()
      const token = MagicLinkToken.create({ userId, expiresAt: new Date(Date.now() + 60_000) })

      await repository.save(token)

      const expectedHash = createHash('sha256').update(token.value).digest('hex')
      const row = await prisma.magicLinkToken.findUnique({ where: { tokenHash: expectedHash } })

      expect(row).not.toBeNull()
      expect(row!.userId).toBe(userId)
      expect(row!.usedAt).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should return a valid token for the given email', async () => {
      const { id: userId } = await seedUser()
      const token = MagicLinkToken.create({ userId, expiresAt: new Date(Date.now() + 60_000) })
      await repository.save(token)

      const found = await repository.findByEmail(USER_EMAIL)

      expect(found).not.toBeNull()
      expect(found!.userId).toBe(userId)
      expect(found!.isValid()).toBe(true)
    })

    it('should return null when token has been used', async () => {
      const { id: userId } = await seedUser()
      const expiresAt = new Date(Date.now() + 60_000)
      const tokenHash = createHash('sha256').update('raw-value-1').digest('hex')
      await prisma.magicLinkToken.create({
        data: { userId, tokenHash, expiresAt, usedAt: new Date() },
      })

      const found = await repository.findByEmail(USER_EMAIL)

      expect(found).toBeNull()
    })

    it('should return null when token has expired', async () => {
      const { id: userId } = await seedUser()
      const expiresAt = new Date(Date.now() - 1_000)
      const tokenHash = createHash('sha256').update('raw-value-2').digest('hex')
      await prisma.magicLinkToken.create({ data: { userId, tokenHash, expiresAt } })

      const found = await repository.findByEmail(USER_EMAIL)

      expect(found).toBeNull()
    })

    it('should return null when no token exists for the email', async () => {
      await seedUser()

      const found = await repository.findByEmail(USER_EMAIL)

      expect(found).toBeNull()
    })

    it('should return the most recent valid token when multiple exist', async () => {
      const { id: userId } = await seedUser()
      const olderHash = createHash('sha256').update('old-value').digest('hex')
      await prisma.magicLinkToken.create({
        data: {
          userId,
          tokenHash: olderHash,
          expiresAt: new Date(Date.now() + 60_000),
          createdAt: new Date(Date.now() - 10_000),
        },
      })
      const newerToken = MagicLinkToken.create({ userId, expiresAt: new Date(Date.now() + 60_000) })
      await repository.save(newerToken)

      const found = await repository.findByEmail(USER_EMAIL)

      const newerHash = createHash('sha256').update(newerToken.value).digest('hex')
      const foundRow = await prisma.magicLinkToken.findUnique({ where: { tokenHash: newerHash } })
      expect(found!.id).toBe(foundRow!.id)
    })
  })

  describe('invalidatePreviousTokensForUser', () => {
    it('should mark all unused tokens for the user as used', async () => {
      const { id: userId } = await seedUser()
      const hash1 = createHash('sha256').update('val-1').digest('hex')
      const hash2 = createHash('sha256').update('val-2').digest('hex')
      await prisma.magicLinkToken.createMany({
        data: [
          { userId, tokenHash: hash1, expiresAt: new Date(Date.now() + 60_000) },
          { userId, tokenHash: hash2, expiresAt: new Date(Date.now() + 60_000) },
        ],
      })

      await repository.invalidatePreviousTokensForUser(userId)

      const rows = await prisma.magicLinkToken.findMany({ where: { userId } })
      expect(rows.every((r) => r.usedAt !== null)).toBe(true)
    })

    it('should not affect tokens from other users', async () => {
      const { id: userIdA } = await seedUser({ id: 'user-a', email: USER_EMAIL })
      const { id: userIdB } = await seedUser({ id: 'user-b', email: OTHER_USER_EMAIL })
      const hashA = createHash('sha256').update('val-a').digest('hex')
      const hashB = createHash('sha256').update('val-b').digest('hex')
      await prisma.magicLinkToken.create({
        data: { userId: userIdA, tokenHash: hashA, expiresAt: new Date(Date.now() + 60_000) },
      })
      await prisma.magicLinkToken.create({
        data: { userId: userIdB, tokenHash: hashB, expiresAt: new Date(Date.now() + 60_000) },
      })

      await repository.invalidatePreviousTokensForUser(userIdA)

      const rowB = await prisma.magicLinkToken.findUnique({ where: { tokenHash: hashB } })
      expect(rowB!.usedAt).toBeNull()
    })

    it('should not re-mark already used tokens', async () => {
      const { id: userId } = await seedUser()
      const alreadyUsedAt = new Date('2024-01-01')
      const hash = createHash('sha256').update('used-val').digest('hex')
      await prisma.magicLinkToken.create({
        data: { userId, tokenHash: hash, expiresAt: new Date(Date.now() + 60_000), usedAt: alreadyUsedAt },
      })

      await repository.invalidatePreviousTokensForUser(userId)

      const row = await prisma.magicLinkToken.findUnique({ where: { tokenHash: hash } })
      expect(row!.usedAt).toEqual(alreadyUsedAt)
    })
  })
})
