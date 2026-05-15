# 🎯 TASK — FASE 1 — Snapshot do banco atual

**De:** Gerente
**Para:** Agente DB
**Prioridade:** ALTA — fundamento de tudo (precisa antes de qualquer mudança)

## 📋 Objetivo

Capturar o estado COMPLETO do banco atual (`doufsxqlfjyuvxuezpln`) ANTES de qualquer modificação. É nosso "ponto de retorno" se algo der errado.

Como não temos `pg_dump` via MCP, o snapshot é via queries SQL que extraem metadata para arquivos JSON/SQL.

## 🛡️ Restrições

- ✅ **READ-ONLY** — só SELECT, nunca CREATE/INSERT/UPDATE/DELETE
- ✅ Use **Supabase MCP** (projeto `doufsxqlfjyuvxuezpln`)
- ✅ Salve TUDO em `/workspace/repos/Promo_Gifts/recovery/snapshots/2026-05-11_pre_recovery/`
- ❌ NÃO toque em nenhuma tabela
- ❌ NÃO faça `apply_migration`
- ❌ NÃO crie branch dev ainda (isso é Fase 2)

## ✅ Entregáveis (15 arquivos)

Crie o diretório `recovery/snapshots/2026-05-11_pre_recovery/` e gere:

### 1️⃣ Estrutura (information_schema)
- `01_tables.json` — todas tabelas do schema public + colunas + tipos + nullable + defaults
- `02_views.json` — todas as views
- `03_columns.json` — view detalhada com character_maximum_length, numeric_precision, etc

### 2️⃣ Functions & Triggers
- `04_functions.json` — pg_proc completo (nome, body, return_type, language)
- `05_triggers.json` — pg_trigger + event_object_table + action_statement

### 3️⃣ Constraints & Indexes
- `06_constraints.json` — pg_constraint (PK, FK, UNIQUE, CHECK)
- `07_indexes.json` — pg_indexes (schemaname, tablename, indexname, indexdef)

### 4️⃣ RLS & Policies
- `08_rls_status.json` — quais tabelas têm RLS habilitado
- `09_policies.json` — pg_policies (tablename, policyname, permissive, roles, cmd, qual, with_check)

### 5️⃣ Storage
- `10_storage_buckets.json` — storage.buckets
- `11_storage_policies.json` — policies em storage.objects

### 6️⃣ Outras
- `12_extensions.json` — pg_extension
- `13_cron_jobs.json` — cron.job (se houver)
- `14_realtime_publication.json` — pg_publication + pg_publication_tables
- `15_migrations.json` — supabase_migrations.schema_migrations

### 🗂️ Resumo
- `_SUMMARY.md` — arquivo Markdown com:
  - Contagens (X tabelas, Y functions, Z triggers, W policies, etc)
  - Tamanho total do snapshot
  - Hora de captura
  - Hash MD5 de cada arquivo (pra integridade)

## 📝 Queries de referência

Use queries assim (via `Supabase:execute_sql` ou MCPs equivalentes):

```sql
-- 01_tables.json
SELECT
  table_schema, table_name, table_type,
  (SELECT json_agg(json_build_object(
    'column_name', column_name,
    'data_type', data_type,
    'is_nullable', is_nullable,
    'column_default', column_default,
    'ordinal_position', ordinal_position
  ) ORDER BY ordinal_position)
   FROM information_schema.columns
   WHERE table_schema = t.table_schema AND table_name = t.table_name
  ) AS columns
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 04_functions.json (cuidado com tamanho)
SELECT
  n.nspname AS schema,
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_functiondef(p.oid) AS body,
  l.lanname AS language
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- 09_policies.json
SELECT * FROM pg_policies WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, policyname;
```

**ATENÇÃO:** queries grandes podem estourar limite de resultado. Pagine se necessário:
```sql
LIMIT 100 OFFSET N
```
ou divida por letra inicial do nome.

## 📊 Validação self-check

Antes de marcar a fase como concluída, verifique:

- [ ] Os 15 arquivos JSON foram criados em `recovery/snapshots/2026-05-11_pre_recovery/`
- [ ] Cada JSON é válido (parse com `python3 -m json.tool < arquivo.json > /dev/null`)
- [ ] `01_tables.json` tem ~195 tabelas (deve bater com SELECT COUNT atual)
- [ ] `04_functions.json` tem 50+ functions
- [ ] `09_policies.json` tem 100+ policies
- [ ] `_SUMMARY.md` está completo com contagens e hashes

## 📡 Como responder

1. Atualize `EXECUTION_LOG.md` no topo com o formato:

```markdown
## 2026-05-11 HH:MM — FASE 1 — Snapshot do banco atual

**Status:** ✅ CONCLUÍDA

### O que fiz
- Conectei no Supabase MCP (projeto doufsxqlfjyuvxuezpln)
- Rodei 15 queries SELECT
- Salvei resultados em recovery/snapshots/2026-05-11_pre_recovery/

### Resultado
- 15 arquivos JSON criados
- Tamanho total: X MB
- _SUMMARY.md gerado com hashes MD5

### Contagens
- Tabelas: 195
- Functions: X
- Triggers: X
- Policies: X
- Buckets: 1 (só scripts)
- Cron jobs: X
- Migrations aplicadas: 204
- Extensions: X

### Validação self-check
- [x] 15 arquivos criados
- [x] Todos JSONs válidos
- [x] Hashes calculados
- [x] _SUMMARY.md completo

### Próximo passo
Aguardar review do Gerente. Próxima fase: 2 (criar branch dev no Supabase).
```

2. Commit em `recovery/lovable-introspection`:
```bash
git add recovery/snapshots/
git commit -m "feat(recovery): [OK] Fase 1 — snapshot completo do banco atual (15 arquivos)"
git push
```

3. Atualize `progress.md` mudando Fase 1 de 🟦 → ✅

## 🚦 NÃO fazer

- ❌ Não avance pra Fase 2 sem comando explícito do Gerente
- ❌ Não modifique nenhuma tabela do banco
- ❌ Não tente criar branch dev ainda
