import { StockMovement } from '../../domain/stock-movement.entity'
import { IStockMovementRepository } from '../../domain/stock-movement.repository'
import { ICacheService } from '../../../shared/interfaces/cache.service'
import { IPubSubService } from '../../../shared/interfaces/pub-sub.service'

interface CreateInflowInput {
  productId: string
  userId: string
  quantity: number
  organizationId: string
}

export class CreateInflowUseCase {
  constructor(
    private readonly repository: IStockMovementRepository,
    private readonly cacheService: ICacheService,
    private readonly pubSubService: IPubSubService,
  ) {}

  async execute(input: CreateInflowInput): Promise<void> {
    const movement = StockMovement.createInflow({
      productId: input.productId,
      userId: input.userId,
      organizationId: input.organizationId,
      quantity: input.quantity,
    })
    await this.repository.create(movement)
    await this.cacheService.invalidate(`dashboard:indicators:${input.organizationId}`)
    await this.pubSubService.publish(`sse:dashboard:${input.organizationId}`, {
      event: 'dashboard.updated',
      version: 1,
    })
  }
}
