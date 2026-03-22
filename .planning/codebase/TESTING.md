# Testing Patterns

**Analysis Date:** 2026-03-22

## Test Framework

**API (Backend):**

- Runner: Jest 29.5.0
- Config: `apps/api/jest.config.js`
- Assertion Library: Jest matchers (built-in)

**Web (Frontend):**

- Runner: Vitest 1.3.0
- Config: `apps/web/vitest.config.ts`
- Assertion Library: Jest matchers (Vitest compatible)
- DOM Testing: `@testing-library/react` 14.2.0

**Run Commands:**

```bash
# API
pnpm --filter api test              # Run all unit tests
pnpm --filter api test:unit         # Run only unit tests
pnpm --filter api test:int          # Run only integration tests
pnpm --filter api test:e2e          # Run only e2e tests
pnpm --filter api test:cov          # Run with coverage

# Web
pnpm --filter web test              # Run all tests
pnpm --filter web test:unit         # Run unit tests
pnpm --filter web test:e2e          # Run e2e tests
pnpm --filter web test:cov          # Run with coverage

# Root
pnpm test                            # Run all tests across all apps
pnpm test:unit                       # Run all unit tests
pnpm test:int                        # Run all integration tests
pnpm test:e2e                        # Run all e2e tests
pnpm test:cov                        # Run with coverage across all apps
```

## Test File Organization

**Location:**

- Separate from source: `test/unit/`, `test/integration/`, `test/e2e/`
- Mirror source directory structure in test directories
- API: `apps/api/test/unit/modules/{module-name}/{layer}/*.spec.ts`
- Web: `apps/web/test/unit/components/{component-name}/*.spec.tsx`

**Naming:**

- Use `.spec.ts` for unit tests: `create-product.use-case.spec.ts`
- Use `.spec.tsx` for React component tests: `ProductForm.spec.tsx`
- Test file basename matches source file being tested

**Structure:**

```
api/
├── test/
│   ├── unit/
│   │   ├── products/
│   │   │   ├── domain/
│   │   │   │   └── product.entity.spec.ts
│   │   │   └── application/
│   │   │       └── create-product.use-case.spec.ts
│   │   ├── auth/
│   │   ├── users/
│   │   ├── stock-movements/
│   │   ├── dashboard/
│   │   ├── imports/
│   │   └── shared/
│   │       └── guards/
│   ├── integration/
│   └── e2e/
├── src/
│   ├── modules/
│   └── test-setup.ts

web/
├── test/
│   ├── unit/
│   │   └── components/
│   │       ├── products/
│   │       │   └── ProductForm.spec.tsx
│   │       └── dashboard/
│   │           └── DashboardIndicators.spec.tsx
│   └── e2e/
├── src/
└── test/
    └── setup.ts
```

## Test Structure

**Suite Organization:**

```typescript
// Pattern from API tests
describe('CreateProductUseCase', () => {
  it('should create and persist a product', async () => {
    const repository = createMockRepository()
    const useCase = new CreateProductUseCase(repository)

    await useCase.execute({
      name: 'Caneta',
      categoryId: 'cat-1',
      minimumStock: 5,
      quantity: 20,
      organizationId: 'org-1',
    })

    expect(repository.create).toHaveBeenCalledTimes(1)
    const createdProduct = repository.create.mock.calls[0][0]
    expect(createdProduct.name).toBe('Caneta')
    expect(createdProduct.organizationId).toBe('org-1')
  })

  it('should throw CATEGORY_REQUIRED when categoryId is empty', async () => {
    const repository = createMockRepository()
    const useCase = new CreateProductUseCase(repository)

    await expect(
      useCase.execute({
        name: 'Caneta',
        categoryId: '',
        minimumStock: 5,
        quantity: 10,
        organizationId: 'org-1',
      }),
    ).rejects.toThrow('CATEGORY_REQUIRED')

    expect(repository.create).not.toHaveBeenCalled()
  })
})

// Pattern from web tests (no describe wrapper)
it('should display validation error when category is not selected', async () => {
  render(<ProductForm onSubmit={vi.fn()} categories={mockCategories} />)
  await userEvent.type(screen.getByLabelText(/nome/i), 'Caneta')
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
  expect(screen.getByText(/categoria é obrigatória/i)).toBeInTheDocument()
})
```

**Patterns:**

- API tests use `describe()` blocks to organize test suites by class
- Web tests may omit `describe()` wrapper for simpler components
- Test names use "should" pattern: `should create and persist a product`
- Use `beforeEach()` for setup: `beforeEach(() => { reflector = ... })`
- Arrange-Act-Assert pattern followed in most tests
- Mock factories created outside test blocks: `function createMockRepository()`

## Mocking

**Framework:** Jest for API, Vitest for web (both compatible)

**Patterns:**

```typescript
// API: Jest mock factory pattern
function createMockRepository(): jest.Mocked<IProductRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    withTransaction: jest.fn(),
  } as unknown as jest.Mocked<IProductRepository>
}

// API: Test setup with mocks
beforeEach(() => {
  reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as jest.Mocked<Reflector>
  guard = new RoleGuard(reflector)
})

// Web: Vitest mock (vi.fn())
const mockCategories = [
  { id: 'cat-1', name: 'Categoria A' },
  { id: 'cat-2', name: 'Categoria B' },
]

const onSubmit = vi.fn()
render(<ProductForm onSubmit={onSubmit} categories={mockCategories} />)
```

**What to Mock:**

- All external dependencies: repositories, services, queues
- Testing library functions for integration: `vi.fn()` for React callbacks
- NestJS infrastructure: `Reflector`, `ExecutionContext`

**What NOT to Mock:**

- Domain entities: Create real instances to test validation
- Use cases: Test real implementations with mocked dependencies
- React components: Render real components unless testing composition

## Fixtures and Factories

**Test Data:**

```typescript
// From API tests - inline fixture creation
const mockCategories = [
  { id: 'cat-1', name: 'Categoria A' },
  { id: 'cat-2', name: 'Categoria B' },
]

// From API tests - context factory
function createMockContext(user: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext
}
```

**Location:**

- Fixtures defined inline within test files
- Factory functions at top of spec files
- Minimal fixture reuse - inline fixtures preferred

## Coverage

**Requirements:**

- Coverage tracking enabled: `provider: 'v8'`
- No minimum threshold enforced
- Reports generated: `text` and `lcov` formats

**View Coverage:**

```bash
# API
pnpm --filter api test:cov
# Coverage output: apps/api/coverage/

# Web
pnpm --filter web test:cov
# Coverage output: apps/web/coverage/
```

## Test Types

**Unit Tests:**

- Scope: Individual classes or functions in isolation
- Approach: Mocked dependencies, fast execution
- Location: `test/unit/`
- Pattern: Test domain entities, use cases, guards with mocked repositories and services
- Examples:
  - `create-product.use-case.spec.ts`: Tests use case logic with mocked repository
  - `product.entity.spec.ts`: Tests entity validation and methods
  - `role.guard.spec.ts`: Tests NestJS guard with mocked reflector

**Integration Tests:**

- Scope: Interactions between components, services, and persistence
- Approach: Real or more realistic infrastructure
- Location: `test/integration/`
- Approach (inferred): Database connections, service interactions

**E2E Tests:**

- Scope: Full request-response cycles through the entire application
- Framework: Not configured yet in test files analyzed
- Location: `test/e2e/`

## Common Patterns

**Async Testing:**

```typescript
// API pattern
it('should enqueue email job after persisting token', async () => {
  const repository = createMockTokenRepository()
  const emailQueue = createMockBullQueue()
  const useCase = new RequestMagicLinkUseCase(repository, emailQueue)

  await useCase.execute({ email: 'user@test.com', userId: 'user-1' })

  expect(emailQueue.add).toHaveBeenCalledWith('send-magic-link', {
    email: 'user@test.com',
    token: expect.any(String),
  })
})

// Web pattern
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
```

**Error Testing:**

```typescript
// API pattern - expects thrown error
it('should throw CATEGORY_REQUIRED when categoryId is empty', async () => {
  const repository = createMockRepository()
  const useCase = new CreateProductUseCase(repository)

  await expect(
    useCase.execute({
      name: 'Caneta',
      categoryId: '',
      minimumStock: 5,
      quantity: 10,
      organizationId: 'org-1',
    }),
  ).rejects.toThrow('CATEGORY_REQUIRED')

  expect(repository.create).not.toHaveBeenCalled()
})

// Web pattern - DOM validation display
it('should display validation error when category is not selected', async () => {
  render(<ProductForm onSubmit={vi.fn()} categories={mockCategories} />)
  await userEvent.click(screen.getByRole('button', { name: /salvar/i }))
  expect(screen.getByText(/categoria é obrigatória/i)).toBeInTheDocument()
})
```

**React Testing Library Patterns:**

```typescript
// Rendering with props
render(<ProductForm onSubmit={vi.fn()} categories={mockCategories} />)

// Finding elements
screen.getByLabelText(/nome/i)           // Case-insensitive text search
screen.getByRole('button', { name: /salvar/i })  // Button by text
screen.getByTestId('critical-stock-indicator')   // Data-testid attribute

// Assertions
expect(screen.getByText('42')).toBeInTheDocument()
expect(indicator).toHaveClass('critical')
expect(indicator).not.toHaveClass('critical')

// User interactions
await userEvent.type(element, 'text')
await userEvent.click(element)
await userEvent.selectOptions(element, 'cat-1')
```

## Test Setup

**API Setup File:** `apps/api/src/test-setup.ts`

- Currently minimal: `// Global test setup`
- Jest configured in `jest.config.js` with `setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts']`

**Web Setup File:** `apps/web/test/setup.ts`

- Imports: `@testing-library/jest-dom`
- Provides Jest matchers like `toBeInTheDocument()`

---

_Testing analysis: 2026-03-22_
