import { User } from '../../domain/user.entity'
import { IUserRepository } from '../../domain/user.repository'

interface CreateManagerInput {
  email: string
  organizationId: string
}

export class CreateManagerUseCase {
  constructor(private readonly repository: IUserRepository) {}

  async execute(input: CreateManagerInput): Promise<User> {
    const exists = await this.repository.existsByEmail(input.email)
    if (exists) throw new Error('EMAIL_ALREADY_IN_USE')

    const manager = User.createManager({ email: input.email, organizationId: input.organizationId })
    await this.repository.create(manager)
    return manager
  }
}
