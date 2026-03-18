import { randomBytes } from 'crypto'

interface MagicLinkTokenProps {
  id: string
  userId: string
  value: string
  usedAt: Date | null
  expiresAt: Date
}

interface CreateProps {
  userId: string
  expiresAt: Date
}

interface ReconstituteProps {
  id: string
  userId: string
  value: string
  usedAt: Date | null
  expiresAt: Date
}

export class MagicLinkToken {
  readonly id: string
  readonly userId: string
  readonly value: string
  readonly expiresAt: Date
  private _usedAt: Date | null

  private constructor(props: MagicLinkTokenProps) {
    this.id = props.id
    this.userId = props.userId
    this.value = props.value
    this.expiresAt = props.expiresAt
    this._usedAt = props.usedAt
  }

  static create(props: CreateProps): MagicLinkToken {
    return new MagicLinkToken({
      id: randomBytes(16).toString('hex'),
      userId: props.userId,
      value: randomBytes(32).toString('hex'),
      usedAt: null,
      expiresAt: props.expiresAt,
    })
  }

  static reconstitute(props: ReconstituteProps): MagicLinkToken {
    return new MagicLinkToken(props)
  }

  get usedAt(): Date | null {
    return this._usedAt
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt
  }

  isValid(): boolean {
    return !this.isExpired() && this._usedAt === null
  }

  markAsUsed(): void {
    this._usedAt = new Date()
  }
}
