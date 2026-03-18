import { MagicLinkToken } from '../../domain/magic-link-token.entity'
import { IMagicLinkTokenRepository } from '../../domain/magic-link-token.repository'

export interface IEmailQueue {
  add(jobName: string, data: Record<string, unknown>): Promise<void>
}

interface RequestMagicLinkInput {
  email: string
  userId: string
}

export class RequestMagicLinkUseCase {
  constructor(
    private readonly tokenRepository: IMagicLinkTokenRepository,
    private readonly emailQueue: IEmailQueue,
  ) {}

  async execute(input: RequestMagicLinkInput): Promise<void> {
    const { email, userId } = input

    await this.tokenRepository.invalidatePreviousTokensForUser(userId)

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    const token = MagicLinkToken.create({ userId, expiresAt })

    await this.tokenRepository.save(token)

    await this.emailQueue.add('send-magic-link', {
      email,
      token: token.value,
    })
  }
}
