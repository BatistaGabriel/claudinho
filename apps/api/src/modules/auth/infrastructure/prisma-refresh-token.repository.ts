import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { RefreshToken } from '../domain/refresh-token.entity'
import { IRefreshTokenRepository } from '../domain/refresh-token.repository'

type Role = 'admin' | 'gestor' | 'operador'

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(token: RefreshToken): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId: token.userId,
        tokenHash: hashToken(token.value),
        expiresAt: token.expiresAt,
        revokedAt: token.revokedAt,
      },
    })
  }

  async findByValue(value: string): Promise<RefreshToken | null> {
    const tokenHash = hashToken(value)

    const row = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { role: true } } },
    })

    if (!row) return null

    return RefreshToken.reconstitute({
      userId: row.userId,
      role: row.user.role as Role,
      value,
      expiresAt: row.expiresAt,
      rotatedAt: null,
      revokedAt: row.revokedAt,
    })
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    })
  }
}
