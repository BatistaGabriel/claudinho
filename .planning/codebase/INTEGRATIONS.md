# External Integrations

**Analysis Date:** 2026-03-22

## APIs & External Services

**Email Service:**

- Resend - Email delivery service
  - SDK/Client: Package name not exposed (likely via HTTP client)
  - Auth: `RESEND_API_KEY` environment variable
  - Usage: Triggered via BullMQ job queue for magic link emails
  - Integration point: `apps/api/src/modules/auth/application/use-cases/request-magic-link.use-case.ts`
  - Queue implementation: `IEmailQueue` interface expects job-based async email sending

**Cloud Storage:**

- AWS S3 - File storage (configured but not yet integrated)
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` environment variables
  - Configuration: `AWS_S3_BUCKET` for target bucket name
  - SDK: Likely to use @aws-sdk/client-s3 (not in current dependencies)

**Error Tracking:**

- Sentry - Error and performance monitoring (configured but not yet integrated)
  - Auth: `SENTRY_DSN` environment variable
  - Usage: For production error tracking and alerting
  - SDK: Not yet installed as dependency

## Data Storage

**Databases:**

- PostgreSQL 16 (Docker image: postgres:16-alpine)
  - Connection: `DATABASE_URL` environment variable
  - Test Database: `DATABASE_URL_TEST` for test suite isolation
  - Default dev connection: `postgresql://postgres:postgres@localhost:5432/claudinho`
  - Default test connection: `postgresql://postgres:postgres@localhost:5432/claudinho_test`
  - Client: Prisma ORM (@prisma/client 5.0.0)
  - Health check: via pg_isready command

**Cache/Session Storage:**

- Redis 7 (Docker image: redis:7-alpine)
  - Connection: `REDIS_URL` environment variable
  - Default dev connection: `redis://localhost:6379`
  - Client: ioredis 5.3.0
  - Uses: Session management, refresh tokens stored as Redis hashes with TTL
  - Pattern: `session:refresh:{userId}` for refresh token storage
  - Health check: via redis-cli ping command

**File Storage:**

- Local filesystem only (for now)
- S3 integration configured but not implemented

## Authentication & Identity

**Auth Provider:**

- Custom JWT-based authentication
  - Implementation: Passport.js with JWT strategy (@nestjs/passport, @nestjs/jwt)
  - Tokens: Access tokens (short-lived) + Refresh tokens (stored in Redis)
  - Token Payload: `JwtPayload` from `@claudinho/shared`
    - Fields: `userId`, `organizationId` (optional, undefined for admin), `role`
    - Roles: admin, gestor, operador

**Magic Link Auth:**

- Email-based magic link flow for passwordless authentication
  - Token storage: PostgreSQL (MagicLinkToken model)
  - TTL: 15 minutes (900 seconds)
  - Process:
    1. User requests magic link
    2. Token generated and stored in DB
    3. Email queued for async sending (BullMQ)
    4. User clicks link in email to authenticate

**Authorization:**

- Role-based access control (RBAC) via `RoleGuard`
- Implementation: `apps/api/src/shared/guards/role.guard.ts`
- Tenant isolation via `TenantIsolationGuard` for multi-tenant operations
- Guards enforce roles: admin, gestor (manager), operador (operator)

## Monitoring & Observability

**Error Tracking:**

- Sentry (configured via `SENTRY_DSN`, not yet integrated)

**Logs:**

- Pino logger (pino 8.0.0, pino-http 9.0.0)
- JSON structured logging for production monitoring
- HTTP request logging via pino-http middleware

**Metrics:**

- Prometheus integration (@willsoto/nestjs-prometheus 6.0.0)
- Available but not fully implemented

## CI/CD & Deployment

**Hosting:**

- Not configured (deployment target agnostic)
- Docker Compose available for local development/testing

**CI Pipeline:**

- Not detected (GitHub Actions or similar not configured)
- Commit hooks: Husky + lint-staged for pre-commit validation
- Commit linting: commitlint validates conventional commits

**Local Development:**

- Docker Compose: `docker-compose.yml`
  - Services: PostgreSQL 16 + Redis 7
  - Health checks configured for both services
  - Persistent volumes: `postgres_data`, `redis_data`

## Environment Configuration

**Required env vars:**

**Database:**

- `DATABASE_URL` - Primary PostgreSQL connection string
- `DATABASE_URL_TEST` - Test database connection string

**JWT Secrets:**

- `JWT_ACCESS_SECRET` - Secret for signing access tokens
- `JWT_REFRESH_SECRET` - Secret for signing refresh tokens

**Redis:**

- `REDIS_URL` - Redis connection string

**Email Service:**

- `RESEND_API_KEY` - Resend API key for email sending

**AWS S3 (Optional):**

- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_S3_BUCKET` - S3 bucket name
- `AWS_REGION` - AWS region

**Error Tracking (Optional):**

- `SENTRY_DSN` - Sentry project DSN

**CORS:**

- `CORS_ORIGINS` - Comma-separated list of allowed origins
- Development default: `http://localhost:5173` (Vite dev server)

**Other:**

- `NODE_ENV` - Environment (development, production, test)

**Secrets location:**

- Local development: `.env` file (root directory, not committed)
- Reference: `.env.example` for template
- Production: Environment variables injected at runtime

## Webhooks & Callbacks

**Incoming:**

- Magic link email callbacks (user clicks link from email)
- Not webhook-based; traditional HTTP redirect flow

**Outgoing:**

- None detected currently
- Email queue system (BullMQ) is internal async job processing, not webhooks

## Queue/Job Processing

**Job Queue System:**

- BullMQ 5.0.0 + @nestjs/bullmq 10.0.0
- Backing store: Redis
- Usage: Async email jobs
- Job types: `send-magic-link` (email with magic link token)
- Implementation: `IEmailQueue` interface in auth module

## API Design

**REST API:**

- Endpoint prefix: `/api/v1/`
- Request validation: class-validator + class-transformer
- Global validation pipe enabled (whitelist strict mode)
- Schema validation: zod for additional type safety

**Security Headers:**

- Helmet 7.0.0 for HTTP security headers

**Rate Limiting:**

- @nestjs/throttler 5.0.0 (configured but implementation details not visible)

---

_Integration audit: 2026-03-22_
