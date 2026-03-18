import { GetDashboardIndicatorsUseCase } from '../../../../src/modules/dashboard/application/use-cases/get-dashboard-indicators.use-case'
import {
  IDashboardRepository,
  DashboardIndicators,
} from '../../../../src/modules/dashboard/domain/dashboard.repository'

function createMockRepository(indicators: DashboardIndicators): jest.Mocked<IDashboardRepository> {
  return {
    getIndicators: jest.fn().mockResolvedValue(indicators),
  } as unknown as jest.Mocked<IDashboardRepository>
}

const mockIndicators: DashboardIndicators = {
  totalActiveProducts: 42,
  criticalStockProducts: 5,
  todayMovements: 18,
  staleProducts: 3,
}

describe('GetDashboardIndicatorsUseCase', () => {
  it('should return all four indicators from the repository', async () => {
    const repository = createMockRepository(mockIndicators)
    const useCase = new GetDashboardIndicatorsUseCase(repository)

    const result = await useCase.execute({ organizationId: 'org-1' })

    expect(result).toEqual({
      totalActiveProducts: 42,
      criticalStockProducts: 5,
      todayMovements: 18,
      staleProducts: 3,
    })
  })

  it('should call repository.getIndicators with the correct organizationId', async () => {
    const repository = createMockRepository(mockIndicators)
    const useCase = new GetDashboardIndicatorsUseCase(repository)

    await useCase.execute({ organizationId: 'org-tenant-X' })

    expect(repository.getIndicators).toHaveBeenCalledWith('org-tenant-X')
  })

  it('should return zero values when there are no products or movements', async () => {
    const repository = createMockRepository({
      totalActiveProducts: 0,
      criticalStockProducts: 0,
      todayMovements: 0,
      staleProducts: 0,
    })
    const useCase = new GetDashboardIndicatorsUseCase(repository)

    const result = await useCase.execute({ organizationId: 'org-empty' })

    expect(result.totalActiveProducts).toBe(0)
    expect(result.criticalStockProducts).toBe(0)
    expect(result.todayMovements).toBe(0)
    expect(result.staleProducts).toBe(0)
  })
})
