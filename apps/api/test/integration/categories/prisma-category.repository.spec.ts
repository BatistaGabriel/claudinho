import { Category } from '../../../src/modules/categories/domain/category.entity'
import { PrismaCategoryRepository } from '../../../src/modules/categories/infrastructure/prisma-category.repository'
import { cleanDatabase } from '../db-cleanup'
import { prisma } from '../prisma'

const ORG_A = 'org-a-id'
const ORG_B = 'org-b-id'

async function seedOrganizations(): Promise<void> {
  await prisma.organization.createMany({
    data: [
      { id: ORG_A, name: 'Org A' },
      { id: ORG_B, name: 'Org B' },
    ],
    skipDuplicates: true,
  })
}

describe('PrismaCategoryRepository', () => {
  let repository: PrismaCategoryRepository

  beforeAll(async () => {
    repository = new PrismaCategoryRepository(prisma)
  })

  beforeEach(async () => {
    await cleanDatabase()
    await seedOrganizations()
  })

  afterAll(async () => {
    await cleanDatabase()
    await prisma.$disconnect()
  })

  describe('CRUD', () => {
    it('should persist and retrieve a category', async () => {
      const category = Category.create({ name: 'Electronics', organizationId: ORG_A })

      await repository.create(category)

      const found = await repository.findById(category.id, { organizationId: ORG_A })

      expect(found).not.toBeNull()
      expect(found!.id).toBe(category.id)
      expect(found!.name).toBe('Electronics')
      expect(found!.organizationId).toBe(ORG_A)
      expect(found!.deletedAt).toBeNull()
    })

    it('should list all categories with cursor-based pagination', async () => {
      await repository.create(Category.create({ name: 'Cat A', organizationId: ORG_A }))
      await repository.create(Category.create({ name: 'Cat B', organizationId: ORG_A }))
      await repository.create(Category.create({ name: 'Cat C', organizationId: ORG_A }))

      const page1 = await repository.findAll({ organizationId: ORG_A, limit: 2 })

      expect(page1.items).toHaveLength(2)
      expect(page1.hasNextPage).toBe(true)
      expect(page1.nextCursor).not.toBeNull()

      const page2 = await repository.findAll({
        organizationId: ORG_A,
        limit: 2,
        cursor: page1.nextCursor!,
      })

      expect(page2.items).toHaveLength(1)
      expect(page2.hasNextPage).toBe(false)
    })

    it('should update a category name', async () => {
      const category = Category.create({ name: 'Old Name', organizationId: ORG_A })
      await repository.create(category)

      category.update({ name: 'New Name' })
      await repository.update(category)

      const found = await repository.findById(category.id, { organizationId: ORG_A })
      expect(found!.name).toBe('New Name')
    })
  })

  describe('Soft Delete', () => {
    it('should never return soft-deleted categories in findAll', async () => {
      const category = Category.create({ name: 'To Delete', organizationId: ORG_A })
      await repository.create(category)

      await repository.softDelete(category.id, ORG_A)

      const result = await repository.findAll({ organizationId: ORG_A })
      expect(result.items).toHaveLength(0)
    })

    it('should not return soft-deleted category in findById', async () => {
      const category = Category.create({ name: 'To Delete', organizationId: ORG_A })
      await repository.create(category)

      await repository.softDelete(category.id, ORG_A)

      const found = await repository.findById(category.id, { organizationId: ORG_A })
      expect(found).toBeNull()
    })
  })

  describe('Tenant Isolation', () => {
    it('should not return categories from another organization', async () => {
      await repository.create(Category.create({ name: 'Org B Cat', organizationId: ORG_B }))

      const result = await repository.findAll({ organizationId: ORG_A })
      expect(result.items).toHaveLength(0)
    })

    it('should not return a category from another organization in findById', async () => {
      const categoryB = Category.create({ name: 'Org B Cat', organizationId: ORG_B })
      await repository.create(categoryB)

      const found = await repository.findById(categoryB.id, { organizationId: ORG_A })
      expect(found).toBeNull()
    })

    it('should not soft-delete a category from another organization', async () => {
      const categoryB = Category.create({ name: 'Org B Cat', organizationId: ORG_B })
      await repository.create(categoryB)

      await repository.softDelete(categoryB.id, ORG_A)

      // Category should still exist for Org B
      const found = await repository.findById(categoryB.id, { organizationId: ORG_B })
      expect(found).not.toBeNull()
    })
  })
})
