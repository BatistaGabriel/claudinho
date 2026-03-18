import { IProductRepository } from '../../domain/product.repository'

interface UpdateProductInput {
  productId: string
  name?: string
  categoryId?: string
  minimumStock?: number
  organizationId: string
}

export class UpdateProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(input: UpdateProductInput): Promise<void> {
    const product = await this.repository.findById(input.productId, {
      organizationId: input.organizationId,
    })
    if (!product) throw new Error('PRODUCT_NOT_FOUND')

    product.update({
      name: input.name,
      categoryId: input.categoryId,
      minimumStock: input.minimumStock,
    })

    await this.repository.update(product)
  }
}
