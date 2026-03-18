import { CreateManagerUseCase } from '../../../../src/modules/users/application/use-cases/create-manager.use-case'
import { IUserRepository } from '../../../../src/modules/users/domain/user.repository'

function createMockRepository(emailExists = false): jest.Mocked<IUserRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    existsByEmail: jest.fn().mockResolvedValue(emailExists),
    findById: jest.fn(),
    findByEmail: jest.fn(),
  } as unknown as jest.Mocked<IUserRepository>
}

describe('CreateManagerUseCase', () => {
  it('should create and persist a manager with role gestor', async () => {
    const repository = createMockRepository(false)
    const useCase = new CreateManagerUseCase(repository)

    await useCase.execute({
      email: 'gestor@alpha.dev',
      organizationId: 'org-1',
    })

    expect(repository.create).toHaveBeenCalledTimes(1)
    const createdUser = repository.create.mock.calls[0][0]
    expect(createdUser.role).toBe('gestor')
    expect(createdUser.organizationId).toBe('org-1')
  })

  it('should throw EMAIL_ALREADY_IN_USE when email is already taken', async () => {
    const repository = createMockRepository(true)
    const useCase = new CreateManagerUseCase(repository)

    await expect(
      useCase.execute({ email: 'existing@email.com', organizationId: 'org-1' }),
    ).rejects.toThrow('EMAIL_ALREADY_IN_USE')

    expect(repository.create).not.toHaveBeenCalled()
  })
})
