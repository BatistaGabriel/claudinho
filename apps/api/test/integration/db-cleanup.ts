import { prisma } from './prisma'

// Delete in reverse FK dependency order
export async function cleanDatabase(): Promise<void> {
  await prisma.stockMovement.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.magicLinkToken.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
}
