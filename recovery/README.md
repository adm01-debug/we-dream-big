# Supabase Export — Índice dos Blocos

Export do schema do projeto Supabase, fatiado em 11 blocos para facilitar
revisão, restauração parcial e diff. Todos os arquivos vivem nesta pasta
(`supabase-export/`) e são visíveis no painel de documentos.

---

## 📦 Blocos por ordem de execução

| #  | Arquivo                              | Tamanho   | Conteúdo                                                                 |
|----|--------------------------------------|----------:|--------------------------------------------------------------------------|
| 01 | `block01_tables_indexes_rls.sql`     | 200 KB    | `CREATE TABLE` (schema `public`) + índices + `ENABLE ROW LEVEL SECURITY` |
| 02 | `block02_types.sql`                  | 1.3 KB    | `CREATE TYPE` (enums e composites) — ex.: `app_role`                     |
| 03 | `block03_policies.sql`               | 91 KB     | `CREATE POLICY` (RLS) em todas as tabelas de `public`                    |
| 04 | `block04_functions.sql`              | 203 KB    | `CREATE FUNCTION` (incl. `SECURITY DEFINER`) — RPCs e helpers            |
| 05 | `block05_triggers.sql`               | 29 KB     | `CREATE TRIGGER` (timestamps, numeração `PED-YY-XXXX`/`OR-YY-XXXX`, etc.)|
| 06 | `block06_views.sql`                  | 1.2 KB    | 1 view: `v_full_scope_grants` (auditoria, `security_invoker=on`)         |
| 07 | `block07_sequences.sql`              | 890 B     | **Vazio por design** — não há sequences standalone (PKs usam UUID)       |
| 08 | `block08_extensions.sql`             | 1.2 KB    | 7 extensions: `pgcrypto`, `uuid-ossp`, `pg_trgm`, `pg_stat_statements`, `pg_net`, `pg_cron`, `supabase_vault` |
| 09 | `block09_storage.sql`                | 8.6 KB    | 6 buckets (todos privados) + 34 policies em `storage.objects`            |
| 10 | `block10_realtime.sql`               | 1.5 KB    | Publication `supabase_realtime` (idempotente) — **0 tabelas** (projeto usa polling 30s) |
| 11 | `block11_cron_jobs.sql`              | 2.3 KB    | **0 jobs ativos** + templates `cron.schedule` para HTTP / SQL puro       |

---

## 🗂️ Arquivos auxiliares

| Arquivo                       | Tamanho | Propósito                                                                 |
|-------------------------------|--------:|---------------------------------------------------------------------------|
| `full-public-schema.sql`      | 526 KB  | Dump consolidado do schema `public` (referência completa, não-fatiado)    |
| `_other.sql`                  | 98 B    | Sobras do dump que não se encaixam nos blocos acima                       |
| `README.md`                   | —       | Este arquivo                                                              |

---

## ▶️ Ordem de execução recomendada

Para restaurar o projeto **do zero** num banco PostgreSQL/Supabase novo:

```bash
# 1. Pré-requisitos (extensions e schemas)
psql "$DB_URL" -f block08_extensions.sql

# 2. Tipos enum/composite (precisam existir antes das tabelas que os usam)
psql "$DB_URL" -f block02_types.sql

# 3. Tabelas + índices + ENABLE RLS
psql "$DB_URL" -f block01_tables_indexes_rls.sql

# 4. Funções (algumas são chamadas por triggers/policies dos blocos seguintes)
psql "$DB_URL" -f block04_functions.sql

# 5. Triggers (dependem de funções)
psql "$DB_URL" -f block05_triggers.sql

# 6. Views (podem depender de funções)
psql "$DB_URL" -f block06_views.sql

# 7. Sequences (no-op neste projeto)
psql "$DB_URL" -f block07_sequences.sql

# 8. RLS policies (dependem de funções como is_supervisor_or_above)
psql "$DB_URL" -f block03_policies.sql

# 9. Storage buckets + policies (dependem de is_supervisor_or_above)
psql "$DB_URL" -f block09_storage.sql

# 10. Realtime publication
psql "$DB_URL" -f block10_realtime.sql

# 11. Cron jobs (revisar templates antes — há valores que precisam ser substituídos)
# psql "$DB_URL" -f block11_cron_jobs.sql
```

> ⚠️ **Importante:** o arquivo `block11_cron_jobs.sql` contém apenas templates
> comentados. Edite-o antes de executar (substituindo `<PROJECT_REF>`,
> `<ANON_KEY>`, etc.) e prefira `vault.create_secret()` em vez de hard-codar
> chaves.

---

## 🔑 Dependências entre blocos

```
08 (extensions)
  └─→ 02 (types)
        └─→ 01 (tables)
              ├─→ 04 (functions)
              │     ├─→ 05 (triggers)
              │     ├─→ 06 (views)
              │     ├─→ 03 (policies)
              │     └─→ 09 (storage)
              └─→ 10 (realtime)
                    └─→ 11 (cron jobs)
```

---

## 📝 Notas de design

- **PKs:** todas via `uuid DEFAULT gen_random_uuid()`. Por isso o Bloco 7 está vazio.
- **Numeração de negócio** (`PED-YY-XXXX`, `OR-YY-XXXX`): gerada por **triggers** (Bloco 5), não por sequences.
- **Realtime:** projeto usa **polling de 30s** em vez de Realtime (decisão de arquitetura). Publication existe mas sem tabelas.
- **Cron jobs:** nenhum job ativo neste banco. Em prod pode haver — sempre inspecionar com `SELECT * FROM cron.job;` no ambiente alvo.
- **Storage:** 6 buckets, todos `public=false`. Apenas `supplier-logos` tem leitura pública via policy.
