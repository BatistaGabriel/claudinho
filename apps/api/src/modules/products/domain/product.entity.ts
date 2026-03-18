import { randomBytes } from 'crypto'

type MovementType = 'inflow' | 'outflow'

interface ProductProps {
  id: string
  name: string
  categoryId: string
  sku: string | null
  minimumStock: number
  quantity: number
  organizationId: string
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface CreateProps {
  name: string
  categoryId: string
  sku?: string | null
  minimumStock: number
  quantity: number
  organizationId: string
}

export class Product {
  readonly id: string
  readonly organizationId: string
  readonly sku: string | null
  readonly createdAt: Date
  private _name: string
  private _categoryId: string
  private _minimumStock: number
  private _quantity: number
  private _deletedAt: Date | null
  private _updatedAt: Date

  private constructor(props: ProductProps) {
    this.id = props.id
    this.organizationId = props.organizationId
    this.sku = props.sku
    this.createdAt = props.createdAt
    this._name = props.name
    this._categoryId = props.categoryId
    this._minimumStock = props.minimumStock
    this._quantity = props.quantity
    this._deletedAt = props.deletedAt
    this._updatedAt = props.updatedAt
  }

  static create(props: CreateProps): Product {
    if (!props.name || props.name.trim() === '') {
      throw new Error('PRODUCT_NAME_REQUIRED')
    }
    if (!props.categoryId || props.categoryId.trim() === '') {
      throw new Error('CATEGORY_REQUIRED')
    }
    if (props.minimumStock < 0) {
      throw new Error('INVALID_MINIMUM_STOCK')
    }
    if (props.quantity < 0) {
      throw new Error('INVALID_QUANTITY')
    }

    const now = new Date()
    return new Product({
      id: randomBytes(16).toString('hex'),
      name: props.name,
      categoryId: props.categoryId,
      sku: props.sku ?? null,
      minimumStock: props.minimumStock,
      quantity: props.quantity,
      organizationId: props.organizationId,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static reconstitute(props: ProductProps): Product {
    return new Product(props)
  }

  get name(): string {
    return this._name
  }
  get categoryId(): string {
    return this._categoryId
  }
  get minimumStock(): number {
    return this._minimumStock
  }
  get quantity(): number {
    return this._quantity
  }
  get deletedAt(): Date | null {
    return this._deletedAt
  }
  get updatedAt(): Date {
    return this._updatedAt
  }

  isCriticalStock(): boolean {
    return this._quantity < this._minimumStock
  }

  isDeleted(): boolean {
    return this._deletedAt !== null
  }

  softDelete(): void {
    this._deletedAt = new Date()
    this._updatedAt = new Date()
  }

  applyStockMovement(type: MovementType, quantity: number): void {
    if (type === 'outflow' && quantity > this._quantity) {
      throw new Error('INSUFFICIENT_STOCK')
    }
    if (type === 'inflow') {
      this._quantity += quantity
    } else {
      this._quantity -= quantity
    }
    this._updatedAt = new Date()
  }
}
