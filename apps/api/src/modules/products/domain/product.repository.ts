import { Product } from './product.entity'

export interface PaginationParams {
  cursor?: string
  limit?: number
  organizationId: string
}

export interface PaginatedResult<T> {
  items: T[]
  nextCursor: string | null
  hasNextPage: boolean
}

export interface IProductRepository {
  findById(id: string, params: { organizationId: string }): Promise<Product | null>
  findAll(params: PaginationParams): Promise<PaginatedResult<Product>>
  create(product: Product): Promise<void>
  update(product: Product): Promise<void>
  softDelete(id: string, organizationId: string): Promise<void>
  withTransaction<T>(fn: (tx: IProductRepository) => Promise<T>): Promise<T>
}
