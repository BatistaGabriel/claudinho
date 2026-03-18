import { DeleteProductUseCase } from '../../../../src/modules/products/application/use-cases/delete-product.use-case'
import { IProductRepository } from '../../../../src/modules/products/domain/product.repository'
import { Product } from '../../../../src/modules/products/domain/product.entity'

function makeProduct() {
  return Product.create({
    name: 'Caneta',
    categoryId: 'cat-1',
    minimumStock: 5,
    quantity: 10,
    organizationId: 'org-1',
  })
}

function createMockRepository(
  product: Product | null = makeProduct(),
): jest.Mocked<IProductRepository> {
  return {
    findById: jest.fn().mockResolvedValue(product),
    softDelete: jest.fn().mockResolvedValue(undefined),
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    withTransaction: jest.fn(),
  } as unknown as jest.Mocked<IProductRepository>
}

describe('DeleteProductUseCase', () => {
  it('should call softDelete (not a physical delete method)', async () => {
    const product = makeProduct()
    const repository = createMockRepository(product)
    const useCase = new DeleteProductUseCase(repository)

    await useCase.execute({ productId: product.id, organizationId: 'org-1' })

    expect(repository.softDelete).toHaveBeenCalledWith(product.id, 'org-1')
    // No "delete" method exists on the interface — softDelete is the only way
  })

  it('should throw PRODUCT_NOT_FOUND when product does not exist', async () => {
    const repository = createMockRepository(null)
    const useCase = new DeleteProductUseCase(repository)

    await expect(
      useCase.execute({ productId: 'ghost-id', organizationId: 'org-1' }),
    ).rejects.toThrow('PRODUCT_NOT_FOUND')

    expect(repository.softDelete).not.toHaveBeenCalled()
  })
})
