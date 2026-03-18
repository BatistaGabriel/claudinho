import { StockMovement } from './stock-movement.entity'

export interface PaginationParams {
  cursor?: string
  limit?: number
  organizationId: string
  productId?: string
}

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  hasNextPage: boolean
}

export interface IStockMovementRepository {
  findById(id: string, params: { organizationId: string }): Promise<StockMovement | null>
  findAll(params: PaginationParams): Promise<PaginatedResult<StockMovement>>
  // findByIdForUpdate uses SELECT ... FOR UPDATE to prevent concurrent outflow race conditions
  findProductQuantityForUpdate(productId: string, organizationId: string): Promise<number>
  create(movement: StockMovement): Promise<void>
  withTransaction<T>(fn: (tx: IStockMovementRepository) => Promise<T>): Promise<T>
}
