import { createHash } from 'crypto'
import { RefreshToken } from '../../../src/modules/auth/domain/refresh-token.entity'
import { PrismaRefreshTokenRepository } from '../../../src/modules/auth/infrastructure/prisma-refresh-token.repository'
import { cleanDatabase } from '../db-cleanup'
import { prisma } from '../prisma'

async function seedUser(overrides: { id?: string; email?: string } = {}): Promise<{ id: string }> {
  const id = overrides.id ?? 'user-id-1'
  const email = overrides.email ?? 'user@example.com'
  await prisma.user.create({ data: { id, email, role: 'gestor' } })
  return { id }
}

describe('PrismaRefreshTokenRepository', () => {
  let repository: PrismaRefreshTokenRepository

  beforeAll(() => {
    repository = new PrismaRefreshTokenRepository(prisma)
  })

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('save', () => {
    it('should persist a refresh token hashing the value', async () => {
      const { id: userId } = await seedUser()
      const token = RefreshToken.create({ userId, role: 'gestor' })

      await repository.save(token)

      const expectedHash = createHash('sha256').update(token.value).digest('hex')
      const row = await prisma.refreshToken.findUnique({ where: { tokenHash: expectedHash } })

      expect(row).not.toBeNull()
      expect(row!.userId).toBe(userId)
      expect(row!.revokedAt).toBeNull()
    })

    it('should never persist the raw token value', async () => {
      const { id: userId } = await seedUser()
      const token = RefreshToken.create({ userId, role: 'gestor' })

      await repository.save(token)

      const rows = await prisma.refreshToken.findMany()
      expect(rows.every((r) => r.tokenHash !== token.value)).toBe(true)
    })
  })

  describe('findByValue', () => {
    it('should return a valid token by raw value', async () => {
      const { id: userId } = await seedUser()
      const token = RefreshToken.create({ userId, role: 'gestor' })
      await repository.save(token)

      const found = await repository.findByValue(token.value)

      expect(found).not.toBeNull()
      expect(found!.userId).toBe(userId)
      expect(found!.role).toBe('gestor')
      expect(found!.isValid()).toBe(true)
    })

    it('should return null when token does not exist', async () => {
      const found = await repository.findByValue('nonexistent-token-value')
      expect(found).toBeNull()
    })

    it('should return a revoked token so use case can detect replay', async () => {
      const { id: userId } = await seedUser()
      const token = RefreshToken.create({ userId, role: 'gestor' })
      await repository.save(token)
      const hash = createHash('sha256').update(token.value).digest('hex')
      await prisma.refreshToken.update({
        where: { tokenHash: hash },
        data: { revokedAt: new Date() },
      })

      const found = await repository.findByValue(token.value)

      expect(found).not.toBeNull()
      expect(found!.isValid()).toBe(false)
    })

    it('should reconstitute with correct operador role', async () => {
      const { id: userId } = await seedUser()
      const token = RefreshToken.create({ userId, role: 'operador' })
      await repository.save(token)

      const found = await repository.findByValue(token.value)

      expect(found!.role).toBe('operador')
    })
  })

  describe('revokeAllForUser', () => {
    it('should revoke all active tokens for the user', async () => {
      const { id: userId } = await seedUser()
      const t1 = RefreshToken.create({ userId, role: 'gestor' })
      const t2 = RefreshToken.create({ userId, role: 'gestor' })
      await repository.save(t1)
      await repository.save(t2)

      await repository.revokeAllForUser(userId)

      const rows = await prisma.refreshToken.findMany({ where: { userId } })
      expect(rows.every((r) => r.revokedAt !== null)).toBe(true)
    })

    it('should not affect tokens from other users', async () => {
      const { id: userIdA } = await seedUser({ id: 'user-a', email: 'a@example.com' })
      const { id: userIdB } = await seedUser({ id: 'user-b', email: 'b@example.com' })
      const tokenA = RefreshToken.create({ userId: userIdA, role: 'gestor' })
      const tokenB = RefreshToken.create({ userId: userIdB, role: 'gestor' })
      await repository.save(tokenA)
      await repository.save(tokenB)

      await repository.revokeAllForUser(userIdA)

      const hashB = createHash('sha256').update(tokenB.value).digest('hex')
      const rowB = await prisma.refreshToken.findUnique({ where: { tokenHash: hashB } })
      expect(rowB!.revokedAt).toBeNull()
    })

    it('should be idempotent when called twice', async () => {
      const { id: userId } = await seedUser()
      const token = RefreshToken.create({ userId, role: 'gestor' })
      await repository.save(token)
      await repository.revokeAllForUser(userId)

      await expect(repository.revokeAllForUser(userId)).resolves.not.toThrow()
    })
  })
})
