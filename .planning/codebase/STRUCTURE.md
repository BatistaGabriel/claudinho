# Codebase Structure

**Analysis Date:** 2026-03-22

## Directory Layout

```
claudinho/
├── apps/                          # Multi-app workspace
│   ├── api/                       # NestJS backend (DDD architecture)
│   │   ├── src/
│   │   │   ├── main.ts           # NestJS bootstrap entry point
│   │   │   ├── app.module.ts     # Root NestJS module
│   │   │   ├── modules/          # Feature modules (DDD)
│   │   │   │   ├── auth/         # Authentication & authorization
│   │   │   │   ├── users/        # User management
│   │   │   │   ├── products/     # Product catalog
│   │   │   │   ├── stock-movements/ # Inventory tracking
│   │   │   │   ├── dashboard/    # Analytics & reporting
│   │   │   │   ├── imports/      # File import processing
│   │   │   │   └── shared/       # Module-level shared (interfaces)
│   │   │   ├── prisma/           # Prisma ORM config & migrations
│   │   │   └── shared/           # App-level cross-cutting concerns
│   │   │       ├── guards/       # JWT, role, tenant-isolation
│   │   │       ├── decorators/   # @Roles, @Public
│   │   │       └── interfaces/   # JwtPayload, domain types
│   │   ├── test/                 # Test suite (mirrors src structure)
│   │   │   ├── unit/             # Unit tests for entities, use cases
│   │   │   ├── integration/      # Integration tests (empty)
│   │   │   └── e2e/              # E2E tests (empty)
│   │   ├── coverage/             # Jest coverage reports
│   │   ├── jest.config.js        # Jest configuration
│   │   ├── nest-cli.json         # NestJS CLI configuration
│   │   └── tsconfig.json         # TypeScript config
│   │
│   └── web/                       # React frontend (Vite + Vitest)
│       ├── src/
│       │   ├── main.tsx          # React DOM entry point
│       │   ├── App.tsx           # Root component
│       │   └── components/       # Feature components
│       │       ├── dashboard/    # Dashboard UI
│       │       └── products/     # Product management UI
│       ├── test/                 # Test suite
│       │   ├── unit/             # Component unit tests
│       │   │   └── components/   # Component tests (co-located pattern)
│       │   ├── e2e/              # E2E tests (empty)
│       │   └── setup.ts          # Vitest setup
│       ├── coverage/             # Vitest coverage reports
│       ├── vite.config.ts        # Vite build configuration
│       ├── vitest.config.ts      # Vitest test runner config
│       └── tsconfig.json         # TypeScript config
│
├── packages/                      # Shared code across apps
│   └── shared/
│       └── src/
│           └── index.ts          # Shared types: Role enum, MovementType, JwtPayload
│
├── .planning/                     # GSD planning & analysis
│   └── codebase/                 # Generated codebase documentation
│
├── docs/                          # Project documentation
│   └── superpowers/              # GSD sprint specifications
│       ├── plans/                # Phase implementation plans
│       └── specs/                # Feature specifications
│
├── docker/                        # Docker configuration
│   └── postgres/                 # PostgreSQL setup
│
├── .husky/                        # Git hooks
├── CLAUDE.MD                      # Codebase authority & specifications
├── package.json                   # Monorepo root
├── pnpm-workspace.yaml           # pnpm workspace configuration
├── pnpm-lock.yaml                # Dependency lock file
├── tsconfig.json                 # Root TypeScript config
├── eslint.config.js              # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── commitlint.config.js          # Commit message linting
└── README.md                      # Project documentation
```

## Directory Purposes

**`apps/api/src/modules/`:**

- Purpose: Feature modules following Domain-Driven Design
- Structure: Each module contains `domain/` and `application/use-cases/`
- Current modules: auth, users, products, stock-movements, dashboard, imports, shared

**`apps/api/src/modules/{module}/domain/`:**

- Purpose: Pure business logic and entity definitions
- Contains: Entity classes (e.g., `Product`, `User`, `MagicLinkToken`)
- Contains: Repository interfaces (e.g., `IProductRepository`)
- Not cached in git: none (domain is always source)

**`apps/api/src/modules/{module}/application/use-cases/`:**

- Purpose: Business workflows orchestrating domain entities
- Contains: Use case classes (e.g., `CreateProductUseCase`, `ListProductsUseCase`)
- Pattern: Single `execute()` method per use case
- Dependency: Injected repository interface, no framework coupling

**`apps/api/src/shared/`:**

- Purpose: App-level cross-cutting concerns
- Contains: Authentication guards, authorization decorators, JWT utilities
- Examples: `TenantIsolationGuard`, `RoleGuard`, `@Roles()` decorator

**`apps/api/test/unit/`:**

- Purpose: Unit tests for domain entities and use cases
- Naming: Mirrors `src/` structure with `.spec.ts` suffix
- Example: `test/unit/products/domain/product.entity.spec.ts` tests `src/modules/products/domain/product.entity.ts`

**`apps/web/src/components/`:**

- Purpose: Reusable React components organized by feature
- Naming: Subdirectories per feature (dashboard, products)
- Pattern: Functional components with TypeScript interfaces

**`packages/shared/src/`:**

- Purpose: Types and constants shared between apps/api and apps/web
- Contains: Role enum, MovementType enum, JwtPayload interface
- Usage: Both API (`@claudinho/shared`) and web (`@claudinho/shared`) import from here

**`.planning/codebase/`:**

- Purpose: GSD-generated documentation (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (via /gsd:map-codebase command)
- Committed: Yes (reference docs for future Claude instances)

## Key File Locations

**Entry Points:**

- `apps/api/src/main.ts`: NestJS bootstrap with ValidationPipe, sets `/api/v1` prefix
- `apps/web/src/main.tsx`: React DOM render, mounts App component
- `apps/api/src/app.module.ts`: Root NestJS module (currently empty, needs imports)

**Configuration:**

- `apps/api/src/prisma/schema.prisma`: Complete database schema (Organization, User, Product, StockMovement, Category, MagicLinkToken)
- `apps/api/jest.config.js`: Jest configuration with ts-jest, module name mapping for @claudinho/shared
- `apps/api/nest-cli.json`: NestJS CLI configuration
- `apps/web/vite.config.ts`: Vite build configuration with React plugin and path aliases
- `apps/web/vitest.config.ts`: Vitest test runner configuration

**Core Logic:**

- `apps/api/src/modules/products/domain/product.entity.ts`: Product aggregate with business logic
- `apps/api/src/modules/products/application/use-cases/create-product.use-case.ts`: Create product workflow
- `apps/web/src/components/products/ProductForm.tsx`: Product creation form component
- `apps/api/src/shared/guards/tenant-isolation.guard.ts`: Multi-tenant security enforcement

**Testing:**

- `apps/api/test/unit/products/domain/product.entity.spec.ts`: Domain entity tests
- `apps/api/test/unit/products/application/create-product.use-case.spec.ts`: Use case tests
- `apps/web/test/unit/components/products/ProductForm.spec.tsx`: Component tests
- `apps/api/src/test-setup.ts`: Jest global setup

## Naming Conventions

**Files:**

- `*.entity.ts`: Domain models (e.g., `product.entity.ts`)
- `*.repository.ts`: Repository interfaces (e.g., `product.repository.ts`)
- `*.use-case.ts`: Application use cases (e.g., `create-product.use-case.ts`)
- `*.spec.ts`: Jest test files (e.g., `product.entity.spec.ts`)
- `*.spec.tsx`: React component tests (e.g., `ProductForm.spec.tsx`)
- `*.guard.ts`: NestJS guards (e.g., `role.guard.ts`)
- `*.decorator.ts`: NestJS decorators (e.g., `roles.decorator.ts`)

**Directories:**

- `modules/{name}/domain/`: Domain layer per feature
- `modules/{name}/application/use-cases/`: Use cases per feature
- `test/unit/`: Unit test suite (mirrors src structure)
- `src/shared/`: Cross-cutting utilities (not in modules)
- `components/{feature}/`: React components grouped by feature

**Classes/Functions:**

- PascalCase: Classes (e.g., `Product`, `CreateProductUseCase`)
- camelCase: Functions and methods (e.g., `execute()`, `isCriticalStock()`)
- UPPER_SNAKE_CASE: Error codes (e.g., `PRODUCT_NAME_REQUIRED`, `FILE_TOO_LARGE`)
- camelCase: Variables and constants (e.g., `MAX_FILE_SIZE`, `ALLOWED_MIME_TYPES`)

**Interfaces:**

- PascalCase with `I` prefix for repository contracts: `IProductRepository`
- PascalCase for data shapes: `ProductProps`, `CreateProductInput`, `DashboardIndicatorsData`

## Where to Add New Code

**New Feature (e.g., Category Management):**

- Domain logic: `apps/api/src/modules/categories/domain/category.entity.ts`
- Domain interface: `apps/api/src/modules/categories/domain/category.repository.ts`
- Use cases: `apps/api/src/modules/categories/application/use-cases/{create,update,list,delete}-category.use-case.ts`
- Tests: `apps/api/test/unit/categories/{domain,application}/`
- Web UI: `apps/web/src/components/categories/CategoryForm.tsx`, `CategoryList.tsx`

**New Component (React):**

- Implementation: `apps/web/src/components/{feature}/{ComponentName}.tsx`
- Tests: `apps/web/test/unit/components/{feature}/{ComponentName}.spec.tsx`
- Pattern: Functional component with TypeScript interface for props

**Shared Types:**

- Add to: `packages/shared/src/index.ts`
- Export from root: `export { NewType } from './types'`
- Usage: Import as `import { NewType } from '@claudinho/shared'`

**Cross-Cutting Utilities:**

- Guards: `apps/api/src/shared/guards/{name}.guard.ts`
- Decorators: `apps/api/src/shared/decorators/{name}.decorator.ts`
- Interfaces: `apps/api/src/shared/interfaces/{name}.ts`

**Database Migrations:**

- Schema changes: Edit `apps/api/src/prisma/schema.prisma`
- Generate migration: `pnpm db:migrate`
- Seed data: `apps/api/src/prisma/seed.ts`

## Special Directories

**`apps/api/src/prisma/`:**

- Purpose: Prisma ORM configuration and migrations
- Generated: Migrations folder (created by `prisma migrate`)
- Committed: Yes (migrations are source of truth)
- Key file: `schema.prisma` (database schema definition)

**`apps/api/src/modules/shared/`:**

- Purpose: Module-level shared interfaces (different from `src/shared/`)
- Contains: Pub-sub service interface, cache service interface
- Usage: Used by modules that need cross-module communication

**`packages/shared/`:**

- Purpose: Types and enums for monorepo
- Generated: No
- Committed: Yes (shared types)
- Used by: Both API and web app via pnpm workspace

**`coverage/`:**

- Purpose: Test coverage reports
- Generated: Yes (via `jest --coverage` or `vitest --coverage`)
- Committed: No (in .gitignore)

**`.planning/codebase/`:**

- Purpose: GSD-generated documentation
- Generated: Yes (via `/gsd:map-codebase` command)
- Committed: Yes (reference for future implementations)

---

_Structure analysis: 2026-03-22_
