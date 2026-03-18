import { Product } from '../../domain/product.entity'
import { IProductRepository } from '../../domain/product.repository'

interface CreateProductInput {
  name: string
  categoryId: string
  sku?: string
  minimumStock: number
  quantity: number
  organizationId: string
}

export class CreateProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(input: CreateProductInput): Promise<Product> {
    const product = Product.create(input)
    await this.repository.create(product)
    return product
  }
}
