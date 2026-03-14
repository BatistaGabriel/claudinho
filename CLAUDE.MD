# CLAUDE.md

## Project Overview

SaaS inventory management system for small businesses, built as a modular monolith. Enables product registration, stock movement tracking (inflows and outflows), and provides a centralized dashboard with stock health indicators to support logistics decisions.

Multi-tenant via row-level tenancy — each registered organization accesses exclusively its own data, with isolation enforced by PostgreSQL RLS and application-layer guards.

Two main user personas: stock operators (responsible for recording movements and products) and managers (responsible for viewing the dashboard and making data-driven decisions).

**Stack:** NestJS (back-end) · React + Vite (front-end) · PostgreSQL (database) · Prisma (ORM)

## Development Setup

The project is a monorepo managed with **pnpm workspaces**. All infrastructure dependencies run in Docker containers — no local PostgreSQL or Redis installation required.

**Monorepo structure:**

```
/
  apps/
    api/              # NestJS
    web/              # React + Vite
  packages/
    shared/           # TypeScript types and utilities shared between api and web
  docker-compose.yml
  pnpm-workspace.yaml
  .nvmrc              # Node.js version used in the project
```

**System requirements:**

- Docker and Docker Compose (>= 24)
- Node.js >= 20 (LTS) — earlier versions are not supported. The repository includes a `.nvmrc` with the exact version in use — running `nvm use` from the project root activates the correct version automatically
- pnpm >= 8 (`npm install -g pnpm@latest`)

**`.nvmrc`:**

The `.nvmrc` file already exists in the repository root. When cloning, activate the correct Node version with:

```bash
nvm use       # activates the version specified in .nvmrc
nvm install   # if the version is not installed locally, installs it first then activates
```

To update the project's Node version, regenerate the file from the active nvm version and commit it:

```bash
node --version > .nvmrc
```

This writes the currently active version (e.g. `v20.19.0`) to the file. Commit the updated `.nvmrc` alongside any changes that require the new Node version.

**Dev container:**

The repository includes a `.devcontainer` configuration compatible with VS Code Dev Containers and GitHub Codespaces. It pre-installs the Claude Code extension, configures ESLint and Prettier on save, and registers the Storm MCP gateway automatically on container creation.

The MCP gateway URL contains a personal token and must never be committed. It is read from a local environment variable at container build time via `${localEnv:STORM_MCP_GATEWAY_URL}`.

Before opening the project in a dev container, add the variable to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export STORM_MCP_GATEWAY_URL=https://stormmcp.ai/gateway/<your-token>/mcp
```

Then reload the profile (`source ~/.zshrc`) and open the container — the MCP will be registered automatically via `postCreateCommand`. If the variable is not set, the container still works normally but the MCP will not be registered.

**First-time setup:**

```bash
# 1. Clone the repository
git clone <repo-url>

# 2. Activate the correct Node version
nvm use

# 3. Copy and fill in environment variables
cp .env.example .env

# 4. Start infrastructure (PostgreSQL + Redis)
docker compose up -d

# 5. Install dependencies
pnpm install

# 6. Run migrations
pnpm db:migrate

# 7. Seed development data
pnpm db:seed

# 8. Start services in development mode
pnpm dev
```

**Test commands:**

```bash
pnpm test          # run the full test suite
pnpm test:unit     # unit tests only
pnpm test:int      # integration tests only
pnpm test:e2e      # e2e tests only
pnpm test:cov      # run with coverage report
```

**Database commands:**

```bash
pnpm db:migrate          # run migrations against the development database
pnpm db:migrate:test     # run migrations against the dedicated test database (DATABASE_URL_TEST)
pnpm db:seed             # populate the development database with seed data
```

**What the development seed creates:**

`pnpm db:seed` creates ready-to-use fictional data for local development:

| Entity | What is created |
| --- | --- |
| Admin | 1 platform admin user (`admin@claudinho.dev`) |
| Organizations | 2 fictional organizations (`Loja Alpha` and `Mercado Beta`) |
| Managers | 1 manager per organization (`gestor@alpha.dev` / `gestor@beta.dev`) |
| Operators | 2 operators per organization |
| Categories | 5 categories per organization |
| Products | 20 products per organization, with varied stock levels (some at critical threshold) |
| Movements | 50 stock movements per organization over the last 30 days |

Since login uses magic links there are no passwords. To authenticate locally, the seed also prints an access token for each created user to stdout, ready to use in the `Authorization: Bearer <token>` header.

**`packages/shared`:**

What belongs in `packages/shared`:

- TypeScript types shared between api and web (API response interfaces, role enums, entity types)
- Pure utilities with no framework dependency (formatters, generic validators)
- What does **not** belong: business logic, React components, NestJS modules

The package is referenced by the name defined in `packages/shared/package.json` (`"name": "@claudinho/shared"`). Never use relative paths between workspaces.

```typescript
// correct
import { ProductResponse, Role } from '@claudinho/shared'

// wrong — never use relative paths between workspaces
import { ProductResponse } from '../../packages/shared/src/types'
```

TypeScript resolves the alias automatically via `paths` in each app's `tsconfig.json` — no additional configuration needed after `pnpm install`.

**Troubleshooting:**

- **`docker compose up -d` fails with "port already in use"** — a local process is using port 5432 (PostgreSQL) or 6379 (Redis). Identify it with `lsof -i :5432` and stop the process, or change the ports in `docker-compose.yml` and `.env`

- **`pnpm db:migrate` fails with "connection refused"** — the PostgreSQL container has not finished initializing. Wait a few seconds and retry. Check container status with `docker compose ps`

- **`pnpm install` fails with workspace errors** — verify the pnpm version (`pnpm --version` must be >= 8). Install via `npm install -g pnpm@latest`

- **Integration tests fail with "database does not exist"** — integration tests require a dedicated database. Check that `DATABASE_URL_TEST` is set in `.env` and the database was created (`pnpm db:migrate:test`)

- **Husky is not blocking commits** — run `pnpm prepare` to reinstall Husky hooks after cloning the repository

- **`pnpm dev` starts but the API returns 401 on all routes** — the `JWT_ACCESS_SECRET` in the local `.env` may differ from the secret used when the seed generated the tokens. Regenerate the tokens by running `pnpm db:seed` again

## Architecture

Modular monolith following Clean Architecture with domain-driven module structure. Business logic is isolated from infrastructure details (database, HTTP, queues). Each module follows this structure:

```
src/modules/<domain>/
  domain/           # pure entities and business rules
  application/      # use cases and services
  infrastructure/   # repositories and external integrations
  presentation/     # controllers, DTOs and HTTP validation
```

### Feature development flow

To add a new feature (e.g. create a product), the mandatory inside-out flow is:

1. **`domain/`** — write the entity test, then create the entity with its pure business rules (no Prisma, no NestJS)
2. **`application/`** — write the use case test with a mocked repository, then implement the use case depending only on the repository interface
3. **`infrastructure/`** — write the integration test for the repository against a real database, then implement the `PrismaProductRepository` implementing `IProductRepository`
4. **`presentation/`** — write the e2e test for the controller, then implement the controller with DTO and validation

Never create the controller before the use case. Never create the use case before the entity. The dependency flow is always from inside out.

### Concrete example: `products` module

```
src/modules/products/
  domain/
    product.entity.ts                # Product class with pure business rules
    product.repository.ts            # IProductRepository interface (contract)
  application/
    use-cases/
      create-product.use-case.ts     # depends on IProductRepository, never on Prisma
      update-product.use-case.ts
      delete-product.use-case.ts
      list-products.use-case.ts
  infrastructure/
    prisma-product.repository.ts     # implements IProductRepository using Prisma
  presentation/
    products.controller.ts
    dtos/
      create-product.dto.ts
      update-product.dto.ts
  products.module.ts                 # NestJS module — DI wiring only, no logic
```

### NestJS vs Clean Architecture boundary

NestJS is an opinionated framework that inevitably appears in parts of the code. Explicit rules about what is allowed in each layer:

| Layer | Allowed | Blocked |
| --- | --- | --- |
| `domain/` | nothing from NestJS | any `@nestjs/*` import |
| `application/` | nothing from NestJS | any `@nestjs/*` import |
| `infrastructure/` | `@Injectable()`, `@InjectRepository()` | business logic, domain rules |
| `presentation/` | NestJS decorators (`@Controller`, `@Get`, `@Body`, `@UseGuards`) | business logic, direct database queries |
| `*.module.ts` | anything from NestJS | business logic |

Bootstrapping, configuration modules, structural decorators and DI providers are the only exceptions where NestJS appears outside the presentation layer — they are necessary and expected. Domain and use cases must be testable without instantiating NestJS.

### Database

- **Database:** PostgreSQL
- **ORM:** Prisma with Prisma Migrate for schema and migration management
- **Multi-tenancy:** Row-level tenancy — `organization_id` column present directly in all business tables (denormalized), without relying on joins for tenant resolution
- **Isolation:** RLS (Row Level Security) enabled in PostgreSQL + application-layer enforcement via global guard
- **Audit columns:** Every table has `created_at`, `updated_at` and `deleted_at` by convention
- **Indexes:** Required on `organization_id`, PKs, FKs and frequently filtered columns (`deleted_at`, `created_at`, `status`)
- **Core entities:** `organizations`, `users`, `products`, `categories`, `stock_movements`

#### Soft Delete

Physical deletion is disabled on all entities — records are deactivated via the `deleted_at` column (`null` = active, set = deactivated).

Every query that fetches records must filter `deletedAt: null` by default. Never return deleted records unless explicitly requested (e.g. an audit screen). In Prisma this convention is enforced in the repository layer — the `findAll` method always includes `where: { deletedAt: null }` without the caller needing to remember it.

#### Transactions

Use cases involving multiple write operations use transactions to guarantee atomicity. The transaction is opened in the use case via a method exposed by the repository — the use case never accesses `PrismaClient` directly.

Adopted pattern: the repository exposes a `withTransaction(fn)` method that receives a function and executes all operations within a `prisma.$transaction`. The use case calls this method when atomicity is required:

```typescript
// use case — knows nothing about Prisma, only the interface
await this.productRepository.withTransaction(async (tx) => {
  await tx.createProduct(product)
  await tx.updateCategoryCount(product.categoryId)
})
```

Operations affecting a single table do not need an explicit transaction. Operations affecting multiple tables where a partial failure would result in an inconsistent state are always wrapped in a transaction.

#### Tenant isolation testing

RLS declared in the schema is not sufficient — it must be verified by tests. The integration test suite includes a mandatory tenant isolation test for every repository:

```typescript
// example: prisma-product.repository.spec.ts
it('should not return products from another organization', async () => {
  const orgA = await createOrganization()
  const orgB = await createOrganization()
  await createProduct({ organizationId: orgA.id })

  const results = await repository.findAll({ organizationId: orgB.id })

  expect(results).toHaveLength(0)
})
```

This test runs against a real database in a dedicated test environment (not staging, not production). If RLS or the repository is misconfigured, this test fails explicitly before any deployment.

### Authentication

- **Strategy:** JWT with access token + refresh token
- **Login method:** Magic link — the user requests access via email and receives a short-lived tokenized link (15 min expiry). No passwords, no OAuth in the MVP
- **Token lifetime by role:**
  - `gestor` (manager): access token 15 min · refresh token 8 h
  - `operador` (operator): access token 8 h · refresh token 7 days
- **JWT payload:** carries `user_id`, `organization_id` and `role` — eliminates additional queries for tenant and permission resolution per request
- **Magic link security:** the API response is always identical regardless of whether the email exists or not, preventing user enumeration

#### Magic link retry policy

The email delivery job (BullMQ) is configured as follows:

- **Attempts:** 3 total (1 initial attempt + 2 retries)
- **Backoff:** exponential — 1st retry after 30 s, 2nd retry after 60 s
- **Token expired during retry:** the token is generated and persisted before the job is enqueued. If the email arrives late due to failure and retry, the token is the same one — the 15 min expiry counts from generation, not delivery. If the user clicks an already-expired link, they receive an explicit error instructing them to request a new link
- **After exhausting attempts:** job goes to DLQ. The user does not receive the email and must request a new link. No automatic notification is sent to the user — the absence of the email is the signal
- **One active token per user:** requesting a new magic link invalidates any previous unused token — prevents accumulation of simultaneous valid tokens

#### Refresh token flow

When the access token expires, the front-end calls `POST /api/v1/auth/refresh` with the refresh token. The API validates it, issues a new token pair and invalidates the used refresh token.

- **Mandatory rotation:** refresh tokens are rotated on every use — each call to the refresh endpoint issues a new refresh token and invalidates the previous one. Reusing an already-rotated refresh token is treated as a potential compromise and immediately invalidates the entire user session (cascade revocation)
- **Storage:** the hash of the valid refresh token is stored in Redis with a TTL equal to the token's expiry time. Validation compares the received token against the stored hash — a refresh token absent from Redis means the session has expired or been revoked
- **Explicit revocation:** logout revokes the refresh token immediately by removing the Redis entry — the access token remains valid until it expires naturally (no access token denylist in the MVP)

### Authorization

- **Model:** RBAC (Role-Based Access Control)
- **Roles:**
  - `admin` — full platform access, creates managers, accesses all organizations for support and maintenance
  - `gestor` (manager) — full access within their own organization: products, categories, movements, dashboard and operator management
  - `operador` (operator) — product, category and movement registration. No dashboard access, no user management
- **User creation:** admin creates managers · manager creates and manages operators within their own organization
- **NestJS implementation:** two layered guards:
  1. **Role guard** — checks if the user's role has access to the endpoint (`@Roles('gestor', 'admin')`)
  2. **Tenant isolation guard** — global guard that validates whether the accessed resource belongs to the `organization_id` in the token

#### Public routes and the tenant isolation guard

The tenant isolation guard is global — it runs on all requests by default. Routes that do not require authentication must be explicitly marked with the `@Public()` decorator, which signals the guard to skip tenant validation.

Public routes in the MVP:

| Route | Reason |
| --- | --- |
| `POST /api/v1/auth/magic-link` | magic link request — no authenticated user |
| `GET /api/v1/auth/magic-link/callback` | authentication callback — no JWT yet |
| `GET /api/v1/health` | infrastructure health check — no authentication required |

Any new route that needs to be public must be added to this list and go through a security review before merging — routes incorrectly marked as public are a data exposure vector.

#### Admin role and RLS

`admin` is the only role that accesses data across multiple organizations. This creates a tension with RLS, which filters by `organization_id`.

**Adopted solution:** the admin's JWT does not carry `organization_id`. The tenant isolation guard detects `role === 'admin'` and skips tenant validation — the admin is not bound to any specific organization. In PostgreSQL's RLS, the policy is configured to allow unrestricted access when the session variable `app.role` is `admin`.

**Security consequence:** endpoints that return data for a specific organization must explicitly require an `:organizationId` parameter in the route when called by the admin, instead of inferring it from the token. The role guard ensures only the admin reaches these endpoints — but isolating which organization is being accessed is the controller's responsibility, not the guard's.

**Auditing:** every admin action on data of a specific organization is logged with `user_id`, accessed `organization_id` and operation payload — mandatory traceability for the support role.

### File Storage

- **Provider:** AWS S3
- **Use cases in the MVP:**
  - Bulk product import via CSV/Excel
  - Report export in CSV
- **Processing:** both flows are asynchronous — the file is received or generated in the background without blocking the request
- **Retention:** temporary import files do not need to persist after processing

#### Import file validation

All validation happens before enqueuing the processing job — early rejection, no queue consumption:

| Rule | Value |
| --- | --- |
| Maximum size | 5 MB |
| Accepted MIME types | `text/csv`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` (xlsx), `application/vnd.ms-excel` (xls) |
| Accepted extensions | `.csv`, `.xlsx`, `.xls` |
| Encoding (CSV) | UTF-8 required |

Files that fail validation return `422 Unprocessable Entity` with a specific error code (`INVALID_FILE_TYPE`, `FILE_TOO_LARGE`) before any upload to S3.

**Per-line errors during processing:**

The job validates each line individually. Invalid lines do not block the processing of the remaining lines — the job continues and at the end generates an error report with: number of successfully processed lines, number of lines with errors and error description per line. The report is returned to the user via the job status endpoint (`GET /api/v1/imports/:jobId/status`).

### Background Jobs

- **Engine:** BullMQ with Redis as broker
- **Integration:** `@nestjs/bullmq` (official BullMQ package for NestJS — not to be confused with `@nestjs/bull`, which is the legacy package for the `bull` library)
- **Jobs in the MVP:**
  - Magic link email delivery
  - CSV/Excel import processing (validates, transforms and persists data)
  - Report generation and upload to S3
- **Default behavior:** automatic retry on failure, priority-configurable queue per job

#### DLQ reprocessing flow

1. Job fails and exhausts all configured retry attempts
2. Job is automatically moved to the Dead Letter Queue via BullMQ
3. Alert is triggered via Grafana
4. Dev or admin inspects the job in Bull Board — payload, error and attempt count are visible
5. Root cause is identified and fixed if necessary
6. Job is manually reprocessed via Bull Board or a dedicated script
7. Reprocessing is monitored via CloudWatch logs

### Cache

- **Engine:** Redis (same instance used by BullMQ)
- **Use cases in the MVP:**
  - Dashboard indicators cache — avoids recalculating heavy aggregates on every SSE connection
  - Refresh token session cache — stores the valid refresh token hash per user
- **Default TTL:** 60 seconds for dashboard data · equal to refresh token expiry for sessions
- **Invalidation:** the dashboard indicators cache is invalidated whenever a stock movement is recorded — via an internal event dispatched in the use case after persistence
- **Key convention:** `{context}:{organizationId}:{identifier}` — e.g. `dashboard:indicators:org_123`, `session:refresh:user_456`
- **What not to cache:** transactional write data, import payloads, any data that is not tolerant of slightly stale reads

### Real-time

- **Strategy:** SSE (Server-Sent Events) for dashboard updates
- **Motivation:** persistent unidirectional connection (server → client) — the front-end receives updates without polling, without page refresh, without request flooding
- **Scope in the MVP:** stock health check dashboard indicators update
- **Pending decision:** WebSocket and dedicated messaging (RabbitMQ/Kafka) are not part of the MVP — may be reconsidered if there is a need for communication between decoupled modules in future phases

#### SSE with multiple ECS instances

SSE establishes a persistent connection between the client and a specific server instance. With multiple ECS tasks running in parallel, an event emitted on instance A does not reach the client connected to instance B.

**Adopted solution:** pub/sub via Redis. When a movement is recorded, the use case publishes an event to the Redis channel `sse:dashboard:{organizationId}`. All ECS instances are subscribed to this channel — any instance receives the event and pushes it to the SSE clients connected to it.

**Operational consequence:** Redis becomes an availability dependency for dashboard real-time updates. If Redis goes down, SSE stops propagating updates but the API continues to work normally — the front-end should display the dashboard with the last valid state.

#### SSE event contract

Every SSE event follows this envelope:

```json
{
  "event": "dashboard.updated",
  "version": 1,
  "data": {
    "totalActiveProducts": 42,
    "criticalStockProducts": 5,
    "todayMovements": 18,
    "staleProducts": 3
  }
}
```

- `event` — dot-namespaced event name (`dashboard.updated`). The front-end uses this field to route to the correct handler
- `version` — contract version for the payload. Incremented when the shape of `data` changes in a breaking way. The front-end must check `version` before processing and silently ignore unknown versions
- New fields in `data` are additive and do not increment `version` — the front-end must be tolerant of extra fields

#### Reconnection and missed events

SSE has native reconnection support via the `id` field and the `Last-Event-ID` header. Adopted behavior:

- **Automatic reconnect:** the browser reconnects automatically when the SSE connection drops. The front-end does not need to implement manual retry logic
- **`id` field on events:** every SSE event carries an incremental `id` per organization. When the client reconnects, it sends the `Last-Event-ID` header with the last received id
- **Missed events recovery:** the server does not replay events missed during the disconnection — on reconnect, the server immediately emits the full current dashboard state (snapshot), ensuring the front-end displays up-to-date data regardless of how many events were missed
- **Connection timeout:** SSE connections idle for more than 30 seconds receive a `ping` event to keep the connection alive and prevent proxies and load balancers from closing it due to inactivity

## Domain / Business Rules

Business rules that are not immediately obvious from reading the code.

### Products

- Every product must belong to a category — category is required
- Each product has a minimum stock threshold set by the manager, per product
- A deactivated product (soft deleted) does not appear in any listing or on the dashboard

### Stock Movements

- **Inflow** — increases the available quantity of the product
- **Outflow** — decreases the available quantity of the product
- Outflow is blocked if the requested quantity exceeds the available quantity — negative stock is not allowed

#### Concurrency control for simultaneous outflows

Application-layer stock validation is not sufficient in concurrent scenarios — two simultaneous outflows can both read the same available balance, pass validation independently, and result in negative stock after both write.

**Adopted solution:** `SELECT ... FOR UPDATE` via Prisma raw query when reading the product balance before an outflow. The row-level lock in PostgreSQL ensures the second outflow can only read the updated balance after the first transaction commits — serializing balance access per product.

```typescript
// in the repository, inside a transaction
await prisma.$queryRaw`
  SELECT quantity FROM products WHERE id = ${productId} FOR UPDATE
`
// from here, no other transaction can read or update quantity for this product until commit
```

The lock is held only for the duration of the outflow transaction — acceptable performance impact for the expected volume in the MVP. The transaction involves: product lock, balance validation, movement creation and balance update — atomic and serialized per product.

### Dashboard

The dashboard displays a centralized stock health check with the following indicators:

- Total active products
- Products with critical stock (available quantity below the defined minimum)
- Today's movements
- Products with no movement in the last X days

### Organizations

- An organization can have multiple managers
- No limit on operators per organization
- The first manager of an organization is created by the platform admin

## API Design

**Versioning:** all routes are prefixed with `/api/v1/`. New versions (`v2`, `v3`) are introduced without removing previous ones — no breaking changes.

**Language:** all code is written in English without exception — route names, variables, functions, classes, database columns. The only exception is user-facing error messages, which are in Portuguese (PT-BR).

**Response envelope:**

```json
{
  "data": {},
  "meta": {
    "cursor": "xxx",
    "hasNextPage": true
  }
}
```

**Error envelope:**

```json
{
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Produto não encontrado"
  }
}
```

- `code` — error identifier in uppercase snake_case English. Used by the front-end for conditional logic
- `message` — human-readable message in PT-BR. Displayed directly to the user

**Pagination:** cursor-based on all listing endpoints. No offset/limit support.

- **Cursor field:** composed of `(createdAt, id)` — `createdAt` for chronological ordering, `id` (UUID) as tiebreaker to guarantee uniqueness when multiple records share the same `createdAt`. The cursor is base64-encoded before being exposed in the response
- **Required index:** every paginated listing endpoint requires a composite index on `(organization_id, created_at, id)` on the corresponding table
- **Default ordering:** descending by `createdAt` — most recent records first. Endpoints that need a different ordering must explicitly document the alternative cursor field and corresponding index

**Version lifecycle:**

- New versions (`v2`, `v3`) are introduced only when there is a breaking change — incompatible shape change, field removal or semantic alteration
- Old versions are maintained for a minimum of **6 months** after the replacement version is released (sunset period)
- The sunset is communicated via the `Sunset: <ISO 8601 date>` header in responses from the deprecated version and documented in the CHANGELOG
- The decision to create a new version belongs to the tech lead and must be recorded as an ADR

## Coding Conventions

All code in the project follows SOLID principles and is mandatorily covered by tests before it exists. The development cycle is Red-Green-Refactor without exceptions.

### SOLID

The five principles applied to the project's context:

- **S — Single Responsibility:** each use case does one thing. `CreateProductUseCase`, `UpdateProductUseCase` and `DeleteProductUseCase` are separate classes, never a single `ProductUseCase` that aggregates everything
- **O — Open/Closed:** new behaviors are added via extension, not modification. E.g. a new export report type does not alter existing use cases
- **L — Liskov Substitution:** any repository or service implementation fully respects the contract of the interface defined in the domain. E.g. `PrismaProductRepository` implements `IProductRepository` without surprises
- **I — Interface Segregation:** interfaces are small and specific. `IProductRepository` does not force the implementation of irrelevant methods for the context that consumes it
- **D — Dependency Inversion:** use cases and entities always depend on abstractions, never on concrete implementations. E.g. the use case receives `IProductRepository` via dependency injection, never instantiates `PrismaProductRepository` directly

### TDD — Red-Green-Refactor

The mandatory flow for any implementation is:

1. **Red** — write the test describing the expected behavior. The test must fail because the implementation does not exist
2. **Green** — write the minimum implementation needed to make the test pass
3. **Refactor** — clean up and improve the code without breaking the test

No implementation can exist without a corresponding test. The only exceptions are native framework artifacts: bootstrapping, module configuration, structural decorators.

### Test Frameworks

- **Back-end:** Jest
- **Front-end:** Vitest + React Testing Library

### Coverage by Layer

- **Unit tests** — `domain` and `application` layers: entities, business rules and use cases fully isolated via mocks and stubs
- **Integration tests** — `infrastructure` layer: repositories tested against a real database in an isolated dedicated environment
- **E2E tests** — `presentation` layer: full request/response flow of the controllers

No minimum coverage percentage is defined. The rule is: every implementation has a test. Coverage is a consequence, not a target.

### Test Structure

Each app has a dedicated `test/` folder mirroring the `src/` structure. Tests are not co-located with source code.

```
apps/api/
  src/
    modules/
      products/
        domain/
        application/
        infrastructure/
        presentation/
  test/
    unit/
      products/
        domain/
          product.entity.spec.ts
        application/
          create-product.use-case.spec.ts
    integration/
      products/
        prisma-product.repository.spec.ts
    e2e/
      products/
        products.controller.spec.ts

apps/web/
  src/
    components/
    pages/
  test/
    unit/
      components/
        ProductForm.spec.tsx
    e2e/
      pages/
        Dashboard.spec.tsx
```

**Conventions:**

- Subfolders by type: `unit/`, `integration/`, `e2e/`
- `.spec.ts` / `.spec.tsx` suffix on all test files
- Test filename mirrors the file under test — `create-product.use-case.ts` → `create-product.use-case.spec.ts`
- `test/` internal structure mirrors `src/` structure

### Mocks and Isolation

The entire test suite runs in full isolation. No test may touch real production or staging infrastructure. The following dependencies are **always mocked**, except in integration tests running in a dedicated environment:

- **Prisma** — never accesses a real database outside of integration tests
- **AWS S3** — always mocked, no access to real buckets
- **BullMQ** — always mocked, no real enqueuing
- **Email service** — always mocked, no real email delivery
- **SSE** — always mocked

This rule exists to prevent production overload, data poisoning and accidental drops caused by the test suite.

### Linting and Formatting

- **ESLint** — each app has its own config inheriting from a base config in the monorepo root
- **Prettier** — formatting integrated with ESLint via `eslint-config-prettier` to avoid conflicts
- **Commit gate:** lint and format run automatically in the `pre-commit` hook via Husky — commits that do not pass lint are blocked
- No exceptions — the codebase has consistent formatting regardless of who wrote it

### Migrations

- **Naming:** descriptive names required — `create_products_table`, `add_status_to_stock_movements`
- **Default columns:** every table is born with `created_at`, `updated_at`, `deleted_at` and `organization_id` (business tables)
- **Required indexes:** `organization_id`, PKs, FKs and frequently filtered columns
- **Seed:** split in two — development seed (fictional data) and production seed (required data such as the first admin)
- **Destructive changes:** follow a two-step deprecation flow — migration 1 makes the column nullable/unused, migration 2 (after a confirmed subsequent deploy) actually removes it
- **Rollback:** required for additive migrations · unnecessary for destructive ones (covered by deprecation) · not applicable for data migrations (intentionally irreversible)

#### Migrations and zero-downtime deploy

ECS performs rolling updates — during a deployment, the old and new versions run simultaneously for a period. This means the database must be compatible with **both** versions of the code at the same time.

**Rule:** every migration going to production must be backward-compatible with the previous version of the code.

| Operation | Safe? | Reason |
| --- | --- | --- |
| Add nullable column | Yes | old code ignores the new column |
| Add NOT NULL column without default | No | old code does not send the value |
| Rename column | No | old code references the old name |
| Drop column | No | old code still reads the column |
| Add index (CONCURRENTLY) | Yes | does not block reads/writes |
| Change column type | Depends | evaluated case by case |

The two-step deprecation flow already covers unsafe cases — migration 1 (which runs alongside the new code) must always be backward-compatible. Migration 2 (actual removal) only runs after confirming that zero tasks from the old version are still active.

### Jobs

- **Single Responsibility:** each job does one thing — facilitates debugging, reprocessing and maintenance
- **Idempotency:** every job must be idempotent by convention — running the same job N times produces the same result, with no duplicate side effects. Critical for retry scenarios
- **Retry:** automatic via BullMQ with a configurable maximum number of attempts per job
- **Dead letter queue:** a job that exhausts all attempts goes to a failure queue (DLQ) — it is not silently discarded
- **Failure logging:** every job failure is logged with enough context for debugging (job name, payload, attempt, error)
- **Alerts:** DLQ failures trigger an alert — allows monitoring and anticipating abnormal behavior before it becomes an incident

### Security

The project adopts the **secure by design** principle — security is a requirement from the start of development, not a layer added afterward. The approach is **shift left**: the earlier a security problem is identified, the lower the cost to fix.

**OWASP Top 10 + CISA KEV**

Every implementation is reviewed against the OWASP Top 10 and the CISA KEV (Known Exploited Vulnerabilities) before going to production. These lists form a mandatory checklist on every PR — the goal is to eliminate pentest quick wins that are fast to exploit and costly to fix.

**AST — Application Security Testing**

- **SAST (Static Analysis):** Semgrep with OWASP ruleset — analyzes static code for vulnerabilities. Runs in pre-commit hook and CI pipeline
- **DAST (Dynamic Analysis):** OWASP ZAP — analyzes the running application. Runs in pipeline pointing to the staging environment
- **IAST (Instrumented Analysis):** Contrast Security with Node agent — analyzes at instrumented runtime during test suite execution

**Secrets**

- TruffleHog — scans the git history for exposed secrets
- Semgrep — detects secret patterns in code
- Both run in pre-commit hook and CI pipeline
- Zero hardcoding in any environment — secrets, URLs, keys and any sensitive configuration live exclusively in environment variables, no exceptions

**Rate Limiting**

Applied globally on the API with stricter rules on sensitive endpoints — mitigates abuse, brute force and DDoS attempts. Implemented via `@nestjs/throttler`.

| Endpoint | Limit | Window |
| --- | --- | --- |
| Global (all routes) | 100 requests | 1 minute per IP |
| `POST /api/v1/auth/magic-link` | 5 requests | 15 minutes per IP |
| `GET /api/v1/auth/magic-link/callback` | 10 requests | 15 minutes per IP |

When the limit is exceeded, the API returns `429 Too Many Requests` with the standard error envelope (`code: RATE_LIMIT_EXCEEDED`).

**CORS**

Explicit whitelist of allowed origins — official domain in production, localhost in development. Any origin outside the whitelist is blocked by default.

**HTTP Headers**

Helmet enabled via NestJS native integration — sets security headers on all responses.

**Input Validation**

- All input is validated via DTOs with `class-validator` before reaching the use case
- Never trust any user input regardless of the source
- Always whitelist what is accepted — never blacklist what is rejected
- This rule applies to HTTP inputs, import files, query parameters and headers

### Environment Variables

- **Startup validation:** `@nestjs/config` + `zod` — the application will not start if any required variable is absent or has an invalid format. Fail fast and explicit
- **Development:** local `.env`, never committed. `.env.example` committed with all variables without values as a reference
- **Production:** AWS Secrets Manager

| Variable | Description |
| --- | --- |
| `NODE_ENV` | Current environment (`development`, `staging`, `production`) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DATABASE_URL_TEST` | Connection string for the dedicated integration test database |
| `JWT_ACCESS_SECRET` | Access token secret |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `REDIS_URL` | Redis connection string (BullMQ) |
| `AWS_ACCESS_KEY_ID` | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key |
| `AWS_S3_BUCKET` | S3 bucket name |
| `AWS_REGION` | AWS region |
| `RESEND_API_KEY` | Resend API key |
| `SENTRY_DSN` | Sentry DSN for error tracking (back-end and front-end) |
| `CORS_ORIGINS` | Allowed origins (comma-separated) |

### Commits

All commits follow the **Conventional Commits** standard with a mandatory scope. The tooling ecosystem ensures consistency and traceability:

- **Commitizen** — interactive CLI that guides writing the commit message
- **Commitlint** — validates the message in the `commit-msg` hook and rejects any non-conforming message

**Format:**

```
type(scope): short description

feat(products): add create product use case
fix(auth): handle expired magic link token
test(stock-movements): add unit tests for create movement use case
```

**Allowed types:**

| Type | Usage |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `test` | Adding or fixing tests |
| `refactor` | Refactoring without behavior change |
| `perf` | Performance improvement |
| `chore` | Maintenance, dependencies, configuration |
| `ci` | CI pipeline and configuration changes |
| `docs` | Documentation |
| `style` | Formatting, no logic change |

#### Atomic Commits

An atomic commit has a single clear purpose and can be described without using "and":

**Correct — atomic:**

```
feat(products): add create product use case
test(products): add unit tests for create product use case
refactor(products): extract product validation to domain entity
```

**Incorrect — not atomic:**

```
feat(products): add create product use case, fix bug in auth guard and update dependencies
```

**Practical rule:** if the commit message needs "and" to describe what was done, the commit should be split into smaller commits.

## Deployment & Infrastructure

- **Cloud:** AWS
- **Containers:** ECS (Elastic Container Service)
- **Environments:** `development` (local) · `staging` · `production`
- **CI/CD:** GitHub Actions
- **Branching:**
  - `main` — production, protected, merge only via approved PR
  - `staging` — staging, merge via PR before promoting to main
  - working branches follow Conventional Commits types: `feat/*`, `fix/*`, `chore/*`, `refactor/*`, etc.

**CI/CD Pipeline:**

- **Push to any working branch** — lint, tests (Jest/Vitest) with IAST instrumented (Contrast Security), SAST (Semgrep), secrets check (TruffleHog)
- **Merge to `staging`** — everything above + DAST (OWASP ZAP) pointing to staging + deploy to staging
- **Merge to `main`** — everything above + deploy to production

### Disaster Recovery

**Database backup:**

- **Strategy:** automatic snapshots via RDS (if PostgreSQL on RDS) or pg_dump scheduled via ECS task if PostgreSQL in a container
- **Frequency:** daily snapshot with 7-day retention in production
- **RPO (Recovery Point Objective):** up to 24 h of data loss acceptable in the MVP — daily backup is sufficient for the current stage
- **RTO (Recovery Time Objective):** manual restoration expected within 2 h — no failover automation in the MVP

**Failure during CSV import processing:**

If an ECS task goes down during import job processing, the job is automatically retried via BullMQ retry — the job is idempotent by convention, so reprocessing from the start does not generate duplicates. The original file remains in S3 until processing is confirmed complete.

**Redis failure:**

- BullMQ stops processing jobs — jobs in progress at the time of failure may be lost if not acknowledged before the crash
- SSE stops propagating dashboard updates — the front-end displays static data from the last valid state
- The API continues to work normally for all operations that do not depend on queues or real-time
- **Mitigation:** Redis on ElastiCache with Multi-AZ enabled in production — automatic failover to replica if the primary instance fails

**Deploy rollback:**

Deployments on ECS are rolling updates — the previous version keeps running until the new one is validated. If a failure is detected in the pipeline or via a post-deploy alert, rollback is performed by redirecting the ECS service to the previous version's task definition via GitHub Actions (a manual rollback workflow triggered by the team).

## Observability

**Logs:**

- **Pino** — structured JSON logs in NestJS
- **CloudWatch Logs** — log storage and search on AWS

**Error tracking:**

- **Sentry** — captures runtime exceptions in back-end and front-end, groups errors, stack traces with context. SDKs for NestJS and React

**Metrics:**

- **Prometheus** — collects application metrics exposed via the `/metrics` endpoint in NestJS via `@willsoto/nestjs-prometheus`
- **Grafana** — visualization and custom dashboards on top of Prometheus metrics
- **CloudWatch Metrics + Alarms** — infrastructure metrics (CPU, memory, ECS tasks) and infrastructure alerts

**`/metrics` endpoint protection:** the endpoint is not publicly accessible — it is blocked at the load balancer level (ALB security group) for access only from within the internal network (VPC). Prometheus scrapes are performed internally. Never expose `/metrics` to the internet — the payload contains information about internal infrastructure.

**Required application metrics:**

- Response time per endpoint
- Error rate per route
- Request throughput
- Jobs processed per minute
- BullMQ queue sizes

**Alert thresholds:**

| Alert | Threshold |
| --- | --- |
| Error rate per route | > 5% in a 5-minute window |
| Response time | p95 > 2 s in a 5-minute window |
| Jobs in DLQ | any job in the DLQ |
| BullMQ queue stalled | > 50 pending jobs for more than 10 minutes |
| ECS CPU | > 80% for more than 5 minutes |

## Architecture Decision Records

Record of the main architectural decisions in the project, with context, options considered and rationale for the choice.

---

### ADR-001 — Modular monolith vs microservices

**Status:** Accepted

**Context:** The system needs to be built for small businesses with a lean team. The choice of service topology directly impacts operational complexity, development speed and infrastructure cost.

**Options considered:**

- Microservices — full isolation between domains, granular scalability, but high operational complexity and communication overhead between services
- Modular monolith — well-defined domain boundaries within a single process, without the network and orchestration complexity of microservices

**Decision:** Modular monolith. For the current product stage and small-business scale, the complexity of microservices is not justified. Domain boundaries are preserved by the modular structure — a future migration to microservices is feasible without a full rewrite.

**Consequences:** Simplified deployment, more straightforward observability, faster development. Granular per-service scalability is not available — the system scales as a unit.

---

### ADR-002 — Clean Architecture as the architectural pattern

**Status:** Accepted

**Context:** The project needs an architecture that isolates business logic from infrastructure details, facilitates testing and is familiar enough for new developers.

**Options considered:**

- Clean Architecture — concentric layers with explicit dependency flow from outside in
- Hexagonal (Ports & Adapters) — focused on substitutability via ports and adapters, more explicit contract terminology but more ceremonious

**Decision:** Clean Architecture. NestJS naturally nudges toward a structure compatible with Clean Architecture via dependency injection and modules. Pure Hexagonal adds ceremony that makes more sense in systems with many external integrations — the MVP has none.

**Consequences:** Each module follows the `domain → application → infrastructure → presentation` structure. Isolated and testable use cases. Dependency inversion via interfaces guarantees the domain layer never knows about infrastructure details.

---

### ADR-003 — Row-level tenancy vs schema-per-tenant

**Status:** Accepted

**Context:** The system is multi-tenant — multiple organizations share the same infrastructure. Data isolation between tenants is a critical security requirement.

**Options considered:**

- Schema-per-tenant — each customer has their own schema in PostgreSQL. Strong isolation but migrations become a nightmare with many tenants
- Row-level tenancy — all data in the same table with an `organization_id` column. Simpler to operate, normal migrations, isolation via RLS

**Decision:** Row-level tenancy with `organization_id` denormalized directly in all business tables, combined with PostgreSQL RLS and application-layer enforcement. This is the pattern adopted by products like Linear and Notion.

**Consequences:** Simplified operations, single migrations for all tenants. The risk of data leakage between tenants is mitigated by two independent layers: RLS in the database and the tenant isolation guard in the application.

---

### ADR-004 — Magic link vs email/password vs OAuth

**Status:** Accepted

**Context:** The target audience is Brazilian small businesses. The authentication method must be secure, low-friction and appropriate for the user profile.

**Options considered:**

- Email + password — familiar but creates password management, recovery and security problems
- OAuth (Google, GitHub) — convenient but some users do not trust or do not have accounts with the providers
- Magic link — eliminates passwords entirely, tokenized link sent by email with short expiry

**Decision:** Magic link. Eliminates the friction of password management, does not depend on external providers and is appropriate for the user profile. OAuth can be added in a later phase without impact on the current architecture.

**Consequences:** No password storage in the database. Dependency on the email service (Resend) for authentication — email unavailability blocks login. The magic link request endpoint is a priority target for rate limiting.

---

### ADR-005 — SSE vs WebSocket vs polling for real-time

**Status:** Accepted

**Context:** The dashboard needs to display up-to-date stock data without requiring manual page refresh.

**Options considered:**

- Polling — front-end queries the back-end every X seconds. Simple but generates request flooding
- WebSocket — bidirectional, unnecessary overhead for a unidirectional use case (server → client)
- SSE (Server-Sent Events) — persistent unidirectional connection, the server pushes updates when there is a change

**Decision:** SSE. It is the right balance between simplicity and experience — no polling, no flooding, none of the complexity of WebSocket for a strictly unidirectional use case. Native support in NestJS.

**Consequences:** Real-time dashboard updates without user intervention. In a multi-instance ECS environment, SSE alone does not propagate events between instances — the adopted solution is pub/sub via Redis: events are published to a Redis channel and all instances receive them, pushing to their connected clients. This makes Redis an availability dependency for real-time updates. WebSocket and dedicated messaging can be reconsidered if bidirectional communication or inter-module communication becomes necessary.

---

### ADR-006 — BullMQ vs dedicated messaging (Kafka/RabbitMQ)

**Status:** Accepted

**Context:** The system has asynchronous processing (magic link, CSV import, report export). A reliable queue solution with retry and monitoring is required.

**Options considered:**

- Kafka — high throughput, ideal for event streaming between multiple services, but complex to operate
- RabbitMQ — traditional messaging, simpler than Kafka, makes sense for inter-service communication
- BullMQ — queue library on top of Redis, native NestJS integration via `@nestjs/bullmq`

**Decision:** BullMQ. The project has no multiple services that need to communicate — jobs are internal to the monolith. BullMQ solves MVP use cases with minimal operational complexity. Redis is already in the stack for other purposes.

**Consequences:** Automatic retry, DLQ and monitoring via Bull Board available. Kafka or RabbitMQ can be introduced if the system evolves to microservices or requires event streaming.

---

### ADR-007 — Cursor-based pagination vs offset/limit

**Status:** Accepted

**Context:** All listing endpoints need pagination. The choice impacts performance and data consistency in large lists.

**Options considered:**

- Offset/limit — simple to implement and familiar, but degrades in performance at high offsets and may return duplicate or skip records in lists that change during navigation
- Cursor-based — uses a pointer to the current position, constant performance regardless of page, consistent data even with concurrent inserts/deletes

**Decision:** Cursor-based pagination. For an inventory system with frequent movements, offset/limit can cause inconsistencies visible to the user. Cursor-based is the standard of modern products and solves the problem correctly.

**Consequences:** Slightly more complex back-end implementation. Front-end cannot navigate to an arbitrary page — only previous/next. Listing performance is constant regardless of data volume.

---

### ADR-008 — Monorepo vs separate repositories

**Status:** Accepted

**Context:** The project has two apps (api and web) and shared packages. Repository organization impacts DX, versioning and code sharing.

**Options considered:**

- Separate repositories — full isolation between apps, but version synchronization overhead and configuration duplication
- Monorepo with pnpm workspaces — apps and shared packages in the same repository, unified scripts, a single `git clone`

**Decision:** Monorepo with pnpm workspaces. For a modular monolith with intimately related front and back, monorepo offers superior DX — types shared between api and web, centralized lint/test configurations, unified versioning.

**Consequences:** A single repository to clone, configure and version. pnpm workspaces manages each app's dependencies efficiently. ESLint, Prettier, Jest and Husky configurations are defined once at the root and inherited by the apps.

---

### ADR-009 — Resend vs SES vs SendGrid as email provider

**Status:** Accepted

**Context:** Magic link is the only authentication method in the system — the email provider is a critical dependency. Email service unavailability blocks login for all users. The choice impacts reliability, DX, cost and operational complexity.

**Options considered:**

- **AWS SES** — native AWS provider, very low cost at volume, but requires domain configuration, reputation warmup and is out of sandbox by default only after manual AWS approval. Higher setup cost for an MVP
- **SendGrid** — established provider with high deliverability, robust SDK, but pricing rises quickly with volume and the management interface is more complex than necessary for the MVP
- **Resend** — modern developer-focused provider, official Node.js SDK, setup in minutes, reliable deliverability, predictable pricing and generous free tier for the MVP

**Decision:** Resend. For the MVP stage with low email volume (magic links only), Resend offers the best balance between integration simplicity, setup time and cost. The dependency is encapsulated behind an interface (`IEmailService`) — switching to SES or SendGrid does not require changes to use cases, only to the infrastructure implementation.

**Consequences:** Fast integration with official SDK. If Resend has downtime, login is blocked for all users — no provider fallback in the MVP. The `IEmailService` interface ensures migration to SES (preferable in scaled production for cost and reliability within the AWS ecosystem) is surgical and does not affect the application layer.

## Pre-Commit Checklist

As much as possible is automated via **Husky** — developers only need to worry about what cannot be automated.

### Automated via Husky

Runs automatically on every commit without developer intervention:

- **Commitlint** — validates that the message follows the Conventional Commits standard with scope
- **ESLint / Prettier** — lint and formatting, blocks commit if it does not pass
- **Semgrep** — SAST on the changed code, blocks commit if a vulnerability is found
- **TruffleHog** — scans secrets in code and history, blocks commit if exposure is found
- **Jest / Vitest** — runs tests affected by the changes
- **`.env.example` validation** — checks that any new environment variable has been documented

### Manual (what cannot be automated)

- [ ] New implementation has a corresponding test written and passing
- [ ] No hardcoded values that should be environment variables
- [ ] Migration follows conventions: descriptive name, standard columns present, required indexes
- [ ] Destructive changes follow the two-step deprecation flow

### PR Checklist

Mandatory review before merging:

- [ ] PR description filled in explaining what was done and why
- [ ] Reviewer assigned
- [ ] OWASP Top 10 reviewed for the context of the change
- [ ] CISA KEV checked if the change involves dependency updates
- [ ] DAST (OWASP ZAP) run if the change affects endpoints
- [ ] No tests ignored, skipped or commented out
- [ ] New environment variables documented in `.env.example` and communicated to the team

## Glossary

| Term | Definition |
| --- | --- |
| **Tenant** | A registered organization in the system. Each tenant accesses exclusively its own data |
| **organization_id** | Column present in all business tables that identifies which tenant a record belongs to |
| **RLS** | Row Level Security — PostgreSQL feature that restricts which rows a user can access directly in the database |
| **Soft delete** | Logical deletion strategy — records are not physically removed, only marked as deleted via the `deleted_at` column |
| **Magic link** | Passwordless authentication method — the user receives a tokenized link by email that authenticates them when accessed |
| **JWT** | JSON Web Token — signed token carrying user information (user_id, organization_id, role) used to authenticate requests |
| **RBAC** | Role-Based Access Control — authorization model where permissions are defined by role (admin, manager, operator) |
| **DLQ** | Dead Letter Queue — queue of jobs that failed and exhausted all retry attempts. Jobs in the DLQ are not discarded and can be reprocessed |
| **SSE** | Server-Sent Events — unidirectional communication protocol where the server pushes updates to the client via a persistent HTTP connection |
| **SAST** | Static Application Security Testing — security analysis of source code without executing the application |
| **DAST** | Dynamic Application Security Testing — security analysis of the running application, simulating external attacks |
| **IAST** | Instrumented Application Security Testing — security analysis at instrumented runtime during test suite execution |
| **ADR** | Architecture Decision Record — document that records an architectural decision with context, options considered and rationale |
| **Cursor-based pagination** | Pagination strategy that uses a pointer (cursor) to the current position instead of a numeric offset, guaranteeing consistency and constant performance |
| **Health check** | In the dashboard context, a set of indicators showing the overall state of the stock (critical products, today's movements, stalled products) |
| **Inflow** | Stock movement that increases the available quantity of a product |
| **Outflow** | Stock movement that decreases the available quantity of a product. Blocked if the requested quantity exceeds the available quantity |
| **Manager** (gestor) | User role with full access within their own organization — manages products, movements, the dashboard and operators |
| **Operator** (operador) | User role with operational access — registers products, categories and records movements. No dashboard access |
| **Admin** | Platform role with full system access — creates managers and accesses all organizations for support and maintenance |
