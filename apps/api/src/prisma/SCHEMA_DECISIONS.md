# Schema Decisions

## Refresh Tokens

Refresh tokens are stored in Redis (not PostgreSQL) with a TTL equal to the token's expiry.
Key pattern: `session:refresh:{userId}` → hashed token value.
This is a Redis-only concern — no Prisma model exists for refresh tokens.
See CLAUDE.MD §Authentication for the full specification.
