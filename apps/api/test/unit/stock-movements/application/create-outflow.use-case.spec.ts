import { CreateOutflowUseCase } from '../../../../src/modules/stock-movements/application/use-cases/create-outflow.use-case'
import { IStockMovementRepository } from '../../../../src/modules/stock-movements/domain/stock-movement.repository'

function createMockRepository(
  options: { availableQuantity?: number } = {},
): jest.Mocked<IStockMovementRepository> {
  const { availableQuantity = 10 } = options
  const mock = {
    findProductQuantityForUpdate: jest.fn().mockResolvedValue(availableQuantity),
    create: jest.fn().mockResolvedValue(undefined),
    withTransaction: jest.fn().mockImplementation(async (fn) => fn(mock)),
    findById: jest.fn(),
    findAll: jest.fn(),
  } as unknown as jest.Mocked<IStockMovementRepository>
  return mock
}

describe('CreateOutflowUseCase', () => {
  describe('Concurrency: SELECT FOR UPDATE', () => {
    it('should call findProductQuantityForUpdate (not findById) before validating balance', async () => {
      const repository = createMockRepository({ availableQuantity: 10 })
      const useCase = new CreateOutflowUseCase(repository)

      await useCase.execute({
        productId: 'prod-1',
        userId: 'user-1',
        quantity: 5,
        organizationId: 'org-1',
      })

      expect(repository.findProductQuantityForUpdate).toHaveBeenCalledWith('prod-1', 'org-1')
    })

    it('should NOT call findById directly (must use the locked version)', async () => {
      const repository = createMockRepository({ availableQuantity: 10 })
      const useCase = new CreateOutflowUseCase(repository)

      await useCase.execute({
        productId: 'prod-1',
        userId: 'user-1',
        quantity: 5,
        organizationId: 'org-1',
      })

      expect(repository.findById).not.toHaveBeenCalled()
    })
  })

  describe('Atomicity: withTransaction', () => {
    it('should execute inside a transaction', async () => {
      const repository = createMockRepository({ availableQuantity: 10 })
      const useCase = new CreateOutflowUseCase(repository)

      await useCase.execute({
        productId: 'prod-1',
        userId: 'user-1',
        quantity: 5,
        organizationId: 'org-1',
      })

      expect(repository.withTransaction).toHaveBeenCalled()
    })

    it('should persist the movement inside the transaction', async () => {
      const repository = createMockRepository({ availableQuantity: 10 })
      const useCase = new CreateOutflowUseCase(repository)

      await useCase.execute({
        productId: 'prod-1',
        userId: 'user-1',
        quantity: 5,
        organizationId: 'org-1',
      })

      expect(repository.create).toHaveBeenCalled()
    })
  })

  describe('Business rule enforcement', () => {
    it('should throw INSUFFICIENT_STOCK without persisting when balance is insufficient', async () => {
      const repository = createMockRepository({ availableQuantity: 3 })
      const useCase = new CreateOutflowUseCase(repository)

      await expect(
        useCase.execute({
          productId: 'prod-1',
          userId: 'user-1',
          quantity: 5,
          organizationId: 'org-1',
        }),
      ).rejects.toThrow('INSUFFICIENT_STOCK')

      expect(repository.create).not.toHaveBeenCalled()
    })

    it('should allow outflow when quantity exactly equals available balance', async () => {
      const repository = createMockRepository({ availableQuantity: 5 })
      const useCase = new CreateOutflowUseCase(repository)

      await expect(
        useCase.execute({
          productId: 'prod-1',
          userId: 'user-1',
          quantity: 5,
          organizationId: 'org-1',
        }),
      ).resolves.not.toThrow()

      expect(repository.create).toHaveBeenCalled()
    })
  })
})
