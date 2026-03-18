import { StockMovement } from '../../domain/stock-movement.entity'
import { IStockMovementRepository } from '../../domain/stock-movement.repository'
import { ICacheService } from '../../../shared/interfaces/cache.service'
import { IPubSubService } from '../../../shared/interfaces/pub-sub.service'

interface CreateOutflowInput {
  productId: string
  userId: string
  quantity: number
  organizationId: string
}

export class CreateOutflowUseCase {
  constructor(
    private readonly repository: IStockMovementRepository,
    private readonly cacheService: ICacheService,
    private readonly pubSubService: IPubSubService,
  ) {}

  async execute(input: CreateOutflowInput): Promise<void> {
    await this.repository.withTransaction(async (tx) => {
      // SELECT FOR UPDATE — serializes concurrent outflows for the same product
      const availableQuantity = await tx.findProductQuantityForUpdate(
        input.productId,
        input.organizationId,
      )

      // Domain entity validates the business rule
      const movement = StockMovement.createOutflow({
        productId: input.productId,
        userId: input.userId,
        organizationId: input.organizationId,
        quantity: input.quantity,
        availableQuantity,
      })

      await tx.create(movement)
    })
    await this.cacheService.invalidate(`dashboard:indicators:${input.organizationId}`)
    await this.pubSubService.publish(`sse:dashboard:${input.organizationId}`, {
      event: 'dashboard.updated',
      version: 1,
    })
  }
}
