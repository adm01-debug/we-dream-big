# 📦 D1.5 / dashboard / widgets

> **Título:** Dashboard Widgets RPCs + user_comparisons table
> **Prioridade:** P1
> **Status:** ⏳ aguardando aprovação do sponsor pra aplicar

## 🎯 Objetivo
6 RPCs para widgets de dashboard: top produtos colecionados/comparados/favoritados, contadores semanais e comparações recentes.

**Por que crítico:** Dashboard admin DEPENDE dessas 6 RPCs. Hoje retorna HTTP 404 → widgets em branco no painel.

## 📊 O que esse patch cria

| Tipo | Quantidade |
|---|---|
| Tabelas | 1 |
| Indexes | 3 |
| Policies (RLS) | 5 |
| Constraints (ALTERs) | 3 |
| Functions | 6 |

### Tabelas
- `public.user_comparisons`

### Functions
- `public.get_top_collected_products()`
- `public.get_top_compared_products()`
- `public.get_top_favorited_products()`
- `public.get_collections_weekly_count()`
- `public.get_favorites_weekly_count()`
- `public.get_user_recent_comparisons()`

## 🔗 Dependências
- tabelas `collections`, `favorites`, `product_comparisons` (verificar)

## ⚠️ Riscos identificados

| Risco | Severidade | Mitigação |
|---|---|---|
| Funções só leem dados (sem DDL) — risco mínimo | 🟡 BAIXO | N/A |
| Performance: agregações sobre tabelas grandes podem ser lentas | 🟡 BAIXO | validate.sql mede tempo de execução das 6 RPCs |
| Dependem das tables `collections`, `collection_products`, `favorites`, `product_comparisons` existirem | 🟡 MEDIO | validate.sql confere todas antes |

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
📅 **Gerado:** 2026-05-11T18:46:35.374Z
🤖 **Por:** Claude (script de extração Node.js)
