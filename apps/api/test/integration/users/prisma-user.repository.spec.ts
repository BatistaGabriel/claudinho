import { User } from '../../../src/modules/users/domain/user.entity'
import { PrismaUserRepository } from '../../../src/modules/users/infrastructure/prisma-user.repository'
import { cleanDatabase } from '../db-cleanup'
import { prisma } from '../prisma'

const ORG_ID = 'org-users-id'

async function seedOrganization(): Promise<void> {
  await prisma.organization.createMany({
    data: [{ id: ORG_ID, name: 'Org Users' }],
    skipDuplicates: true,
  })
}

describe('PrismaUserRepository', () => {
  let repository: PrismaUserRepository

  beforeAll(() => {
    repository = new PrismaUserRepository(prisma)
  })

  beforeEach(async () => {
    await cleanDatabase()
    await seedOrganization()
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('create + findById', () => {
    it('should persist and retrieve a gestor by id', async () => {
      const user = User.createManager({ email: 'gestor@example.com', organizationId: ORG_ID })

      await repository.create(user)

      const found = await repository.findById(user.id)

      expect(found).not.toBeNull()
      expect(found!.id).toBe(user.id)
      expect(found!.email).toBe('gestor@example.com')
      expect(found!.role).toBe('gestor')
      expect(found!.organizationId).toBe(ORG_ID)
      expect(found!.deletedAt).toBeNull()
    })

    it('should persist and retrieve an operador by id', async () => {
      const user = User.createOperator({ email: 'operador@example.com', organizationId: ORG_ID })

      await repository.create(user)

      const found = await repository.findById(user.id)

      expect(found).not.toBeNull()
      expect(found!.role).toBe('operador')
    })

    it('should return null when id does not exist', async () => {
      const found = await repository.findById('nonexistent-id')
      expect(found).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should return user by email', async () => {
      const user = User.createManager({ email: 'find@example.com', organizationId: ORG_ID })
      await repository.create(user)

      const found = await repository.findByEmail('find@example.com')

      expect(found).not.toBeNull()
      expect(found!.id).toBe(user.id)
      expect(found!.email).toBe('find@example.com')
    })

    it('should return null when email does not exist', async () => {
      const found = await repository.findByEmail('nobody@example.com')
      expect(found).toBeNull()
    })

    it('should not return a soft-deleted user by email', async () => {
      const user = User.createManager({ email: 'deleted@example.com', organizationId: ORG_ID })
      await repository.create(user)
      await prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date() },
      })

      const found = await repository.findByEmail('deleted@example.com')

      expect(found).toBeNull()
    })
  })

  describe('existsByEmail', () => {
    it('should return true when user with email exists', async () => {
      const user = User.createManager({ email: 'exists@example.com', organizationId: ORG_ID })
      await repository.create(user)

      const result = await repository.existsByEmail('exists@example.com')

      expect(result).toBe(true)
    })

    it('should return false when user with email does not exist', async () => {
      const result = await repository.existsByEmail('nobody@example.com')
      expect(result).toBe(false)
    })

    it('should return false for a soft-deleted user email', async () => {
      const user = User.createManager({ email: 'softdel@example.com', organizationId: ORG_ID })
      await repository.create(user)
      await prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date() },
      })

      const result = await repository.existsByEmail('softdel@example.com')

      expect(result).toBe(false)
    })
  })
})
