import { CreateOperatorUseCase } from '../../../../src/modules/users/application/use-cases/create-operator.use-case'
import { IUserRepository } from '../../../../src/modules/users/domain/user.repository'

function createMockRepository(emailExists = false): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    existsByEmail: jest.fn().mockResolvedValue(emailExists),
    findById: jest.fn(),
    findByEmail: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>
}

describe('CreateOperatorUseCase', () => {
  it('should create and persist an operator with role operador', async () => {
    const repository = createMockRepository(false)
    const useCase = new CreateOperatorUseCase(repository)

    await useCase.execute({
      email: 'operador@alpha.dev',
      organizationId: 'org-1',
    })

    expect(repository.create).toHaveBeenCalledTimes(1)
    const createdUser = repository.create.mock.calls[0][0]
    expect(createdUser.role).toBe('operador')
    expect(createdUser.organizationId).toBe('org-1')
  })

  it('should create operator within the caller organization only', async () => {
    const repository = createMockRepository(false)
    const useCase = new CreateOperatorUseCase(repository)

    await useCase.execute({ email: 'op@test.com', organizationId: 'org-ABC' })

    const createdUser = repository.create.mock.calls[0][0]
    expect(createdUser.organizationId).toBe('org-ABC')
  })

  it('should throw EMAIL_ALREADY_IN_USE when email is taken', async () => {
    const repository = createMockRepository(true)
    const useCase = new CreateOperatorUseCase(repository)

    await expect(
      useCase.execute({ email: 'taken@email.com', organizationId: 'org-1' }),
    ).rejects.toThrow('EMAIL_ALREADY_IN_USE')

    expect(repository.create).not.toHaveBeenCalled()
  })
})
