import { useState } from 'react'

interface Category {
  id: string
  name: string
}

interface ProductFormData {
  name: string
  categoryId: string
}

interface ProductFormProps {
  onSubmit: (data: ProductFormData) => void
  categories: Category[]
}

export function ProductForm({ onSubmit, categories }: ProductFormProps) {
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [nameError, setNameError] = useState('')
  const [categoryError, setCategoryError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    let valid = true

    if (!name.trim()) {
      setNameError('Nome é obrigatório')
      valid = false
    } else {
      setNameError('')
    }

    if (!categoryId) {
      setCategoryError('Categoria é obrigatória')
      valid = false
    } else {
      setCategoryError('')
    }

    if (valid) {
      onSubmit({ name, categoryId })
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="product-name">Nome</label>
        <input
          id="product-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        {nameError && <span>{nameError}</span>}
      </div>

      <div>
        <label htmlFor="product-category">Categoria</label>
        <select
          id="product-category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">Selecione uma categoria</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {categoryError && <span>{categoryError}</span>}
      </div>

      <button type="submit">Salvar</button>
    </form>
  )
}
