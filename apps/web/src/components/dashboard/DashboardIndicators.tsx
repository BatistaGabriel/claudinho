interface DashboardIndicatorsData {
  totalActiveProducts: number
  criticalStockProducts: number
  todayMovements: number
  staleProducts: number
}

interface DashboardIndicatorsProps {
  data: DashboardIndicatorsData
}

export function DashboardIndicators({ data }: DashboardIndicatorsProps) {
  const criticalClass = data.criticalStockProducts > 0 ? 'critical' : ''

  return (
    <div>
      <div>{data.totalActiveProducts}</div>
      <div data-testid="critical-stock-indicator" className={criticalClass}>
        {data.criticalStockProducts}
      </div>
      <div>{data.todayMovements}</div>
      <div>{data.staleProducts}</div>
    </div>
  )
}
