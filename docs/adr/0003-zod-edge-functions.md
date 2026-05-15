# ADR 0003 — Validação Zod Obrigatória em Edge Functions

**Status:** Accepted · **Date:** 2025-Q4

## Contexto
50+ edge functions expostas publicamente. Validação manual produzia bugs sutis (campos opcionais, tipos coerced).

## Decisão
**Toda** edge function com body de cliente valida via Zod com `safeParse` e retorna 400 com `error.flatten().fieldErrors` em caso de falha. CORS inline (`_shared/cors.ts`).

## Consequências
- ✅ 100% de cobertura de validação (ver `docs/EDGE_FUNCTIONS.md`)
- ✅ Mensagens de erro padronizadas para o front
- ⚠️ Bundle Deno ~30KB maior por função (aceitável)

## Padrão
```ts
const Schema = z.object({ /* ... */ });
const parsed = Schema.safeParse(await req.json());
if (!parsed.success) return new Response(
  JSON.stringify({ error: parsed.error.flatten().fieldErrors }),
  { status: 400, headers: corsHeaders }
);
```
