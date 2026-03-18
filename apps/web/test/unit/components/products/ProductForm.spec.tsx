import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductForm } from '../../../../src/components/products/ProductForm'

const mockCategories = [
  { id: 'cat-1', name: 'Categoria A' },
  { id: 'cat-2', name: 'Categoria B' },
]

it('should display validation error when category is not selected', async () => {
  render(<ProductForm onSubmit={vi.fn()} categories={mockCategories} />)
  await userEvent.type(screen.getByLabelText(/nome/i), 'Caneta')
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
  expect(screen.getByText(/categoria é obrigatória/i)).toBeInTheDocument()
})

it('should call onSubmit with correct data when form is valid', async () => {
  const onSubmit = vi.fn()
  render(<ProductForm onSubmit={onSubmit} categories={mockCategories} />)
  await userEvent.type(screen.getByLabelText(/nome/i), 'Caneta')
  await userEvent.selectOptions(screen.getByLabelText(/categoria/i), 'cat-1')
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
  expect(onSubmit).toHaveBeenCalledWith(
    expect.objectContaining({ categoryId: 'cat-1', name: 'Caneta' }),
  )
})

it('should display validation error when name is empty', async () => {
  render(<ProductForm onSubmit={vi.fn()} categories={mockCategories} />)
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
  expect(screen.getByText(/nome é obrigatório/i)).toBeInTheDocument()
})
