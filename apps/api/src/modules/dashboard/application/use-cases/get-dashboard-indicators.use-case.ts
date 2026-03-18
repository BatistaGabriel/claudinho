import { DashboardIndicators, IDashboardRepository } from '../../domain/dashboard.repository'

interface GetDashboardIndicatorsInput {
  organizationId: string
}

export class GetDashboardIndicatorsUseCase {
  constructor(private readonly repository: IDashboardRepository) {}

  async execute(input: GetDashboardIndicatorsInput): Promise<DashboardIndicators> {
    return this.repository.getIndicators(input.organizationId)
  }
}
