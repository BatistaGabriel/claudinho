# Technology Stack

**Analysis Date:** 2026-03-22

## Languages

**Primary:**

- TypeScript 5.4.0 - Full monorepo, enforced strict mode
- JavaScript - Configuration files (eslint, prettier, etc)

**Secondary:**

- SQL - PostgreSQL database
- YAML - Docker Compose, pnpm workspace config

## Runtime

**Environment:**

- Node.js 20+ (enforced in `package.json` engines)
- Specified in `.nvmrc` as version 24

**Package Manager:**

- pnpm 8+ (enforced in `package.json` engines)
- Lockfile: `pnpm-lock.yaml` (present)
- Workspace config: `pnpm-workspace.yaml` manages apps and packages

## Frameworks

**Backend (API):**

- NestJS 10.0.0 - Main REST API framework
  - @nestjs/core, @nestjs/common, @nestjs/platform-express
  - Plugins: @nestjs/config, @nestjs/jwt, @nestjs/passport, @nestjs/throttler, @nestjs/bullmq, @nestjs/event-emitter, @nestjs/terminus, @nestjs/swagger

**Frontend (Web):**

- React 18.2.0 - UI framework
- React Router 6.22.0 - Client-side routing
- Vite 5.1.0 - Build tool and dev server

**Testing:**

- Backend: Jest 29.5.0 (ts-jest transformer)
- Frontend: Vitest 1.3.0 with jsdom environment
- Testing utilities: @testing-library/react, @testing-library/jest-dom, @testing-library/user-event

**Build/Dev:**

- @vitejs/plugin-react 4.2.0 - React plugin for Vite

## Key Dependencies

**Critical (Backend):**

- @prisma/client 5.0.0 - ORM for PostgreSQL
- prisma 5.0.0 - Prisma CLI for migrations (devDependency)
- ioredis 5.3.0 - Redis client for caching and session management
- bullmq 5.0.0 - Job queue for async tasks (email queue)
- @nestjs/bullmq 10.0.0 - NestJS integration for BullMQ
- helmet 7.0.0 - Security headers middleware
- reflect-metadata 0.1.13 - Required for NestJS decorators
- rxjs 7.8.0 - Reactive programming (NestJS dependency)

**Authentication & Validation (Backend):**

- passport 0.7.0 - Authentication middleware
- passport-jwt 4.0.0 - JWT strategy for Passport
- @nestjs/jwt 10.0.0 - JWT module for NestJS
- @nestjs/passport 10.0.0 - Passport integration
- zod 3.22.0 - Schema validation
- class-validator 0.14.0 - Decorator-based validation
- class-transformer 0.5.1 - Object transformation

**Logging:**

- pino 8.0.0 - High-performance JSON logger
- pino-http 9.0.0 - HTTP request logging for Express

**Monitoring:**

- @willsoto/nestjs-prometheus 6.0.0 - Prometheus metrics integration

**Development Tools:**

- ESLint 9.0.0 - Linting (typescript-eslint 8.0.0)
- Prettier 3.0.0 - Code formatting
- Husky 9.0.0 - Git hooks
- lint-staged 15.0.0 - Run linters on staged files
- @commitlint/cli 19.0.0 - Commit message validation
- Commitizen 4.3.0 - Interactive commit messages
- ts-node 10.9.0 - TypeScript execution (for seed scripts)
- dotenv-cli 7.0.0 - .env file support for CLI commands
- tsconfig-paths 4.2.0 - TypeScript path mapping resolution

## Configuration

**Environment:**

- Development: `NODE_ENV=development`
- Testing: Test-specific environment via database URL suffix `_test`
- Configuration via environment variables:
  - DATABASE_URL - PostgreSQL connection string
  - DATABASE_URL_TEST - Test database URL
  - JWT_ACCESS_SECRET, JWT_REFRESH_SECRET - JWT signing keys
  - REDIS_URL - Redis connection
  - AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET, AWS_REGION - AWS S3 config
  - RESEND_API_KEY - Email service API key
  - SENTRY_DSN - Error tracking DSN
  - CORS_ORIGINS - Allowed CORS origins (e.g., http://localhost:5173 for dev)

**Build:**

- TypeScript: `tsconfig.json` - ES2022 target, strict mode enabled
- Frontend: `vite.config.ts` - React plugin configured, path aliases
- Backend: Built via `nest build` command
- ESLint: `eslint.config.js` - Flat config format (ESLint 9+)
- Prettier: `.prettierrc` - Single quotes, 2-space tabs, 100 char line width, trailing commas

## Platform Requirements

**Development:**

- Docker and Docker Compose (for PostgreSQL and Redis)
- Node.js 20+
- pnpm 8+

**Production:**

- PostgreSQL 16+ database
- Redis 7+ instance
- Node.js 20+ runtime
- Deployment: Unspecified (environment-agnostic with Docker Compose for services)

## Monorepo Structure

**Apps:**

- `apps/api` - NestJS REST API
- `apps/web` - React frontend with Vite

**Packages:**

- `packages/shared` - Shared types and enums (Role, MovementType, JwtPayload)

**Workspace Scripts:**

- `dev` - Run all apps in parallel
- `build` - Build all apps
- `test`, `test:unit`, `test:int`, `test:e2e` - Run tests across all packages
- `test:cov` - Coverage reports
- `db:migrate`, `db:migrate:test`, `db:seed` - Database operations (API only)
- `lint`, `format` - Code quality checks

---

_Stack analysis: 2026-03-22_
