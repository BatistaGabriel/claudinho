# Codebase Concerns

**Analysis Date:** 2026-03-22

## Tech Debt

**Inadequate Email Validation:**

- Issue: User email validation uses naive `email.includes('@')` pattern instead of proper RFC 5322 validation or regex
- Files: `apps/api/src/modules/users/domain/user.entity.ts` (lines 45, 59)
- Impact: Invalid emails accepted (e.g., `test@`, `@domain.com`, `test@@domain`). Could break email delivery and magic link authentication
- Fix approach: Use a proper email regex pattern or dedicated validation library like `zod` (already a dependency) to enforce RFC 5322 compliance

**Generic Error Messages:**

- Issue: Business logic throws raw string error codes (`'PRODUCT_NAME_REQUIRED'`, `'EMAIL_ALREADY_IN_USE'`) without structured error handling
- Files: Multiple domain entities and use cases:
  - `apps/api/src/modules/products/domain/product.entity.ts` (lines 54, 57, 60, 62, 119, 124, 128, 136)
  - `apps/api/src/modules/users/domain/user.entity.ts` (lines 45, 59)
  - `apps/api/src/modules/stock-movements/domain/stock-movement.entity.ts` (lines 57, 80)
  - `apps/api/src/modules/imports/application/use-cases/validate-import-file.use-case.ts` (lines 22, 26, 31)
- Impact: No HTTP status code mapping, no client-friendly error messages, inconsistent error propagation to API responses
- Fix approach: Create custom exception classes that extend NestJS `HttpException` to properly translate domain errors to HTTP responses with appropriate status codes and messages

**Empty AppModule:**

- Issue: `apps/api/src/app.module.ts` is a placeholder with no module imports
- Files: `apps/api/src/app.module.ts`
- Impact: Dependency injection not configured; features cannot be registered; database, cache, and queue integrations are not accessible
- Fix approach: Import feature modules (products, users, auth, dashboard, stock-movements, imports) and shared infrastructure modules (database, cache, queue)

**Missing Infrastructure Layer Implementations:**

- Issue: Cache service (`ICacheService`) and pub-sub service (`IPubSubService`) are defined as interfaces but no concrete implementations exist
- Files:
  - Interface definitions: `apps/api/src/modules/shared/interfaces/cache.service.ts`, `apps/api/src/modules/shared/interfaces/pub-sub.service.ts`
  - Referenced but not implemented in: `apps/api/src/modules/auth/application/use-cases/request-magic-link.use-case.ts`
- Impact: Email queue injection fails at runtime; magic link workflow cannot send emails; feature is blocked
- Fix approach: Create Redis-backed implementations (`RedisCache`, `RedisPubSub`) with corresponding NestJS providers in the shared module

**No Presentation/HTTP Layer:**

- Issue: Controllers, DTOs, and HTTP routes are completely absent
- Files: No `presentation/` directories found in any module
- Impact: Business logic exists but is unreachable via HTTP; API has no endpoints; web app has nowhere to send requests
- Fix approach: Create controller layer for each module with proper DTO validation using `class-validator` (already a dependency)

**Weak Tenant Isolation Guard Logic:**

- Issue: Guard has fallback behavior that bypasses tenant isolation when `organizationId` is absent from route parameters
- Files: `apps/api/src/shared/guards/tenant-isolation.guard.ts` (line 34)
- Impact: Routes without explicit `organizationId` parameter are not tenant-isolated; operators could access data from any organization if controller accidentally omits the parameter validation
- Fix approach: Make the guard fail-safe by requiring explicit tenant context or explicitly allowing only public routes; document which routes are intentionally without isolation

**Inadequate Role Guard Validation:**

- Issue: Role guard does not validate that `user?.role` exists before calling `includes()`; returns `true` if user is undefined
- Files: `apps/api/src/shared/guards/role.guard.ts` (line 23)
- Impact: Routes decorated with `@Roles()` could be accessed by requests with missing or malformed JWT; authentication bypass for any guarded route
- Fix approach: Add explicit null checks and throw `UnauthorizedException` if user is missing

## Security Considerations

**Email Enumeration Not Fully Implemented:**

- Risk: CLAUDE.MD specifies that magic link request responses should be identical regardless of email existence (lines 283), but no verification that this is implemented in the actual use case
- Files: `apps/api/src/modules/auth/application/use-cases/request-magic-link.use-case.ts` exists but HTTP layer implementation missing
- Current mitigation: None visible in codebase; specification only
- Recommendations: When implementing the magic link endpoint, ensure response is identical (same status code, same timing, same message) for existing and non-existing emails to prevent user enumeration

**MIME Type Bypass Risk:**

- Risk: File validation checks MIME type AND extension separately but no protection against MIME type spoofing (attacker renames executable as `.csv`)
- Files: `apps/api/src/modules/imports/application/use-cases/validate-import-file.use-case.ts` (lines 25-32)
- Current mitigation: Extension check catches basic spoofing; content validation missing
- Recommendations: Add file content inspection (magic bytes) to detect actual file type regardless of MIME header or extension

**Magic Link Token Exposure:**

- Risk: Magic link token stored in plaintext in database; if PostgreSQL is compromised, tokens are directly usable
- Files: `apps/api/src/prisma/schema.prisma` (line 51) — `token` field is stored as `String @unique`
- Current mitigation: Tokens are short-lived (15 min) and single-use
- Recommendations: Hash tokens in database using `bcrypt` or `argon2`; compare hashes at validation time (non-breaking: requires token rehashing during migration)

**Missing CORS Configuration:**

- Risk: No explicit CORS configuration found in NestJS bootstrap
- Files: `apps/api/src/main.ts` — only sets global prefix and validation pipe
- Current mitigation: NestJS defaults to restrictive CORS; may cause web app requests to fail
- Recommendations: Configure CORS to allow web app domain explicitly in main.ts or add `@UseGuards(CorsGuard)` at module level

## Known Bugs

**Product Stock Movement Logic Vulnerability:**

- Symptoms: Product quantity can become negative if multiple outflow requests race; insufficient stock check is performed at entity level but not database-level
- Files: `apps/api/src/modules/products/domain/product.entity.ts` (line 135)
- Trigger: Concurrent outflow requests for same product may both pass validation before either writes to database
- Workaround: Use database-level constraints or pessimistic locking during stock movements (not implemented)

**Inconsistent Role Type Handling:**

- Symptoms: `RefreshToken.create()` excludes `'admin'` from role parameter but `Product` entities carry full role enum
- Files: `apps/api/src/modules/auth/domain/refresh-token.entity.ts` (line 21) vs domain entities
- Trigger: Type system doesn't enforce that admin users never receive refresh tokens
- Impact: Low — type constraint prevents instantiation; but inconsistency suggests missing refresh flow for admin login

## Performance Bottlenecks

**N+1 Query Potential on Product Movements:**

- Problem: When fetching products with their latest movements, naive implementation would query each product separately
- Files: `apps/api/src/modules/products/domain/product.repository.ts` (interface definition only; implementation missing)
- Cause: No `include()` relationships defined in repository interface; depends on implementation
- Improvement path: Define repository method that explicitly joins/includes related movements to fetch in single query

**Missing Database Indexes on High-Query Fields:**

- Problem: `deletedAt` filtering is required on every query but index exists; however, compound indexes for common filter combinations are missing
- Files: `apps/api/src/prisma/schema.prisma` (lines 43, 75-76, 97-98, 119-121)
- Current state: Only single-column or organization+createdAt+id indexes; missing indexes on (organizationId, deletedAt, createdAt) for efficient soft-delete filtering
- Improvement path: Add composite index: `@@index([organizationId, deletedAt, createdAt, id])`

**In-Memory Test Data Storage:**

- Problem: No visible use of factories or database seeding in tests; each test likely creates data via slow database inserts
- Files: Test files create entities and save via repository (e.g., `apps/api/test/unit/products/application/create-product.use-case.spec.ts`)
- Cause: Integration tests must hit real database; unit tests should mock repository
- Improvement path: Separate concerns — unit tests should mock repositories completely; only integration tests touch database

## Fragile Areas

**Entity Validation Without Transaction Wrapper:**

- Files: `apps/api/src/modules/products/application/use-cases/create-product.use-case.ts` (lines 17-19)
- Why fragile: Entity throws validation error _after_ repository is called; if repository.create() succeeds but entity.update() fails later, inconsistency occurs
- Safe modification: Validate entity before repository call; use transaction wrapper for multi-step operations
- Test coverage: Unit tests mock repository; integration tests should verify that failed validation doesn't partially persist

**Soft Delete Not Enforced at Query Level:**

- Files: Repository interfaces (e.g., `apps/api/src/modules/products/domain/product.repository.ts`) lack explicit `deletedAt: null` filtering requirement
- Why fragile: Implementations could forget to filter soft-deleted records; no type-level enforcement
- Safe modification: Add mandatory `includeDeleted?: boolean` parameter with default `false` to all `find` methods; document in repository interface JSDoc
- Test coverage: Every repository test must verify soft-deleted records are excluded by default

**Magic Link Token Lifecycle Management:**

- Files: `apps/api/src/modules/auth/domain/magic-link-token.entity.ts`, use case, and repository are separate but tightly coupled
- Why fragile: Token validation is split across entity (`isValid()`) and repository (`invalidatePreviousTokensForUser()`); a missing call to either breaks the flow
- Safe modification: Encapsulate token lifecycle in repository; expose single method like `consumeTokenForUser()` that handles validation and marking as used atomically
- Test coverage: Integration tests must verify that reusing a consumed token returns error, and that requesting new link invalidates old ones

## Scaling Limits

**Magic Link Token Storage Not Scalable for Concurrent Users:**

- Current capacity: Every magic link request creates a new row in `magic_link_tokens` table; no pagination or cleanup of expired tokens
- Limit: Table grows unbounded; PostgreSQL sequential scans degrade as table size increases; `invalidatePreviousTokensForUser()` must scan user's entire token history
- Scaling path: Add TTL-based job to purge tokens after expiry; create compound index on (userId, expiresAt) for efficient scanning; consider moving unexpired tokens to Redis for active sessions

**Refresh Token Session Management in Redis Without TTL Verification:**

- Current capacity: Redis entries stored with TTL but no automatic key deletion observable in code
- Limit: If Redis restarts, TTL information may be lost depending on persistence config; orphaned keys accumulate
- Scaling path: Implement explicit key cleanup job; verify Redis persistence is configured with RDB or AOF; monitor Redis memory usage

**Single Database Connection Pool for All Modules:**

- Current capacity: No visible connection pool configuration in Prisma setup
- Limit: Prisma uses default pool size (~20 connections); peak load (concurrent movements, exports, imports) exceeds capacity
- Scaling path: Increase `connection_limit` in Prisma schema; consider read replicas for dashboard queries (high cardinality, low write)

## Scaling Issues Not Yet Encountered

**No Distributed Tracing or Request Correlation:**

- Problem: Multi-module system with async jobs (email, imports) has no request ID correlation for debugging
- Files: `apps/api/src/main.ts` — no middleware to inject request ID
- Impact: Low now; critical at scale for production debugging
- Recommendation: Add global middleware to generate/propagate request ID; inject into logs and jobs

## Test Coverage Gaps

**Auth Module Integration Tests Missing:**

- What's not tested: Full magic link flow (request → email job → token validation → refresh token rotation)
- Files: No integration tests found for `apps/api/src/modules/auth/`; only domain entity tests
- Risk: Refresh token validation logic (`isPotentialCompromise()`) untested against database; rotation cascade may not work as specified
- Priority: High — authentication is critical path; must verify token rotation prevents compromise reuse

**No Tenant Isolation Integration Tests:**

- What's not tested: Guard integration with actual database queries; whether operator from org A can fetch org B data when guard logic is bypassed
- Files: Guard has unit test (`apps/api/test/unit/shared/guards/tenant-isolation.guard.spec.ts`) but no e2e test with real repositories
- Risk: Tenant data leak possible if query accidentally omits organizationId filter
- Priority: High — multi-tenancy is core security feature

**HTTP Controller Layer Not Implemented, Therefore No E2E Tests:**

- What's not tested: Entire presentation layer (validation, error handling, HTTP response codes)
- Files: Controllers are completely missing; therefore no E2E tests exist
- Risk: Business logic fully tested; API contract untested
- Priority: Critical — blocks deployment; must implement before MVP release

**Stock Movement Concurrency Not Tested:**

- What's not tested: Race conditions when multiple operators submit outflows simultaneously
- Files: Stock movement use cases (`create-inflow.use-case.ts`, `create-outflow.use-case.ts`) have unit tests but no concurrency tests
- Risk: Overselling possible (stock quantity goes negative)
- Priority: Medium — affects inventory accuracy; must test before operators begin using system

**File Upload Validation Coverage Gaps:**

- What's not tested: Validation against MIME type spoofing (attacker renames .exe as .csv); actual file content validation
- Files: `apps/api/test/unit/imports/application/validate-import-file.use-case.spec.ts` covers size/type but not content
- Risk: Malicious file injection possible if attacker spoofs MIME type
- Priority: Medium — import feature is in progress; add content validation tests before handling real uploads

**Dashboard Indicators Query Performance Not Tested:**

- What's not tested: Query speed with thousands of products/movements; whether dashboard queries hit expected indexes
- Files: `apps/api/test/unit/dashboard/application/get-dashboard-indicators.use-case.spec.ts` (unit test only)
- Risk: Dashboard slow/timeout for large organizations
- Priority: Medium — discovered in production via monitoring; requires load test

## Incomplete Features Blocking API

**Missing Email Queue Infrastructure:**

- Issue: `IEmailQueue` interface defined in `request-magic-link.use-case.ts` but no implementation exists
- Files: `apps/api/src/modules/auth/application/use-cases/request-magic-link.use-case.ts` (line 5)
- Impact: Magic link feature cannot send emails; authentication is broken
- Blocker: Critical for MVP

**Missing Redis Cache Implementation:**

- Issue: `ICacheService` interface exists but no NestJS provider implementation
- Files: `apps/api/src/modules/shared/interfaces/cache.service.ts`
- Impact: Cache operations fail at runtime; dashboard indicators cannot cache aggregations
- Blocker: Critical for performance; impacts all data-heavy queries

**Missing Refresh Token Storage (Redis or Postgres):**

- Issue: Specification describes Redis-based storage with hashing but no implementation visible
- Files: `apps/api/src/prisma/schema.prisma` has comment (lines 1-2) but no repository implementation
- Impact: Refresh token validation cannot happen; authentication flow incomplete
- Blocker: Critical for MVP; without refresh tokens, operator sessions cannot be extended

**Missing Controllers and DTOs:**

- Issue: No HTTP layer exists; all 8 modules lack controllers, routes, and request/response DTOs
- Impact: Zero endpoints available; API is not functional
- Blocker: Critical for MVP; must be implemented before web app can connect

---

_Concerns audit: 2026-03-22_
