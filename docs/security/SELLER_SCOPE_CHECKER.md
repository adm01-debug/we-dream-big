# Seller-scope checker

Checker estático rodado no CI (`scripts/check-seller-scope.mjs`) que falha o
build se uma query Supabase para tabelas críticas do vendedor for adicionada
sem aplicar escopo de seller.

## Tabelas monitoradas

- `quotes`
- `orders`
- `discount_approval_requests`

## Sinais aceitos como "scope aplicado"

Para cada `.from("<tabela>")`, o checker inspeciona até 40 linhas seguintes
(ou até o `;` que fecha o statement) procurando um destes sinais:

- `applySellerScope(...)` — helper canônico (`src/lib/auth/apply-seller-scope.ts`)
- `.eq("seller_id", ...)` / `.in("seller_id", ...)`
- `.match({ seller_id: ... })`
- `.filter("seller_id", ...)`
- `.or("seller_id.eq...,seller_id.in...")`
- chamada `supabase.rpc(...)` (escopo aplicado server-side)

## Allowlist explícita

Quando a query é legítima sem filtro client-side (escopo admin, lookup por
`id` específico com RLS validando ownership, rota pública por token, etc.),
adicione um comentário **na linha do `.from(...)` ou na linha imediatamente
acima**:

```ts
// rls-allow: lookup por id; RLS valida ownership
const { data } = await supabase.from("quotes").select("*").eq("id", id).single();
```

## Comandos

```bash
npm run check:seller-scope          # falha se houver violação
node scripts/check-seller-scope.mjs --json   # saída JSON p/ tooling
```

## Por que não confiar só no RLS?

Defesa em profundidade. Aplicar `seller_id` no client:

1. **Reduz superfície de ataque** se uma policy for afrouxada por engano.
2. **Reduz tráfego e latência** — o filtro vai ao planner como predicado.
3. **Documenta intenção** — fica óbvio em revisão de PR qual é o escopo.

O checker garante que toda query nova passe por essa decisão consciente:
ou aplica o scope, ou justifica explicitamente com `// rls-allow:`.
