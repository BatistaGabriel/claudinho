# Coding Conventions

**Analysis Date:** 2026-03-22

## Naming Patterns

**Files:**

- Use kebab-case for file names: `create-product.use-case.ts`, `product.entity.ts`, `product.repository.ts`
- Use PascalCase for component files: `ProductForm.tsx`, `DashboardIndicators.tsx`
- Use `.spec.ts` or `.spec.tsx` suffix for test files
- Use `.interface.ts` for standalone interface files in shared: `jwt-payload.interface.ts`
- Use `.decorator.ts` for decorators: `roles.decorator.ts`, `public.decorator.ts`
- Use `.guard.ts` for NestJS guards: `role.guard.ts`, `tenant-isolation.guard.ts`

**Functions:**

- Use camelCase for function names: `handleSubmit()`, `createMockRepository()`, `canActivate()`
- Prefix mock factory functions with `createMock`: `createMockRepository()`, `createMockTokenRepository()`, `createMockBullQueue()`
- Prefix test helper functions with `create`: `createMockContext()`

**Variables:**

- Use camelCase for all variables: `productId`, `organizationId`, `emailQueue`, `requiredRoles`
- Use uppercase for constants and types: `MovementType = 'inflow' | 'outflow'`
- Prefix boolean variables with `is` or boolean getters: `isExpired()`, `isValid()`, `isCriticalStock()`, `isDeleted()`
- Use verb prefix for state setters in React: `setName`, `setCategoryId`, `setNameError`

**Types:**

- Use PascalCase for interface names: `CreateProductInput`, `ProductFormData`, `ProductFormProps`, `IProductRepository`, `JwtPayload`
- Prefix repository interfaces with `I`: `IProductRepository`, `IMagicLinkTokenRepository`, `IStockMovementRepository`, `ICacheService`, `IPubSubService`
- Use `Props` suffix for entity/component prop interfaces: `ProductProps`, `CreateProps`, `ProductFormProps`
- Use `Input` suffix for use case input types: `CreateProductInput`, `CreateInflowInput`, `CreateManagerProps`

## Code Style

**Formatting:**

- Tool: Prettier (configured in `.prettierrc`)
- Semi-colons: No (semicolons disabled)
- Quotes: Single quotes for strings
- Trailing comma: All (include trailing commas in all places)
- Print width: 100 characters
- Tab width: 2 spaces

**Linting:**

- Tool: ESLint with TypeScript support (`typescript-eslint`)
- Enforced via lint-staged on commit
- Run manually with: `pnpm lint` (from root)
- Fixed automatically on commit if possible

## Import Organization

**Order:**

1. External dependencies (React, NestJS, testing libraries)
2. Internal domain/application logic (entities, repositories, use cases)
3. Shared utilities and interfaces
4. Relative imports for same-module dependencies

**Examples:**

```typescript
// API example
import { Product } from '../../domain/product.entity'
import { IProductRepository } from '../../domain/product.repository'
import { ICacheService } from '../../../shared/interfaces/cache.service'
import { IPubSubService } from '../../../shared/interfaces/pub-sub.service'

// Web example
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductForm } from '../../../../src/components/products/ProductForm'
```

**Path Aliases:**

- API: `@claudinho/shared` → `../../packages/shared/src/index.ts`
- Web: `@claudinho/shared` → `../../packages/shared/src/index.ts`

## Error Handling

**Patterns:**

- Throw `Error` with string error codes: `throw new Error('CATEGORY_REQUIRED')`
- Use UPPERCASE_SNAKE_CASE for error codes: `PRODUCT_NAME_REQUIRED`, `INVALID_MINIMUM_STOCK`, `INSUFFICIENT_STOCK`, `INVALID_EMAIL`, `FILE_TOO_LARGE`
- Error codes should be thrown from domain entities during validation
- Domain entities validate on creation: `Product.create()`, `User.createManager()`, `MagicLinkToken.create()`
- Validation includes checking for empty strings, negative numbers, and email format: `if (!props.email || !props.email.includes('@')) throw new Error('INVALID_EMAIL')`
- NestJS uses global `ValidationPipe` with `whitelist: true, forbidNonWhitelisted: true` for DTOs: `src/main.ts`

## Logging

**Framework:** Pino (HTTP middleware: pino-http)

**Patterns:**

- Pino is configured as the logger for HTTP requests
- Application uses standard console methods for explicit logging (no dedicated logger instances found in application code)
- No custom logging decorators or services observed

## Comments

**When to Comment:**

- No JSDoc comments found in analyzed source files
- Minimal inline comments observed
- Code is self-documenting through naming conventions and DDD principles

**JSDoc/TSDoc:**

- Not currently used in codebase
- Focus is on clear naming and domain-driven design patterns

## Function Design

**Size:**

- Small, focused functions
- Average 10-30 lines for use cases
- Entity methods typically 2-15 lines
- React components around 50-80 lines with proper separation

**Parameters:**

- Use single object parameter for multiple inputs: `execute(input: CreateProductInput)`
- Use interface for parameter typing, not inline types
- Dependency injection via constructor (NestJS pattern)

**Return Values:**

- Use explicit return types: `async execute(input: CreateProductInput): Promise<Product>`
- Repository methods return `Promise<T | null>` for single items, `Promise<PaginatedResult<T>>` for lists
- Use Cases return specific domain objects: `Promise<Product>`, `Promise<void>`
- React components return JSX: `export function ProductForm(...)`

## Module Design

**Exports:**

- Export classes directly: `export class CreateProductUseCase`
- Export interfaces publicly: `export interface IProductRepository`
- Use explicit named exports, not default exports (except React components which may use both)
- Example structure in `src/modules/products/domain/product.repository.ts`:
  - Exported interfaces: `PaginationParams`, `PaginatedResult<T>`, `IProductRepository`

**Barrel Files:**

- Not observed in repository interfaces
- Import directly from source files

**Class Design:**

- Private constructors for entities to force use of factory methods: `private constructor(props: ProductProps)`
- Static factory methods for entity creation: `static create()`, `static reconstitute()`, `static createManager()`
- Private fields with underscore prefix for mutable state: `private _name: string`, `private _quantity: number`
- Readonly properties for immutable values: `readonly id: string`, `readonly organizationId: string`, `readonly createdAt: Date`
- Getter methods for accessing private fields: `get name(): string { return this._name }`
- Domain-driven validation in entity factory methods, not in use cases

## Architectural Patterns

**Domain-Driven Design (DDD):**

- Entities encapsulate validation logic
- Use cases orchestrate domain logic and repository interactions
- Repositories define interfaces, not implementations
- Input DTOs separate from domain models

**Dependency Injection:**

- Constructor-based injection for NestJS services
- Interfaces for all dependencies to enable mocking
- No static initialization

**Transaction Support:**

- Repositories support transactions: `withTransaction<T>(fn: (tx: IProductRepository) => Promise<T>): Promise<T>`

---

_Convention analysis: 2026-03-22_
