import { ListProductsUseCase } from '../../../../src/modules/products/application/use-cases/list-products.use-case'
import {
  IProductRepository,
  PaginatedResult,
} from '../../../../src/modules/products/domain/product.repository'
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

function createMockRepository(result: PaginatedResult<Product>): jest.Mocked<IProductRepository> {
  return {
    findAll: jest.fn().mockResolvedValue(result),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    withTransaction: jest.fn(),
  } as unknown as jest.Mocked<IProductRepository>
}

describe('ListProductsUseCase', () => {
  it('should return paginated products', async () => {
    const product = makeProduct()
    const paginatedResult: PaginatedResult<Product> = {
      items: [product],
      nextCursor: null,
      hasNextPage: false,
    }
    const repository = createMockRepository(paginatedResult)
    const useCase = new ListProductsUseCase(repository)

    const result = await useCase.execute({ organizationId: 'org-1' })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe('Caneta')
    expect(result.hasNextPage).toBe(false)
  })

  it('should return empty list when no products exist', async () => {
    const paginatedResult: PaginatedResult<Product> = {
      items: [],
      nextCursor: null,
      hasNextPage: false,
    }
    const repository = createMockRepository(paginatedResult)
    const useCase = new ListProductsUseCase(repository)

    const result = await useCase.execute({ organizationId: 'org-1' })

    expect(result.items).toHaveLength(0)
  })

  it('should pass organizationId to the repository (tenant isolation)', async () => {
    const paginatedResult: PaginatedResult<Product> = {
      items: [],
      nextCursor: null,
      hasNextPage: false,
    }
    const repository = createMockRepository(paginatedResult)
    const useCase = new ListProductsUseCase(repository)

    await useCase.execute({ organizationId: 'org-tenant-X', cursor: 'some-cursor' })

    expect(repository.findAll).toHaveBeenCalledWith({
      organizationId: 'org-tenant-X',
      cursor: 'some-cursor',
    })
  })
})
