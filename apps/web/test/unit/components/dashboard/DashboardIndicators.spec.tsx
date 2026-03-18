import { render, screen } from '@testing-library/react'
import { DashboardIndicators } from '../../../../src/components/dashboard/DashboardIndicators'

it('should display total active products', () => {
  render(
    <DashboardIndicators
      data={{
        totalActiveProducts: 42,
        criticalStockProducts: 5,
        todayMovements: 18,
        staleProducts: 3,
      }}
    />,
  )
  expect(screen.getByText('42')).toBeInTheDocument()
})

it('should highlight critical stock indicator when criticalStockProducts > 0', () => {
  render(
    <DashboardIndicators
      data={{
        totalActiveProducts: 10,
        criticalStockProducts: 5,
        todayMovements: 0,
        staleProducts: 0,
      }}
    />,
  )
  const indicator = screen.getByTestId('critical-stock-indicator')
  expect(indicator).toHaveClass('critical')
})

it('should NOT highlight critical stock indicator when criticalStockProducts is 0', () => {
  render(
    <DashboardIndicators
      data={{
        totalActiveProducts: 10,
        criticalStockProducts: 0,
        todayMovements: 0,
        staleProducts: 0,
      }}
    />,
  )
  const indicator = screen.getByTestId('critical-stock-indicator')
  expect(indicator).not.toHaveClass('critical')
})

it('should display todayMovements count', () => {
  render(
    <DashboardIndicators
      data={{
        totalActiveProducts: 0,
        criticalStockProducts: 0,
        todayMovements: 18,
        staleProducts: 0,
      }}
    />,
  )
  expect(screen.getByText('18')).toBeInTheDocument()
})
