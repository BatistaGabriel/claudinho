import { Category } from './category.entity'

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

export interface ICategoryRepository {
  findById(id: string, params: { organizationId: string }): Promise<Category | null>
  findAll(params: PaginationParams): Promise<PaginatedResult<Category>>
  create(category: Category): Promise<void>
  update(category: Category): Promise<void>
  softDelete(id: string, organizationId: string): Promise<void>
}
