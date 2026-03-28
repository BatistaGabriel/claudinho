import { PrismaClient } from '@prisma/client'
import { Category } from '../domain/category.entity'
import {
  ICategoryRepository,
  PaginatedResult,
  PaginationParams,
} from '../domain/category.repository'

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAt.toISOString(), id })).toString('base64')
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
    if (!parsed.createdAt || !parsed.id) return null
    return { createdAt: new Date(parsed.createdAt), id: parsed.id }
  } catch {
    return null
  }
}

function toDomain(row: {
  id: string
  name: string
  organizationId: string
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}): Category {
  return Category.reconstitute({
    id: row.id,
    name: row.name,
    organizationId: row.organizationId,
    deletedAt: row.deletedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  })
}

export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, params: { organizationId: string }): Promise<Category | null> {
    if (!params.organizationId) throw new Error('INVALID_TENANT_CONTEXT')

    const row = await this.prisma.category.findFirst({
      where: { id, organizationId: params.organizationId, deletedAt: null },
    })

    return row ? toDomain(row) : null
  }

  async findAll(params: PaginationParams): Promise<PaginatedResult<Category>> {
    if (!params.organizationId) throw new Error('INVALID_TENANT_CONTEXT')

    const limit = params.limit ?? 20

    let cursorCondition = {}
    if (params.cursor) {
      const decoded = decodeCursor(params.cursor)
      if (!decoded) throw new Error('INVALID_CURSOR')
      cursorCondition = {
        OR: [
          { createdAt: { gt: decoded.createdAt } },
          { createdAt: decoded.createdAt, id: { gt: decoded.id } },
        ],
      }
    }

    const rows = await this.prisma.category.findMany({
      where: {
        organizationId: params.organizationId,
        deletedAt: null,
        ...cursorCondition,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    })

    const hasNextPage = rows.length > limit
    const items = hasNextPage ? rows.slice(0, limit) : rows
    const last = items[items.length - 1]
    const nextCursor = hasNextPage && last ? encodeCursor(last.createdAt, last.id) : null

    return { items: items.map(toDomain), nextCursor, hasNextPage }
  }

  async create(category: Category): Promise<void> {
    if (!category.organizationId) throw new Error('INVALID_TENANT_CONTEXT')

    await this.prisma.category.create({
      data: {
        id: category.id,
        name: category.name,
        organizationId: category.organizationId,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        deletedAt: category.deletedAt,
      },
    })
  }

  async update(category: Category): Promise<void> {
    if (!category.organizationId) throw new Error('INVALID_TENANT_CONTEXT')

    await this.prisma.category.updateMany({
      where: { id: category.id, organizationId: category.organizationId, deletedAt: null },
      data: { name: category.name, updatedAt: category.updatedAt },
    })
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    if (!organizationId) throw new Error('INVALID_TENANT_CONTEXT')

    await this.prisma.category.updateMany({
      where: { id, organizationId, deletedAt: null },
      data: { deletedAt: new Date() },
    })
  }
}
