# D.6 — Advisor Fixes (pós D.3+D.4)

Correções aplicadas após o Supabase Advisor flagar 2 issues nos batches D.3+D.4:

## Issues corrigidas

### 1. `conversation_delivery_status` — RLS sem policies
- **Issue**: tabela com RLS habilitado mas sem nenhuma policy → totalmente bloqueada
- **Fix**: 3 policies adicionadas (service_role manage, user read próprio via JOIN com event_history+audit_logs, admin/supervisor read all)

### 2. `cleanup_webhook_logs` — SECURITY DEFINER sem search_path
- **Issue**: `function_search_path_mutable` (advisor classico)
- **Fix**: `CREATE OR REPLACE FUNCTION ... SET search_path = 'public'`

## Issues NÃO corrigidas (preexistentes, fora do escopo)

17 tabelas `_backup_*` sem RLS — criadas em outros projetos como backup operacional. Pertencem a outras PRs/decisões; não bloqueiam este merge.

## Validação após aplicação
```sql
-- public_tables_rls_no_policies: 0
-- functions_secdef_no_searchpath em escopo D.3+D.4: 0
```
