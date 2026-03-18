import { randomBytes } from 'crypto'

type Role = 'admin' | 'gestor' | 'operador'

const TTL_BY_ROLE: Record<Exclude<Role, 'admin'>, number> = {
  gestor: 8 * 60 * 60 * 1000, // 8 hours in ms
  operador: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
}

interface RefreshTokenProps {
  userId: string
  role: Role
  value: string
  expiresAt: Date
  rotatedAt: Date | null
  revokedAt: Date | null
}

interface CreateProps {
  userId: string
  role: Exclude<Role, 'admin'>
}

export class RefreshToken {
  readonly userId: string
  readonly role: Role
  readonly value: string
  readonly expiresAt: Date
  private _rotatedAt: Date | null
  private _revokedAt: Date | null

  private constructor(props: RefreshTokenProps) {
    this.userId = props.userId
    this.role = props.role
    this.value = props.value
    this.expiresAt = props.expiresAt
    this._rotatedAt = props.rotatedAt
    this._revokedAt = props.revokedAt
  }

  static create(props: CreateProps): RefreshToken {
    const ttl = TTL_BY_ROLE[props.role]
    return new RefreshToken({
      userId: props.userId,
      role: props.role,
      value: randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + ttl),
      rotatedAt: null,
      revokedAt: null,
    })
  }

  static reconstitute(props: RefreshTokenProps): RefreshToken {
    return new RefreshToken(props)
  }

  get rotatedAt(): Date | null {
    return this._rotatedAt
  }

  get revokedAt(): Date | null {
    return this._revokedAt
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  isRotated(): boolean {
    return this._rotatedAt !== null
  }

  isPotentialCompromise(): boolean {
    return this.isRotated()
  }

  isValid(): boolean {
    return !this.isExpired() && !this.isRotated() && this._revokedAt === null
  }

  markAsRotated(): void {
    this._rotatedAt = new Date()
  }

  revoke(): void {
    this._revokedAt = new Date()
  }
}
