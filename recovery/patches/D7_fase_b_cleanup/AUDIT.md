# AUDIT.md — Snapshot pré-execução D.7 Fase B

**Coletado em**: 2026-05-12 (antes de qualquer DDL)

## Tables candidatas a DROP

| Table | Rows | Triggers ativos | FKs pra ela | Policies externas |
|---|:-:|:-:|:-:|:-:|
| `kit_share_tokens` | 0 | 0 | 0 | 0 |
| `quote_approval_tokens` | 0 | 0 | 0 | 0 |

✅ Seguro para DROP CASCADE.

## Funções candidatas a DROP

| Função | Chamada por (DB) | Chamada por (código) | GRANTs |
|---|:-:|:-:|---|
| `record_public_token_failure` | 0 | 0 (só `src/integrations/supabase/types.ts` autogerado) | PUBLIC, anon, authenticated, service_role |
| `get_quote_token_by_value` | 1 (`audit_security_definer_acl` — whitelist literal) | 0 | idem |
| `submit_quote_response` | 1 (`audit_security_definer_acl` — whitelist literal) | 0 | idem |

✅ Whitelist em `audit_security_definer_acl` é só nome em string — limpando junto.

## Funções a refatorar (branches mortos)

| Função | Branch morta a remover |
|---|---|
| `validate_status_fields` | `IF TG_TABLE_NAME='kit_share_tokens'` + `IF TG_TABLE_NAME='quote_approval_tokens'` |
| `dispatch_quote_webhook_event` | `ELSIF TG_TABLE_NAME='kit_share_tokens'` (kit.shared event) |
| `audit_security_definer_acl` | Whitelist literal `('submit_quote_response','get_quote_token_by_value')` |

## Código produtivo afetado (descoberto na auditoria)

| Arquivo | Linha | Tipo de uso |
|---|---|---|
| `src/pages/admin/KitTemplatesMetricsPage.tsx` | 88 | `.from('kit_share_tokens')` em `useQuery` — métrica admin |
| `supabase/functions/quote-followup-reminders/index.ts` | 41 | `.from('quote_approval_tokens')` em filtro de visualização |
| `supabase/functions/e2e-cleanup/index.ts` | 96 | String em array literal de cleanup |
| `supabase/functions/connections-hub-audit/index.ts` | 57, 172 | String em array e mapping de triggers |
| `supabase/functions/tests/rls-policies_test.ts` | 53, 147 | Lista de tables críticas + test 9 dedicado |
| `e2e/quote-approval.spec.ts` | múltiplas | Testa rota `/proposta/:token` que não existe mais |
| `src/integrations/supabase/types.ts` | múltiplas | Tipos autogerados |

## Documentos históricos (mantidos como estão)

Arquivos em `recovery/blockXX_*.sql`, `recovery/patches/D1.4_*`, `recovery/patches/D4.x_*`, `recovery/full-public-schema.sql`, etc. mencionam essas tables/funções mas são **dumps de auditoria do Lovable original** — não código produtivo. Mantidos por valor histórico.

## Migration histórica preparada mas NÃO rodada (pré-existente)

`supabase/migrations/20260507161547_drop_public_token_tables.sql` já tinha o DROP planejado em 07/05/2026 mas nunca rodou. Esta Fase B **substitui** essa intenção com um plano mais completo (refactor → DROP funcs → DROP tables) e fica registrada no repo via `recovery/patches/D7_fase_b_cleanup/`.
