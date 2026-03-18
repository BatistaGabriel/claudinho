import { User } from './user.entity'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(user: User): Promise<void>
  existsByEmail(email: string): Promise<boolean>
}
