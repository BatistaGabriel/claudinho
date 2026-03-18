import { RequestMagicLinkUseCase } from '../../../../src/modules/auth/application/use-cases/request-magic-link.use-case'
import { IMagicLinkTokenRepository } from '../../../../src/modules/auth/domain/magic-link-token.repository'
import { IEmailQueue } from '../../../../src/modules/auth/application/use-cases/request-magic-link.use-case'

function createMockTokenRepository(
  opts: { existingToken?: string } = {},
): jest.Mocked<IMagicLinkTokenRepository> {
  return {
    save: jest.fn().mockResolvedValue(undefined),
    findByEmail: jest.fn().mockResolvedValue(opts.existingToken ?? null),
    invalidatePreviousTokensForUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IMagicLinkTokenRepository>
}

function createMockBullQueue(): jest.Mocked<IEmailQueue> {
  return {
    add: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<IEmailQueue>
}

describe('RequestMagicLinkUseCase', () => {
  const tokenRepository = createMockTokenRepository()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should enqueue email job after persisting token', async () => {
    const emailQueue = createMockBullQueue()
    const useCase = new RequestMagicLinkUseCase(tokenRepository, emailQueue)

    await useCase.execute({ email: 'user@test.com', userId: 'user-1' })

    expect(emailQueue.add).toHaveBeenCalledWith('send-magic-link', {
      email: 'user@test.com',
      token: expect.any(String),
    })
  })

  it('should invalidate previous token when new magic link is requested', async () => {
    const repository = createMockTokenRepository({ existingToken: 'old-token' })
    const useCase = new RequestMagicLinkUseCase(repository, createMockBullQueue())

    await useCase.execute({ email: 'user@test.com', userId: 'user-1' })

    expect(repository.invalidatePreviousTokensForUser).toHaveBeenCalled()
  })

  it('should persist new token to repository', async () => {
    const repository = createMockTokenRepository()
    const emailQueue = createMockBullQueue()
    const useCase = new RequestMagicLinkUseCase(repository, emailQueue)

    await useCase.execute({ email: 'user@test.com', userId: 'user-1' })

    expect(repository.save).toHaveBeenCalledTimes(1)
    const savedToken = repository.save.mock.calls[0][0]
    expect(savedToken.userId).toBe('user-1')
    expect(savedToken.value).toEqual(expect.any(String))
  })
})
