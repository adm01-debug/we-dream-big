# D.7 — Fase B: Cleanup técnico das rotas públicas com token

**Status**: ✅ APLICADO em PROD em 2026-05-12  
**Decisão de produto**: Decision 010 (manter REMOVIDAS as rotas públicas com token, Joaquim 07/05/2026)  
**Decisão técnica**: Decision 011 (execução do cleanup)

## 🎯 Objetivo

Fechar débito técnico residual deixado pelo commit `0bc97759b7e235b995c6110a0e94228e86006c8a` (remoção das rotas públicas em 07/05/2026): tables vazias, funções órfãs, e código secundário (admin, edges não-críticas, testes) que ainda referenciavam a feature morta.

## 📦 Escopo executado

### Fase B.0 — Frontend + Edges + Testes (commit único)

| Arquivo | Mudança |
|---|---|
| `src/pages/admin/KitTemplatesMetricsPage.tsx` | Removida seção "Conversão de compartilhamentos" (60 linhas: useQuery + Card JSX) e imports órfãos (Share2, Eye, Percent) |
| `supabase/functions/quote-followup-reminders/index.ts` | Removido filtro `viewed_at` via `quote_approval_tokens` — heurística agora é puramente temporal (≥2d sem follow-up) |
| `supabase/functions/e2e-cleanup/index.ts` | `"quote_approval_tokens"` retirada da lista `QUOTE_CHILD_TABLES_BY_QUOTE_ID` |
| `supabase/functions/connections-hub-audit/index.ts` | `"kit_share_tokens"` retirada de `TRIGGER_TABLES` e do mapping `TABLE_TO_EVENT_PREFIX` |
| `supabase/functions/tests/rls-policies_test.ts` | Test 9 (`quote_approval_tokens RLS`) removido inteiro; lista de "10 critical tables" virou 9 |
| `e2e/quote-approval.spec.ts` | **Deletado** — testava rota `/proposta/:token` que não existe mais |
| `src/integrations/supabase/types.ts` | Removidos blocos das 2 tables + 3 funções dropadas + FK refs órfãs (4918 chars) |

### Fase B.1 — DB refactor (`01_refactor_functions.sql`)

3 funções refatoradas para remover branches mortas (branches que mencionavam `kit_share_tokens` ou `quote_approval_tokens`):

- `validate_status_fields()` — removidos 2 `IF TG_TABLE_NAME` blocks
- `dispatch_quote_webhook_event()` — removido `ELSIF` branch `kit.shared`
- `audit_security_definer_acl()` — whitelist `public_intent` zerada (`false` literal)

### Fase B.2 — DB DROP

**`02_drop_dead_functions.sql`** — 3 funções órfãs:
- `record_public_token_failure(text,text,text,text,text,text)`
- `get_quote_token_by_value(text)`
- `submit_quote_response(text,text,text)`

REVOKE GRANTs (PUBLIC, anon, authenticated, service_role) executado antes do DROP.

**`03_drop_tables.sql`** — 2 tables vazias com CASCADE:
- `kit_share_tokens` (0 rows, 0 FKs apontando, 0 policies externas)
- `quote_approval_tokens` (idem)

## ✅ Validações executadas

| Check | Resultado |
|---|---|
| Tables dropadas | ✅ ok (0/2 existem) |
| Funções dropadas | ✅ ok (0/3 existem) |
| Refs executáveis (não comentário) em qualquer função | ✅ ok (0) |
| `public_tables_rls_no_policies` | ✅ 0 |
| `functions_secdef_no_searchpath` | ✅ 0 |
| TypeCheck (`npx tsc --noEmit`) | ✅ 0 erros |
| ESLint baseline gate | ✅ 1535 ≤ 1547 |
| Total tables públicas | 275 (era 277) |
| Total functions públicas | 772 (era 775) |

## 🟦 Fora do escopo (Fase C — depende de decisão de produto)

26 menções a status `'approved'`/`'rejected'`/`'pending_approval'`/`'viewed'` em dashboard/kanban/BI continuam funcionando. Cleanup desses valores depende do conceito de "orçamento finalizado" ser definido no novo modelo de negócio.

A função `validate_status_fields` ainda **aceita** esses valores no enum lógico — não estreitamos o CHECK para evitar quebrar quotes históricos.
