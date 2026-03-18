import { UpdateProductUseCase } from '../../../../src/modules/products/application/use-cases/update-product.use-case'
import { IProductRepository } from '../../../../src/modules/products/domain/product.repository'
import { Product } from '../../../../src/modules/products/domain/product.entity'

function makeProduct(overrides: Partial<Parameters<typeof Product.create>[0]> = {}) {
  return Product.create({
    name: 'Caneta',
    categoryId: 'cat-1',
    minimumStock: 5,
    quantity: 10,
    organizationId: 'org-1',
    ...overrides,
  })
}

function createMockRepository(
  product: Product | null = makeProduct(),
): jest.Mocked<IProductRepository> {
  return {
    findById: jest.fn().mockResolvedValue(product),
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn(),
    findAll: jest.fn(),
    softDelete: jest.fn(),
    withTransaction: jest.fn(),
  } as unknown as jest.Mocked<IProductRepository>
}

describe('UpdateProductUseCase', () => {
  it('should find the product and persist the update', async () => {
    const product = makeProduct()
    const repository = createMockRepository(product)
    const useCase = new UpdateProductUseCase(repository)

    await useCase.execute({
      productId: product.id,
      name: 'Caneta Vermelha',
      organizationId: 'org-1',
    })

    expect(repository.findById).toHaveBeenCalledWith(product.id, { organizationId: 'org-1' })
    expect(repository.update).toHaveBeenCalled()
  })

  it('should throw PRODUCT_NOT_FOUND when product does not exist for the organization', async () => {
    const repository = createMockRepository(null)
    const useCase = new UpdateProductUseCase(repository)

    await expect(
      useCase.execute({
        productId: 'non-existent-id',
        name: 'Updated Name',
        organizationId: 'org-1',
      }),
    ).rejects.toThrow('PRODUCT_NOT_FOUND')

    expect(repository.update).not.toHaveBeenCalled()
  })
})
