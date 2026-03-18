import { StockMovement } from '../../domain/stock-movement.entity'
import { IStockMovementRepository } from '../../domain/stock-movement.repository'

interface CreateOutflowInput {
  productId: string
  userId: string
  quantity: number
  organizationId: string
}

export class CreateOutflowUseCase {
  constructor(private readonly repository: IStockMovementRepository) {}

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
  }
}
