import { CreateProductUseCase } from '../../../../src/modules/products/application/use-cases/create-product.use-case'
import { IProductRepository } from '../../../../src/modules/products/domain/product.repository'

function createMockRepository(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    withTransaction: jest.fn(),
  } as unknown as jest.Mocked<IProductRepository>
}

describe('CreateProductUseCase', () => {
  it('should create and persist a product', async () => {
    const repository = createMockRepository()
    const useCase = new CreateProductUseCase(repository)

    await useCase.execute({
      name: 'Caneta',
      categoryId: 'cat-1',
      minimumStock: 5,
      quantity: 20,
      organizationId: 'org-1',
    })

    expect(repository.create).toHaveBeenCalledTimes(1)
    const createdProduct = repository.create.mock.calls[0][0]
    expect(createdProduct.name).toBe('Caneta')
    expect(createdProduct.organizationId).toBe('org-1')
  })

  it('should throw CATEGORY_REQUIRED when categoryId is empty', async () => {
    const repository = createMockRepository()
    const useCase = new CreateProductUseCase(repository)

    await expect(
      useCase.execute({
        name: 'Caneta',
        categoryId: '',
        minimumStock: 5,
        quantity: 10,
        organizationId: 'org-1',
      }),
    ).rejects.toThrow('CATEGORY_REQUIRED')

    expect(repository.create).not.toHaveBeenCalled()
  })

  it('should throw INVALID_MINIMUM_STOCK when minimumStock is negative', async () => {
    const repository = createMockRepository()
    const useCase = new CreateProductUseCase(repository)

    await expect(
      useCase.execute({
        name: 'Caneta',
        categoryId: 'cat-1',
        minimumStock: -1,
        quantity: 10,
        organizationId: 'org-1',
      }),
    ).rejects.toThrow('INVALID_MINIMUM_STOCK')
  })
})
