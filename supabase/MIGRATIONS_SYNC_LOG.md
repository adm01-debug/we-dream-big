# Migration Sync Log

## 2026-05-23 — Reconciliação completa

| Banco | Versões | Arquivos repo | Diff |
|---|---|---|---|
| `doufsxqlfjyuvxuezpln` | 775 | 775 | 0 |
| `pqp` | 775 | 775 | 0 |

### Trabalho realizado

1. 37 arquivos órfãos adicionados ao repo (SQL de `schema_migrations.statements`)
2. 1 duplicata `20260515120000` removida do repo
3. 40 marker rows inseridos em `doufsxqlfjyuvxuezpln` (versões repo-only)
4. 760 marker rows inseridos em `pqp` (versões repo-only)
5. 15 stubs pqp alias adicionados ao repo (`SELECT 1;` no-ops)
6. 15 marker rows inseridos em `doufsxqlfjyuvxuezpln` para os stubs pqp

### Fix durável (Fase 3)

Trocar conexão Lovable de `pqp` → `doufsxqlfjyuvxuezpln` no painel Lovable.
