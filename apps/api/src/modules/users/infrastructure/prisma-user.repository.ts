import { PrismaClient } from '@prisma/client'
import { User } from '../domain/user.entity'
import { IUserRepository } from '../domain/user.repository'

function toDomain(row: {
  id: string
  email: string
  role: string
  organizationId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}): User {
  return User.reconstitute({
    id: row.id,
    email: row.email,
    role: row.role as 'admin' | 'gestor' | 'operador',
    organizationId: row.organizationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  })
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    })

    return row ? toDomain(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    })

    return row ? toDomain(row) : null
  }

  async create(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        deletedAt: user.deletedAt,
      },
    })
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email, deletedAt: null },
    })

    return count > 0
  }
}
