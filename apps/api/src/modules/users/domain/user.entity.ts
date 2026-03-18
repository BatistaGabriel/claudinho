import { randomBytes } from 'crypto'

type Role = 'admin' | 'gestor' | 'operador'

interface UserProps {
  id: string
  email: string
  role: Role
  organizationId: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

interface CreateManagerProps {
  email: string
  organizationId: string
}

interface CreateOperatorProps {
  email: string
  organizationId: string
}

export class User {
  readonly id: string
  readonly email: string
  readonly role: Role
  readonly organizationId: string | null
  readonly createdAt: Date
  readonly updatedAt: Date
  readonly deletedAt: Date | null

  private constructor(props: UserProps) {
    this.id = props.id
    this.email = props.email
    this.role = props.role
    this.organizationId = props.organizationId
    this.createdAt = props.createdAt
    this.updatedAt = props.updatedAt
    this.deletedAt = props.deletedAt
  }

  static createManager(props: CreateManagerProps): User {
    if (!props.email || !props.email.includes('@')) throw new Error('INVALID_EMAIL')
    const now = new Date()
    return new User({
      id: randomBytes(16).toString('hex'),
      email: props.email,
      role: 'gestor',
      organizationId: props.organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static createOperator(props: CreateOperatorProps): User {
    if (!props.email || !props.email.includes('@')) throw new Error('INVALID_EMAIL')
    const now = new Date()
    return new User({
      id: randomBytes(16).toString('hex'),
      email: props.email,
      role: 'operador',
      organizationId: props.organizationId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
  }

  static reconstitute(props: UserProps): User {
    return new User(props)
  }
}
