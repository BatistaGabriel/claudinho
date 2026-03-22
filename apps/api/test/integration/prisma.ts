import { PrismaClient } from '@prisma/client'

const DATABASE_URL_TEST = process.env.DATABASE_URL_TEST

if (!DATABASE_URL_TEST) {
  throw new Error('DATABASE_URL_TEST is not set. Check your .env file.')
}

export const prisma = new PrismaClient({
  datasources: { db: { url: DATABASE_URL_TEST } },
})
