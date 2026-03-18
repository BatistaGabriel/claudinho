import { StockMovement } from '../../domain/stock-movement.entity'
import { IStockMovementRepository } from '../../domain/stock-movement.repository'

interface CreateInflowInput {
  productId: string
  userId: string
  quantity: number
  organizationId: string
}

export class CreateInflowUseCase {
  constructor(private readonly repository: IStockMovementRepository) {}

  async execute(input: CreateInflowInput): Promise<void> {
    const movement = StockMovement.createInflow({
      productId: input.productId,
      userId: input.userId,
      organizationId: input.organizationId,
      quantity: input.quantity,
    })
    await this.repository.create(movement)
  }
}
