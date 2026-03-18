import { StockMovement } from '../../../../src/modules/stock-movements/domain/stock-movement.entity'

describe('StockMovement', () => {
  const baseProps = {
    productId: 'prod-1',
    userId: 'user-1',
    organizationId: 'org-1',
  }

  describe('createInflow()', () => {
    it('should create a valid inflow movement', () => {
      const movement = StockMovement.createInflow({ ...baseProps, quantity: 10 })
      expect(movement.type).toBe('inflow')
      expect(movement.quantity).toBe(10)
      expect(movement.productId).toBe('prod-1')
      expect(movement.organizationId).toBe('org-1')
    })

    it('should not throw for any positive quantity', () => {
      expect(() => StockMovement.createInflow({ ...baseProps, quantity: 1 })).not.toThrow()
      expect(() => StockMovement.createInflow({ ...baseProps, quantity: 9999 })).not.toThrow()
    })

    it('should throw INVALID_QUANTITY when quantity is zero or negative', () => {
      expect(() => StockMovement.createInflow({ ...baseProps, quantity: 0 })).toThrow(
        'INVALID_QUANTITY',
      )
      expect(() => StockMovement.createInflow({ ...baseProps, quantity: -5 })).toThrow(
        'INVALID_QUANTITY',
      )
    })
  })

  describe('createOutflow()', () => {
    it('should create a valid outflow movement when quantity does not exceed available', () => {
      const movement = StockMovement.createOutflow({
        ...baseProps,
        quantity: 5,
        availableQuantity: 10,
      })
      expect(movement.type).toBe('outflow')
      expect(movement.quantity).toBe(5)
    })

    it('should allow outflow when quantity equals available quantity (exactly 0 remaining)', () => {
      expect(() =>
        StockMovement.createOutflow({ ...baseProps, quantity: 10, availableQuantity: 10 }),
      ).not.toThrow()
    })

    it('should throw INSUFFICIENT_STOCK when quantity exceeds available quantity', () => {
      expect(() =>
        StockMovement.createOutflow({ ...baseProps, quantity: 11, availableQuantity: 10 }),
      ).toThrow('INSUFFICIENT_STOCK')
    })

    it('should throw INSUFFICIENT_STOCK when available quantity is zero', () => {
      expect(() =>
        StockMovement.createOutflow({ ...baseProps, quantity: 1, availableQuantity: 0 }),
      ).toThrow('INSUFFICIENT_STOCK')
    })

    it('should throw INSUFFICIENT_STOCK when available quantity is negative (data corruption guard)', () => {
      expect(() =>
        StockMovement.createOutflow({ ...baseProps, quantity: 1, availableQuantity: -1 }),
      ).toThrow('INSUFFICIENT_STOCK')
    })

    it('should throw INVALID_QUANTITY when outflow quantity is zero or negative', () => {
      expect(() =>
        StockMovement.createOutflow({ ...baseProps, quantity: 0, availableQuantity: 10 }),
      ).toThrow('INVALID_QUANTITY')
      expect(() =>
        StockMovement.createOutflow({ ...baseProps, quantity: -1, availableQuantity: 10 }),
      ).toThrow('INVALID_QUANTITY')
    })
  })

  describe('reconstitute()', () => {
    it('should reconstruct a movement from persistence without re-validating', () => {
      const movement = StockMovement.reconstitute({
        id: 'mov-id-1',
        type: 'outflow',
        quantity: 5,
        productId: 'prod-1',
        userId: 'user-1',
        organizationId: 'org-1',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })
      expect(movement.id).toBe('mov-id-1')
      expect(movement.type).toBe('outflow')
    })
  })
})
