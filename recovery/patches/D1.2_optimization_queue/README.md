# 📦 D1.2 / optimization / queue

> **Título:** Optimization Queue
> **Prioridade:** P1
> **Status:** ⏳ aguardando aprovação do sponsor pra aplicar

## 🎯 Objetivo
Queue de jobs assíncronos para otimizações em background (sync de dados externos, recálculo de scores, batch jobs).

**Por que crítico:** 5 RPCs deste módulo são chamadas pelo frontend (cron jobs, auto-tests, dashboards admin). Sem isso, queue inerte e jobs perdidos.

## 📊 O que esse patch cria

| Tipo | Quantidade |
|---|---|
| Tabelas | 1 |
| Indexes | 1 |
| Policies (RLS) | 1 |
| Constraints (ALTERs) | 5 |
| Functions | 6 |

### Tabelas
- `public.optimization_queue`

### Functions
- `public.claim_next_optimization()`
- `public.complete_optimization()`
- `public.enqueue_optimization()`
- `public.reset_optimization_queue()`
- `public.get_auto_test_job_status()`
- `public.set_optimization_queue_updated_at()`

## 🔗 Dependências
- função `is_admin()` (já existe)
- função `auth.uid()` (built-in)

## ⚠️ Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| Tabela `optimization_queue` recriada vazia (não existe no destino) | 🟡 BAIXO | Tabela nova — sem dados pra perder |
| Funções de claim/complete usam row-locking (SKIP LOCKED) — comportamento ok em PG 17 | 🟡 BAIXO | Padrão consagrado de queue PG |
| RPCs podem precisar de role granting (REVOKE/GRANT pra anon/authenticated) | 🟡 MEDIO | validate.sql verifica + smoke_test checa |

## 🔄 Workflow
```
1. backup.sql     → snapshot pré-patch (se houver objetos preexistentes)
2. patch.sql     → aplica em transação atômica idempotente
3. validate.sql  → confirma que tudo foi criado e funciona
4. smoke_test    → checklist manual no app
```

## 📊 Origem
- Extraído automaticamente de `recovery/block01_tables_indexes_rls.sql` (tabelas, indexes)
- `recovery/block03_policies.sql` (policies)
- `recovery/block04_functions.sql` (funções)
- Idempotência: `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` + `CREATE POLICY`, `CREATE OR REPLACE FUNCTION`, ALTERs em `DO BEGIN/EXCEPTION` blocks



---
📅 **Gerado:** 2026-05-11T18:46:35.361Z
🤖 **Por:** Claude (script de extração Node.js)
