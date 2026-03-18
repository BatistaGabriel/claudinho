import { MagicLinkToken } from './magic-link-token.entity'

export interface IMagicLinkTokenRepository {
  save(token: MagicLinkToken): Promise<void>
  findByEmail(email: string): Promise<MagicLinkToken | null>
  invalidatePreviousTokensForUser(userId: string): Promise<void>
}
