# 📦 D1.3 / collection / items

> **Título:** Collection Items v2
> **Prioridade:** P1
> **Status:** ⏳ aguardando aprovação do sponsor pra aplicar

## 🎯 Objetivo
Lixeira (soft-delete) para itens de coleções de produtos. Permite recuperação por 30 dias antes de cleanup automático.

**Por que crítico:** Funcionalidade do app Lovable que permite usuários reverter remoções acidentais de produtos das suas coleções.

## 📊 O que esse patch cria

| Tipo | Quantidade |
|---|---|
| Tabelas | 2 |
| Indexes | 5 |
| Policies (RLS) | 5 |
| Constraints (ALTERs) | 8 |
| Functions | 2 |

### Tabelas
- `public.collection_items`
- `public.collection_items_trash`

### Functions
- `public.move_collection_item_to_trash()`
- `public.cleanup_expired_collection_trash()`

## 🔗 Dependências
- função `auth.uid()`
- função `is_admin()` ou `has_role()`

## ⚠️ Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| Tabela `collection_items` pode COLIDIR com `collection_products` existente (alias semântico) | 🟡 ALTO | Decisão 003 do sponsor: coexistir, não migrar |
| Cron `cleanup_expired_collection_trash` precisa ser agendado | 🟡 MEDIO | Pós-patch: validar pg_cron + agendar manualmente |
| Trigger de soft-delete pode duplicar com trigger atual de `collection_products` | 🟡 MEDIO | validate.sql confirma triggers, smoke_test compara comportamentos |

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
📅 **Gerado:** 2026-05-11T18:46:35.371Z
🤖 **Por:** Claude (script de extração Node.js)
