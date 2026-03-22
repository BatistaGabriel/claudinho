# Architecture

**Analysis Date:** 2026-03-22

## Pattern Overview

**Overall:** Domain-Driven Design (DDD) with modular monorepo architecture using pnpm workspaces

**Key Characteristics:**

- Module-based organization with domain, application, and shared layers per feature
- Clean separation of concerns following DDD principles (entities, repositories, use cases)
- Multi-app monorepo structure (API + Web + Shared packages)
- NestJS for backend API, React for frontend
- Tenant isolation through organization-based data partitioning
- Event-driven patterns with cache/pub-sub abstractions

## Layers

**Domain Layer:**

- Purpose: Contains pure business logic, entities, and repository interfaces
- Location: `src/modules/{module}/domain/`
- Contains: Entity classes, repository interfaces, domain models
- Depends on: Nothing (pure business logic)
- Used by: Application layer

**Application Layer:**

- Purpose: Implements use cases/business workflows orchestrating domain logic
- Location: `src/modules/{module}/application/use-cases/`
- Contains: Use case classes that execute business operations
- Depends on: Domain layer entities and repositories
- Used by: Controllers, event handlers

**Shared Layer:**

- Purpose: Cross-cutting concerns and utilities used across modules
- Location: `src/shared/` and `packages/shared/`
- Contains: Guards, decorators, interfaces, JWT handling, role-based access
- Depends on: External NestJS libraries, TypeScript stdlib
- Used by: All modules via imports

**Presentation Layer (Web):**

- Purpose: React UI components
- Location: `apps/web/src/components/`
- Contains: React functional components with TypeScript interfaces
- Depends on: Shared package for types (Role enum, MovementType, JwtPayload)
- Used by: App routing

## Data Flow

**HTTP Request → API Flow:**

1. HTTP request arrives at NestJS controller (route not yet modeled; use cases only exist)
2. Request passes through shared guards (TenantIsolationGuard, RoleGuard)
3. Guard validates JWT and extracts organizationId, userId from JwtPayload
4. Use case is instantiated with injected repository
5. Use case creates/reconstitutes entity from domain layer
6. Entity methods validate business rules and apply transformations
7. Repository persists entity state to Prisma/PostgreSQL
8. Response returned to client

**Example: Create Product Flow:**

- Input: `CreateProductInput` (name, categoryId, quantity, etc.)
- CreateProductUseCase validates input via Product.create() factory
- Product entity constructor applies domain validations (name required, stock >= 0)
- Repository.create() persists to database
- Entity returned to client

**State Management:**

- Immutable entity design with private fields and getter methods
- State only mutates through explicit domain methods (e.g., `applyStockMovement()`, `update()`)
- Audit trail via createdAt/updatedAt timestamps
- Soft deletes via deletedAt field (never hard-delete)

## Key Abstractions

**Domain Entities:**

- Purpose: Encapsulate business logic and validate invariants
- Examples: `src/modules/products/domain/product.entity.ts`, `src/modules/auth/domain/magic-link-token.entity.ts`
- Pattern: Private constructor with factory methods (`static create()`, `static reconstitute()`)
  - `create()`: Validates input and returns new entity
  - `reconstitute()`: Restores entity from database without validation (trusted source)
  - Private fields with public getters prevent accidental mutation

**Repository Interfaces:**

- Purpose: Abstract data access layer
- Examples: `src/modules/products/domain/product.repository.ts`, `src/modules/dashboard/domain/dashboard.repository.ts`
- Pattern: Interfaces define contract; implementations in infrastructure layer (not yet present in codebase)
- Support for pagination via cursor-based approach
- Transaction support via `withTransaction<T>()` method

**Use Cases:**

- Purpose: Orchestrate domain logic for specific business operations
- Examples: `CreateProductUseCase`, `UpdateProductUseCase`, `ValidateImportFileUseCase`
- Pattern: Constructor injection of repository, single `execute()` method
- Input validated before creating/modifying entities
- Pure functions with no side effects except persistence

**Tenant Isolation:**

- Purpose: Ensure multi-tenant data security
- Implementation: `src/shared/guards/tenant-isolation.guard.ts`
- Pattern: Every query includes `organizationId` in filter parameters
- Database-level enforcement via schema (e.g., Product has `organizationId` field, indexed)

## Entry Points

**API:**

- Location: `src/main.ts`
- Triggers: `npm run dev` or `npm run build && npm start`
- Responsibilities:
  - NestFactory creates AppModule
  - Sets global prefix `/api/v1`
  - Applies ValidationPipe globally (whitelist mode, forbids non-whitelisted properties)
  - Listens on PORT env var or 3000

**Web:**

- Location: `apps/web/src/main.tsx`
- Triggers: Vite dev server or production build
- Responsibilities: React root render to DOM element
- App component mounted via ReactDOM.createRoot()

## Error Handling

**Strategy:** Throw Error with semantic message codes

**Patterns:**

- Domain entities throw on validation failure: `throw new Error('PRODUCT_NAME_REQUIRED')`
- Use cases inherit error (no try/catch) so NestJS framework handles response
- Client receives error via HTTP response (framework converts to 400/500)
- Example: Product.create() validates name, category, stock levels before entity construction

## Cross-Cutting Concerns

**Authentication:**

- JWT via `@nestjs/jwt` and `passport-jwt`
- JwtPayload: `{ userId, organizationId, role }` (see `packages/shared/src/index.ts`)
- Refresh tokens stored in Redis (TTL-based session)

**Authorization:**

- Role-based: `ADMIN`, `GESTOR` (manager), `OPERADOR` (operator)
- Implemented via RoleGuard at `src/shared/guards/role.guard.ts`
- @Roles() decorator marks protected endpoints

**Logging:**

- Framework: `pino` + `pino-http`
- Console output via structured JSON

**Validation:**

- Database-level: Prisma schema constraints (unique SKU per organization, FK relationships)
- Application-level: class-validator on DTOs (configured in NestJS ValidationPipe)
- Domain-level: Entity factories validate invariants

**Database:**

- PostgreSQL via Prisma ORM
- Schema: `src/prisma/schema.prisma`
- Models: Organization, User, Category, Product, StockMovement, MagicLinkToken
- Soft deletes on all entities (deletedAt field)
- Cursor-based pagination support via composite indexes

---

_Architecture analysis: 2026-03-22_
