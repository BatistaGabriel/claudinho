import { IProductRepository, PaginatedResult } from '../../domain/product.repository'
import { Product } from '../../domain/product.entity'

interface ListProductsInput {
  organizationId: string
  cursor?: string
  limit?: number
}

export class ListProductsUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(input: ListProductsInput): Promise<PaginatedResult<Product>> {
    return this.repository.findAll({
      organizationId: input.organizationId,
      cursor: input.cursor,
      limit: input.limit,
    })
  }
}
