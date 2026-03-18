import { CreateInflowUseCase } from '../../../../src/modules/stock-movements/application/use-cases/create-inflow.use-case'
import { IStockMovementRepository } from '../../../../src/modules/stock-movements/domain/stock-movement.repository'
import { ICacheService } from '../../../../src/modules/shared/interfaces/cache.service'
import { IPubSubService } from '../../../../src/modules/shared/interfaces/pub-sub.service'

function createMockRepository(): jest.Mocked<IStockMovementRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findAll: jest.fn(),
    findProductQuantityForUpdate: jest.fn(),
    withTransaction: jest.fn(),
  } as unknown as jest.Mocked<IStockMovementRepository>
}

function createMockCacheService(): jest.Mocked<ICacheService> {
  return {
    invalidate: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  }
}

function createMockPubSubService(): jest.Mocked<IPubSubService> {
  return {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn().mockResolvedValue(undefined),
  }
}

describe('CreateInflowUseCase', () => {
  describe('Core behavior', () => {
    it('should persist movement via repository.create', async () => {
      const repository = createMockRepository()
      const cacheService = createMockCacheService()
      const pubSubService = createMockPubSubService()
      const useCase = new CreateInflowUseCase(repository, cacheService, pubSubService)

      await useCase.execute({
        productId: 'prod-1',
        userId: 'user-1',
        quantity: 10,
        organizationId: 'org-1',
      })

      expect(repository.create).toHaveBeenCalled()
    })
  })

  describe('Cross-cutting concerns', () => {
    it('should invalidate dashboard cache after recording a movement', async () => {
      const repository = createMockRepository()
      const cacheService = createMockCacheService()
      const pubSubService = createMockPubSubService()
      const useCase = new CreateInflowUseCase(repository, cacheService, pubSubService)

      await useCase.execute({
        productId: 'prod-1',
        userId: 'user-1',
        quantity: 10,
        organizationId: 'org-1',
      })

      expect(cacheService.invalidate).toHaveBeenCalledWith('dashboard:indicators:org-1')
    })

    it('should publish event to Redis SSE channel after recording a movement', async () => {
      const repository = createMockRepository()
      const cacheService = createMockCacheService()
      const pubSubService = createMockPubSubService()
      const useCase = new CreateInflowUseCase(repository, cacheService, pubSubService)

      await useCase.execute({
        productId: 'prod-1',
        userId: 'user-1',
        quantity: 10,
        organizationId: 'org-1',
      })

      expect(pubSubService.publish).toHaveBeenCalledWith(
        'sse:dashboard:org-1',
        expect.objectContaining({ event: 'dashboard.updated' }),
      )
    })
  })
})
