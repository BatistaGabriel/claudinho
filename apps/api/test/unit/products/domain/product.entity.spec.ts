import { Product } from '../../../../src/modules/products/domain/product.entity'

describe('Product', () => {
  const validProps = {
    name: 'Caneta Azul',
    categoryId: 'cat-1',
    minimumStock: 10,
    quantity: 15,
    organizationId: 'org-1',
  }

  describe('create()', () => {
    it('should create a valid product with correct properties', () => {
      const product = Product.create(validProps)
      expect(product.name).toBe('Caneta Azul')
      expect(product.categoryId).toBe('cat-1')
      expect(product.minimumStock).toBe(10)
      expect(product.quantity).toBe(15)
      expect(product.organizationId).toBe('org-1')
    })

    it('should throw CATEGORY_REQUIRED when categoryId is not provided', () => {
      expect(() => Product.create({ ...validProps, categoryId: '' })).toThrow('CATEGORY_REQUIRED')
    })

    it('should throw INVALID_MINIMUM_STOCK when minimumStock is negative', () => {
      expect(() => Product.create({ ...validProps, minimumStock: -1 })).toThrow(
        'INVALID_MINIMUM_STOCK',
      )
    })

    it('should allow minimumStock of 0', () => {
      expect(() => Product.create({ ...validProps, minimumStock: 0 })).not.toThrow()
    })

    it('should throw INVALID_QUANTITY when quantity is negative', () => {
      expect(() => Product.create({ ...validProps, quantity: -1 })).toThrow('INVALID_QUANTITY')
    })

    it('should allow quantity of 0', () => {
      expect(() => Product.create({ ...validProps, quantity: 0 })).not.toThrow()
    })

    it('should throw PRODUCT_NAME_REQUIRED when name is empty', () => {
      expect(() => Product.create({ ...validProps, name: '' })).toThrow('PRODUCT_NAME_REQUIRED')
    })

    it('should set deletedAt to null on creation', () => {
      const product = Product.create(validProps)
      expect(product.deletedAt).toBeNull()
    })
  })

  describe('isCriticalStock()', () => {
    it('should return true when quantity is below minimum threshold', () => {
      const product = Product.create({ ...validProps, minimumStock: 10, quantity: 5 })
      expect(product.isCriticalStock()).toBe(true)
    })

    it('should return false when quantity equals minimum threshold', () => {
      const product = Product.create({ ...validProps, minimumStock: 10, quantity: 10 })
      expect(product.isCriticalStock()).toBe(false)
    })

    it('should return false when quantity is above minimum threshold', () => {
      const product = Product.create({ ...validProps, minimumStock: 10, quantity: 15 })
      expect(product.isCriticalStock()).toBe(false)
    })

    it('should return false when minimumStock is 0', () => {
      const product = Product.create({ ...validProps, minimumStock: 0, quantity: 0 })
      expect(product.isCriticalStock()).toBe(false)
    })
  })

  describe('isDeleted()', () => {
    it('should return false for an active product', () => {
      const product = Product.create(validProps)
      expect(product.isDeleted()).toBe(false)
    })

    it('should return true after softDelete()', () => {
      const product = Product.create(validProps)
      product.softDelete()
      expect(product.isDeleted()).toBe(true)
    })
  })

  describe('softDelete()', () => {
    it('should set deletedAt to a Date', () => {
      const product = Product.create(validProps)
      product.softDelete()
      expect(product.deletedAt).toBeInstanceOf(Date)
    })
  })

  describe('applyStockMovement()', () => {
    it('should increase quantity for inflow', () => {
      const product = Product.create({ ...validProps, quantity: 10 })
      product.applyStockMovement('inflow', 5)
      expect(product.quantity).toBe(15)
    })

    it('should decrease quantity for outflow', () => {
      const product = Product.create({ ...validProps, quantity: 10 })
      product.applyStockMovement('outflow', 3)
      expect(product.quantity).toBe(7)
    })

    it('should throw INSUFFICIENT_STOCK for outflow exceeding available quantity', () => {
      const product = Product.create({ ...validProps, quantity: 5 })
      expect(() => product.applyStockMovement('outflow', 10)).toThrow('INSUFFICIENT_STOCK')
    })

    it('should throw INSUFFICIENT_STOCK for outflow on product with zero quantity', () => {
      const product = Product.create({ ...validProps, quantity: 0 })
      expect(() => product.applyStockMovement('outflow', 1)).toThrow('INSUFFICIENT_STOCK')
    })
  })

  describe('reconstitute()', () => {
    it('should reconstruct a product from persistence data', () => {
      const product = Product.reconstitute({
        id: 'prod-id-123',
        name: 'Caneta',
        categoryId: 'cat-1',
        sku: 'SKU-001',
        minimumStock: 5,
        quantity: 20,
        organizationId: 'org-1',
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      expect(product.id).toBe('prod-id-123')
      expect(product.sku).toBe('SKU-001')
    })
  })
})
