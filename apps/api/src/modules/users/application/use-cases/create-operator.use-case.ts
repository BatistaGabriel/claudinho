import { User } from '../../domain/user.entity'
import { IUserRepository } from '../../domain/user.repository'

interface CreateOperatorInput {
  email: string
  organizationId: string
}

export class CreateOperatorUseCase {
  constructor(private readonly repository: IUserRepository) {}

  async execute(input: CreateOperatorInput): Promise<User> {
    const exists = await this.repository.existsByEmail(input.email)
    if (exists) throw new Error('EMAIL_ALREADY_IN_USE')

    const operator = User.createOperator({
      email: input.email,
      organizationId: input.organizationId,
    })
    await this.repository.create(operator)
    return operator
  }
}
