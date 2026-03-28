import { RefreshToken } from './refresh-token.entity'

export interface IRefreshTokenRepository {
  save(token: RefreshToken): Promise<void>
  findByValue(value: string): Promise<RefreshToken | null>
  revokeAllForUser(userId: string): Promise<void>
}
