import { createHash } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { MagicLinkToken } from '../domain/magic-link-token.entity'
import { IMagicLinkTokenRepository } from '../domain/magic-link-token.repository'

function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export class PrismaMagicLinkTokenRepository implements IMagicLinkTokenRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async save(token: MagicLinkToken): Promise<void> {
    await this.prisma.magicLinkToken.create({
      data: {
        id: token.id,
        userId: token.userId,
        tokenHash: hashToken(token.value),
        usedAt: token.usedAt,
        expiresAt: token.expiresAt,
      },
    })
  }

  async findByEmail(email: string): Promise<MagicLinkToken | null> {
    const row = await this.prisma.magicLinkToken.findFirst({
      where: {
        user: { email },
        usedAt: null,
        deletedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!row) return null

    return MagicLinkToken.reconstitute({
      id: row.id,
      userId: row.userId,
      value: row.tokenHash,
      usedAt: row.usedAt,
      expiresAt: row.expiresAt,
    })
  }

  async invalidatePreviousTokensForUser(userId: string): Promise<void> {
    await this.prisma.magicLinkToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    })
  }
}
