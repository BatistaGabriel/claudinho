import { randomBytes } from 'crypto'

interface CategoryProps {
  id: string
  name: string
  organizationId: string
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

interface CreateProps {
  name: string
  organizationId: string
}

export class Category {
  readonly id: string
  readonly organizationId: string
  readonly createdAt: Date
  private _name: string
  private _deletedAt: Date | null
  private _updatedAt: Date

  private constructor(props: CategoryProps) {
    this.id = props.id
    this.organizationId = props.organizationId
    this.createdAt = props.createdAt
    this._name = props.name
    this._deletedAt = props.deletedAt
    this._updatedAt = props.updatedAt
  }

  static create(props: CreateProps): Category {
    if (!props.name || props.name.trim() === '') {
      throw new Error('CATEGORY_NAME_REQUIRED')
    }
    if (!props.organizationId || props.organizationId.trim() === '') {
      throw new Error('ORGANIZATION_REQUIRED')
    }

    const now = new Date()
    return new Category({
      id: randomBytes(16).toString('hex'),
      name: props.name.trim(),
      organizationId: props.organizationId,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    })
  }

  static reconstitute(props: CategoryProps): Category {
    return new Category(props)
  }

  get name(): string {
    return this._name
  }

  get deletedAt(): Date | null {
    return this._deletedAt
  }

  get updatedAt(): Date {
    return this._updatedAt
  }

  update(fields: { name?: string }): void {
    if (fields.name !== undefined) {
      if (!fields.name || fields.name.trim() === '') throw new Error('CATEGORY_NAME_REQUIRED')
      this._name = fields.name.trim()
    }
    this._updatedAt = new Date()
  }

  softDelete(): void {
    this._deletedAt = new Date()
    this._updatedAt = new Date()
  }

  isDeleted(): boolean {
    return this._deletedAt !== null
  }
}
