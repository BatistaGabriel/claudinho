export interface DashboardIndicators {
  totalActiveProducts: number
  criticalStockProducts: number
  todayMovements: number
  staleProducts: number
}

export interface IDashboardRepository {
  getIndicators(organizationId: string): Promise<DashboardIndicators>
}
