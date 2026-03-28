# Sprint Design — Camada de Infraestrutura

> **Contexto:** Domínio e use cases estão implementados (entidades, repositórios como interfaces, guards). Esta sprint implementa a camada de infraestrutura: repositórios Prisma e serviços Redis, com testes de integração obrigatórios seguindo TDD.

---

## 5W2H

### WHAT — O que será feito?

Implementar a camada de infraestrutura do sistema, composta por:

1. **Módulo Categories** — domínio completo (entity + repository interface) e `PrismaCategoryRepository`
2. **Módulo Auth** — `PrismaMagicLinkTokenRepository` e `PrismaRefreshTokenRepository`
3. **Módulo Users** — `PrismaUserRepository`
4. **Módulo Products** — `PrismaProductRepository` (inclui `findByIdForUpdate` para lock pessimista)
5. **Módulo Stock Movements** — `PrismaStockMovementRepository` (usa `findByIdForUpdate` do `PrismaProductRepository` dentro de transação)
6. **Módulo Dashboard** — `PrismaDashboardRepository` (queries de agregação)
7. **Serviços Redis** — `RedisCacheService` (implementa `ICacheService`) e `RedisPubSubService` (implementa `IPubSubService`)

As interfaces `ICacheService` e `IPubSubService` já existem em `modules/shared/interfaces/`. Os serviços Redis são suas implementações concretas.

Repositórios que expõem `withTransaction`:

- `IProductRepository` — porque use cases de stock movement precisam atualizar saldo de produto e criar movimento atomicamente
- `IStockMovementRepository` — porque é o ponto de entrada do use case que orquestra a transação

Outros repositórios (`ICategoryRepository`, `IUserRepository`, `IMagicLinkTokenRepository`, `IRefreshTokenRepository`, `IDashboardRepository`) não expõem `withTransaction` pois seus use cases são operações de escrita simples.

Cada repositório Prisma terá testes de integração contra banco real cobrindo:

- CRUD básico
- Isolamento de tenant (nenhuma query retorna dados de outra organização)
- Soft delete (registros com `deletedAt` nunca aparecem em listagens)

**Fora do escopo desta sprint:**

- Controllers, DTOs, módulos NestJS
- BullMQ / jobs de background
- Frontend
- CI/CD pipeline
- Deploy

---

### WHY — Por que nessa ordem?

A Clean Architecture exige desenvolvimento inside-out:

```
Domain → Application → Infrastructure → Presentation
  ✅           ✅              🎯               ⬜
```

Implementar infraestrutura antes de controllers garante que:

1. **O isolamento de tenant é validado contra banco real** antes de expor qualquer rota HTTP — uma falha aqui é um incidente de segurança, não um bug
2. **Problemas de schema são baratos** de corrigir agora (migration), caros depois (impacto em E2E + controllers)
3. **Controllers tornam-se adaptadores finos** quando os repositórios já têm contrato validado — o risco de erro cai drasticamente

A ordem dos módulos segue dependências do schema:

```
Categories ──► Products ──► StockMovements ──► Dashboard
Auth ──► Users ──────────────────────────────────────►
Redis (independente)
```

---

### WHO — Quem executa?

| Papel                       | Responsabilidade                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Claude (agente)**         | Implementação TDD: escreve teste → confirma falha → implementa → confirma passagem → commit |
| **Desenvolvedor (usuário)** | Revisão de PRs, aprovação de merges, decisões de arquitetura quando surgirem dúvidas        |

**Regras de processo inegociáveis (CLAUDE.MD):**

- Todo trabalho em branch dedicada com prefixo `feat/infra-<módulo>` (ex: `feat/infra-categories`)
- Commit de teste separado do commit de implementação
- PR de `feat/infra-<módulo>` → `staging` (via PR aprovado); depois `staging` → `main` (via PR aprovado)
- Nunca push direto em `main` ou `staging`
- TDD obrigatório: vermelho → verde → refactor

---

### WHEN — Quando / em que sequência?

**Etapa 0 (pré-sprint):** Confirmar que o Prisma schema contém todas as tabelas e colunas necessárias para os 7 módulos — incluindo os índices compostos `(organization_id, created_at, id)` exigidos para paginação cursor-based. Se houver gaps, gerar e aplicar migration antes de iniciar a Etapa 1.

A sprint é executada em 7 etapas sequenciais, respeitando dependências:

```
Etapa 1 — Categories (domain + infra)
    │
Etapa 2 — Auth (infra)
    │
Etapa 3 — Users (infra)           ← depende de Auth (organização/tenant)
    │
Etapa 4 — Products (infra)        ← depende de Categories + Users
    │
Etapa 5 — Stock Movements (infra) ← depende de Products
    │
Etapa 6 — Dashboard (infra)       ← depende de Products + Stock Movements
    │
Etapa 7 — Redis Services (unit)   ← independente, pode ser paralela a qualquer etapa
```

Cada etapa segue o ciclo TDD completo antes de avançar para a próxima.

---

### WHERE — Onde as mudanças acontecem?

```
apps/api/
  src/
    modules/
      categories/
        domain/
          category.entity.ts                             ← NOVO
          category.repository.ts                         ← NOVO (ICategoryRepository)
        infrastructure/
          prisma-category.repository.ts                  ← NOVO
      auth/
        infrastructure/
          prisma-magic-link-token.repository.ts          ← NOVO
          prisma-refresh-token.repository.ts             ← NOVO
      users/
        infrastructure/
          prisma-user.repository.ts                      ← NOVO
      products/
        infrastructure/
          prisma-product.repository.ts                   ← NOVO (inclui findByIdForUpdate)
      stock-movements/
        infrastructure/
          prisma-stock-movement.repository.ts            ← NOVO
      dashboard/
        infrastructure/
          prisma-dashboard.repository.ts                 ← NOVO
      shared/
        interfaces/
          cache.service.ts                               ← JÁ EXISTE (ICacheService)
          pub-sub.service.ts                             ← JÁ EXISTE (IPubSubService)
        infrastructure/
          redis-cache.service.ts                         ← NOVO (implements ICacheService)
          redis-pub-sub.service.ts                       ← NOVO (implements IPubSubService)

  test/
    integration/
      jest.config.int.ts                                 ← NOVO (globalSetup aponta para db:migrate:test)
      categories/
        prisma-category.repository.spec.ts               ← NOVO
      auth/
        prisma-magic-link-token.repository.spec.ts       ← NOVO
        prisma-refresh-token.repository.spec.ts          ← NOVO
      users/
        prisma-user.repository.spec.ts                   ← NOVO
      products/
        prisma-product.repository.spec.ts                ← NOVO
      stock-movements/
        prisma-stock-movement.repository.spec.ts         ← NOVO
      dashboard/
        prisma-dashboard.repository.spec.ts              ← NOVO
    unit/
      shared/
        infrastructure/
          redis-cache.service.spec.ts                    ← NOVO
          redis-pub-sub.service.spec.ts                  ← NOVO
```

---

### HOW — Como será implementado?

**Padrão por repositório Prisma:**

Cada `PrismaXRepository` implementa a interface de domínio correspondente (prefixo `I`). Nenhum domínio ou use case conhece o Prisma diretamente. O tipo `withTransaction` no contrato de domínio usa uma abstração genérica — o handle concreto do Prisma (`Omit<PrismaClient, '$on' | ...>`) fica interno à implementação:

```typescript
// Contrato de domínio — infrastructure-agnostic
type TransactionScope = unknown // resolvido pela infra como PrismaClient.$transaction handle

interface IProductRepository {
  findById(id: string, ctx: TenantContext): Promise<Product | null>
  findByIdForUpdate(id: string, scope: TransactionScope): Promise<Product> // SELECT ... FOR UPDATE
  findAll(ctx: TenantContext, pagination: CursorPagination): Promise<PaginatedResult<Product>>
  create(product: Product): Promise<void>
  update(id: string, data: Partial<Product>, ctx: TenantContext): Promise<void>
  softDelete(id: string, ctx: TenantContext): Promise<void>
  withTransaction(fn: (scope: TransactionScope) => Promise<void>): Promise<void>
}

// Implementação de infraestrutura
class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async withTransaction(fn: (scope: TransactionScope) => Promise<void>): Promise<void> {
    await this.prisma.$transaction(fn)
  }

  async findByIdForUpdate(id: string, scope: TransactionScope): Promise<Product> {
    // scope aqui é o handle de transação Prisma
    const tx = scope as Omit<
      PrismaClient,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'
    >
    const [row] = await tx.$queryRaw<{ quantity: number }[]>`
      SELECT quantity FROM products WHERE id = ${id} FOR UPDATE
    `
    // mapear para entidade de domínio
  }
}
```

**Regras obrigatórias em todos os repositórios:**

- Todo `findAll` inclui `where: { deletedAt: null }` — sem exceção
- Todo método que lê dados recebe `TenantContext` com `organizationId` e filtra por ele
- Operações de escrita verificam pertencimento ao tenant antes de executar
- Paginação cursor-based (`createdAt + id`, base64-encoded) — sem offset
- Todo `findAll` em tabelas paginadas pressupõe índice composto `(organization_id, created_at, id)` confirmado na Etapa 0

**Regra especial — StockMovements e lock pessimista:**

O use case de outflow chama `productRepository.withTransaction` para encapsular: (1) `findByIdForUpdate` na tabela `products` e (2) criação do movimento e atualização do saldo. O `PrismaStockMovementRepository` não duplica esse lock — ele apenas persiste o movimento dentro do scope transacional recebido.

**Setup de testes de integração:**

Arquivo: `apps/api/test/integration/jest.config.int.ts`

```typescript
export default {
  globalSetup: './global-setup.ts', // executa: pnpm db:migrate:test
  testMatch: ['**/test/integration/**/*.spec.ts'],
  // ... demais configs
}
```

Teardown entre testes usa deleção em ordem reversa de dependência (FK-safe):

```typescript
afterEach(async () => {
  await prisma.stockMovement.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.magicLinkToken.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
})
```

**Padrão de teste de integração:**

```typescript
describe('PrismaProductRepository', () => {
  describe('Tenant Isolation', () => {
    it('should not return products from another organization', ...)
    it('should not allow updating a product from another organization', ...)
  })

  describe('Soft Delete', () => {
    it('should never return soft-deleted products in findAll', ...)
  })

  describe('CRUD', () => {
    it('should persist and retrieve a product', ...)
    it('should apply cursor-based pagination', ...)
  })
})
```

**Padrão de teste unitário — RedisCacheService:**

Estratégia de erro: em falha de conexão, o serviço **retorna `null`** (degradação graciosa), não propaga a exceção — alinhado com CLAUDE.MD que define que "se o Redis cair, a API continua funcionando normalmente."

```typescript
describe('RedisCacheService', () => {
  let service: RedisCacheService
  let redisMock: jest.Mocked<Redis>

  beforeEach(() => {
    redisMock = createMockRedis()
    service = new RedisCacheService(redisMock)
  })

  it('should return cached value on cache hit', async () => {
    redisMock.get.mockResolvedValue(JSON.stringify({ data: 42 }))
    const result = await service.get('dashboard:indicators:org_123')
    expect(result).toEqual({ data: 42 })
  })

  it('should return null on cache miss', async () => {
    redisMock.get.mockResolvedValue(null)
    const result = await service.get('dashboard:indicators:org_123')
    expect(result).toBeNull()
  })

  it('should set value with correct TTL', async () => {
    await service.set('dashboard:indicators:org_123', { data: 42 }, 60)
    expect(redisMock.set).toHaveBeenCalledWith(
      'dashboard:indicators:org_123',
      JSON.stringify({ data: 42 }),
      'EX',
      60,
    )
  })

  it('should invalidate key on eviction', async () => {
    await service.invalidate('dashboard:indicators:org_123')
    expect(redisMock.del).toHaveBeenCalledWith('dashboard:indicators:org_123')
  })

  it('should return null gracefully on Redis connection failure', async () => {
    redisMock.get.mockRejectedValue(new Error('ECONNREFUSED'))
    const result = await service.get('dashboard:indicators:org_123')
    expect(result).toBeNull() // degrada graciosamente, não propaga
  })
})
```

**Padrão de teste unitário — RedisPubSubService:**

Interface: `publish(channel: string, payload: unknown): Promise<void>` e `subscribe(channel: string, handler: (payload: unknown) => void): void`. Formato de canal: `sse:{context}:{organizationId}` (ex: `sse:dashboard:org_123`).

```typescript
describe('RedisPubSubService', () => {
  let service: RedisPubSubService
  let publisherMock: jest.Mocked<Redis>
  let subscriberMock: jest.Mocked<Redis>

  beforeEach(() => {
    publisherMock = createMockRedis()
    subscriberMock = createMockRedis()
    service = new RedisPubSubService(publisherMock, subscriberMock)
  })

  it('should publish event to the correct channel', async () => {
    await service.publish('sse:dashboard:org_123', { event: 'dashboard.updated', version: 1 })
    expect(publisherMock.publish).toHaveBeenCalledWith(
      'sse:dashboard:org_123',
      JSON.stringify({ event: 'dashboard.updated', version: 1 }),
    )
  })

  it('should invoke handler when event is received on subscribed channel', () => {
    const handler = jest.fn()
    service.subscribe('sse:dashboard:org_123', handler)

    // simula mensagem recebida pelo Redis subscriber
    const onCall = subscriberMock.on.mock.calls.find(([event]) => event === 'message')
    onCall?.[1]('sse:dashboard:org_123', JSON.stringify({ event: 'dashboard.updated' }))

    expect(handler).toHaveBeenCalledWith({ event: 'dashboard.updated' })
  })

  it('should not invoke handler for events on a different channel', () => {
    const handler = jest.fn()
    service.subscribe('sse:dashboard:org_123', handler)

    const onCall = subscriberMock.on.mock.calls.find(([event]) => event === 'message')
    onCall?.[1]('sse:dashboard:org_456', JSON.stringify({ event: 'dashboard.updated' }))

    expect(handler).not.toHaveBeenCalled()
  })
})
```

---

### HOW MUCH — Qual o volume de entrega?

| Artefato                                      | Quantidade                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Arquivos de domínio novos (categories)        | 2                                                                                          |
| Repositórios Prisma                           | 7                                                                                          |
| Serviços Redis                                | 2                                                                                          |
| Config Jest integração (`jest.config.int.ts`) | 1                                                                                          |
| Arquivos de teste de integração               | 8                                                                                          |
| Arquivos de teste unitário (Redis)            | 2                                                                                          |
| **Total de arquivos novos**                   | **22**                                                                                     |
| Branches abertas                              | 1 por etapa (`feat/infra-<módulo>`)                                                        |
| PRs                                           | 1 por etapa (7 total: `feat/infra-<módulo>` → `staging`) + 1 PR final (`staging` → `main`) |

> Auth contribui com 2 repositórios e 2 specs de integração separadas.

---

## Segurança e Sanitização (Shift-Left)

Esta seção define os controles de segurança obrigatórios que devem ser aplicados durante a implementação de cada repositório — não como checklist de revisão posterior, mas como parte do ciclo TDD de cada etapa.

---

### Injeção SQL — `$queryRaw` seguro

O único uso de raw query nesta sprint é o `SELECT ... FOR UPDATE` em `PrismaProductRepository`. Regra absoluta:

```typescript
// ✅ CORRETO — tagged template literal: Prisma parametriza automaticamente
await tx.$queryRaw`SELECT quantity FROM products WHERE id = ${id} FOR UPDATE`

// ❌ PROIBIDO — string concatenada: vulnerável a SQL injection
await tx.$queryRawUnsafe(`SELECT quantity FROM products WHERE id = '${id}' FOR UPDATE`)
```

O Semgrep rodando no pre-commit (já configurado no projeto) deve ter uma regra que flagga qualquer uso de `$queryRawUnsafe`. Confirmar na Etapa 0.

---

### Sanitização na fronteira do repositório

O repositório é a última camada antes do banco. Todo método público deve validar antes de executar qualquer query:

```typescript
// Obrigatório em todo método que recebe TenantContext
if (!ctx.organizationId || !isUUID(ctx.organizationId)) {
  throw new Error('INVALID_TENANT_CONTEXT')
}

// Obrigatório em métodos que recebem cursor de paginação
if (cursor) {
  const decoded = decodeCursor(cursor) // base64 decode + parse
  if (!decoded || !decoded.createdAt || !decoded.id) {
    throw new Error('INVALID_CURSOR')
  }
}
```

Isso previne que dados malformados cheguem ao Prisma e garante que o `organizationId` sempre vem de uma fonte confiável (JWT verificado) — nunca de input direto do usuário.

---

### Armazenamento seguro de tokens

Tokens de autenticação (magic link e refresh token) **nunca são armazenados em texto puro**. O banco armazena apenas o hash SHA-256 do valor; o valor raw é transmitido apenas uma vez (no link de email ou na resposta HTTP) e descartado.

```typescript
// Ao persistir — armazena apenas o hash
const tokenHash = createHash('sha256').update(rawToken).digest('hex')
await prisma.magicLinkToken.create({ data: { tokenHash, userId, expiresAt } })

// Ao validar — compara hashes
const tokenHash = createHash('sha256').update(incomingRawToken).digest('hex')
const record = await prisma.magicLinkToken.findUnique({ where: { tokenHash } })
```

Testes de integração devem verificar que:

- O valor retornado pelo repositório em `create` é o raw token (para ser enviado no email)
- O banco **nunca** contém o valor raw — apenas o hash
- A busca por token inválido retorna `null`, não erro (anti-enumeração)

---

### Dados sensíveis fora de logs e erros

Campos sensíveis nunca devem aparecer em mensagens de erro, stack traces ou logs:

- `MagicLinkToken.tokenHash` — nunca logar
- `RefreshToken.tokenHash` — nunca logar
- `User.email` em erros de negócio deve ser mascarado (`u***@domain.com`)

O mapeamento da entidade Prisma para a entidade de domínio é o ponto onde esses campos são filtrados. O método `toDomain()` de cada repositório não deve expor campos que o domínio não precisa.

---

### Soft delete como controle de acesso

Registros com `deletedAt` preenchido são **inacessíveis**, mesmo que o `id` seja conhecido pelo tenant correto:

```typescript
// ✅ findById também filtra soft delete
async findById(id: string, ctx: TenantContext): Promise<Product | null> {
  return prisma.product.findFirst({
    where: { id, organizationId: ctx.organizationId, deletedAt: null }
  })
}
```

Usar `findFirst` com `deletedAt: null` em vez de `findUnique` é obrigatório em todos os métodos de busca por ID — `findUnique` não aceita o filtro `deletedAt` de forma segura.

---

### Checklist de segurança por etapa

Antes de abrir o PR de cada etapa, verificar:

- [ ] Nenhum uso de `$queryRawUnsafe` (Semgrep confirma)
- [ ] Todo método público valida `organizationId` antes da query
- [ ] Tokens armazenados como hash SHA-256, nunca em texto puro
- [ ] `findById` filtra `deletedAt: null` (não usa `findUnique` sem esse filtro)
- [ ] Nenhum campo sensível presente em mensagens de erro ou no retorno do repositório
- [ ] TruffleHog não detecta segredos no diff (pre-commit já executa)

---

## Critérios de Conclusão da Sprint

- [ ] Etapa 0 concluída: schema validado, índices compostos `(organization_id, created_at, id)` confirmados em todas as tabelas paginadas
- [ ] Todos os testes de integração passam contra banco real (`pnpm test:int`)
- [ ] Todos os testes unitários passam (`pnpm test:unit`)
- [ ] Nenhum repositório vaza dados entre tenants
- [ ] Nenhum repositório retorna registros com `deletedAt` preenchido
- [ ] `PrismaProductRepository.withTransaction` e `findByIdForUpdate` implementados e cobertos por teste
- [ ] Cenário de outflow concorrente coberto por teste — saldo negativo impossível
- [ ] `RedisCacheService` degrada graciosamente em falha de conexão (retorna `null`, não propaga)
- [ ] Cada etapa tem PR separado: `feat/infra-<módulo>` → `staging` (aprovado)
- [ ] PR final `staging` → `main` aprovado após todos os módulos mergeados em staging
- [ ] Nenhum commit mistura teste + implementação
- [ ] Cada PR inclui revisão OWASP com atenção a A01 (tenant isolation) e A03 (injeção em `$queryRaw`)
- [ ] Checklist de segurança por etapa concluído antes de cada PR (ver seção Segurança e Sanitização)
- [ ] Tokens armazenados como hash SHA-256 — banco não contém nenhum valor raw
