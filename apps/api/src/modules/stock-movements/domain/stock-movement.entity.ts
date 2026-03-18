import { randomBytes } from 'crypto'

type MovementType = 'inflow' | 'outflow'

interface StockMovementProps {
  id: string
  type: MovementType
  quantity: number
  productId: string
  userId: string
  organizationId: string
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

interface CreateInflowProps {
  productId: string
  userId: string
  organizationId: string
  quantity: number
}

interface CreateOutflowProps {
  productId: string
  userId: string
  organizationId: string
  quantity: number
  availableQuantity: number
}

export class StockMovement {
  readonly id: string
  readonly type: MovementType
  readonly quantity: number
  readonly productId: string
  readonly userId: string
  readonly organizationId: string
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly deletedAt: Date | null

  private constructor(props: StockMovementProps) {
    this.id = props.id
    this.type = props.type
    this.quantity = props.quantity
    this.productId = props.productId
    this.userId = props.userId
    this.organizationId = props.organizationId
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
    this.deletedAt = props.deletedAt
  }

  private static validateQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('INVALID_QUANTITY')
    }
  }

  static createInflow(props: CreateInflowProps): StockMovement {
    StockMovement.validateQuantity(props.quantity)
    const now = new Date()
    return new StockMovement({
      id: randomBytes(16).toString('hex'),
      type: 'inflow',
      quantity: props.quantity,
      productId: props.productId,
      userId: props.userId,
      organizationId: props.organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static createOutflow(props: CreateOutflowProps): StockMovement {
    StockMovement.validateQuantity(props.quantity)
    if (props.quantity > props.availableQuantity) {
      throw new Error('INSUFFICIENT_STOCK')
    }
    const now = new Date()
    return new StockMovement({
      id: randomBytes(16).toString('hex'),
      type: 'outflow',
      quantity: props.quantity,
      productId: props.productId,
      userId: props.userId,
      organizationId: props.organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static reconstitute(props: StockMovementProps): StockMovement {
    return new StockMovement(props)
  }
}
