import { IProductRepository } from '../../domain/product.repository'

interface DeleteProductInput {
  productId: string
  organizationId: string
}

export class DeleteProductUseCase {
  constructor(private readonly repository: IProductRepository) {}

  async execute(input: DeleteProductInput): Promise<void> {
    const product = await this.repository.findById(input.productId, {
      organizationId: input.organizationId,
    })
    if (!product) throw new Error('PRODUCT_NOT_FOUND')

    await this.repository.softDelete(input.productId, input.organizationId)
  }
}
