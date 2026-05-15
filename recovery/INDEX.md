# 📑 INDEX — supabase-export

Mapa único de navegação. Todos os arquivos abaixo existem fisicamente em `/mnt/documents/supabase-export/`.
Use `Ctrl+F` para localizar um termo (ex.: `realtime`, `cron`, `secrets`, `auth`).

---

## 🚀 Entrada rápida

| Arquivo | Descrição |
|--------|-----------|
| [`README.md`](./README.md) | Visão geral, ordem de execução, opções A/B, diagrama de dependências e comandos `--only/--from`. |
| [`run_all.sh`](./run_all.sh) | Runner completo com flags (`--only`, `--from`, `--list`, `--dry-run`); execução por blocos. |
| [`run_blocks.sh`](./run_blocks.sh) | Runner minimalista, fail-fast, ordem canônica do README. |

---

## 🗄️ Schema base (ordem de aplicação)

| # | Arquivo | Descrição |
|---|---------|-----------|
| 08 | [`block08_extensions.sql`](./block08_extensions.sql) | Extensões Postgres (pgcrypto, pg_cron, pg_net, uuid-ossp etc.) — **rodar primeiro**. |
| 02 | [`block02_types.sql`](./block02_types.sql) | `CREATE TYPE` (enums e composite types do schema `public`). |
| 01 | [`block01_tables_indexes_rls.sql`](./block01_tables_indexes_rls.sql) | Tabelas, índices e `ENABLE ROW LEVEL SECURITY` (DDL principal). |
| 04 | [`block04_functions.sql`](./block04_functions.sql) | Funções `plpgsql`/`sql` (incluindo `SECURITY DEFINER`). |
| 05 | [`block05_triggers.sql`](./block05_triggers.sql) | Triggers (numeração `PED-YY-XXXX`, `OR-YY-XXXX`, `updated_at`, validações). |
| 07 | [`block07_sequences.sql`](./block07_sequences.sql) | Sequences standalone — **vazio**: numeração é via trigger e PKs são UUID. |
| 06 | [`block06_views.sql`](./block06_views.sql) | Views e materialized views. |
| 03 | [`block03_policies.sql`](./block03_policies.sql) | RLS policies (`CREATE POLICY ...`) — **rodar após** funções (depende de helpers). |

### Schema completo (alternativa ao por-bloco)

| Arquivo | Descrição |
|---------|-----------|
| [`full-public-schema.sql`](./full-public-schema.sql) | Dump consolidado de todo o schema `public` (alternativa monolítica aos blocos 01–08). |
| [`_other.sql`](./_other.sql) | Objetos avulsos não classificados nos blocos numerados. |

---

## 🪣 Storage / Realtime / Cron

| Arquivo | Descrição |
|---------|-----------|
| [`block09_storage.sql`](./block09_storage.sql) | Buckets `storage.buckets` (criação + flags `public`). |
| [`block09b_storage_policies_full.sql`](./block09b_storage_policies_full.sql) | Policies `storage.objects` (logos, personalização, uploads, leitura pública). |
| [`block09b_storage_policies_full.md`](./block09b_storage_policies_full.md) | Documentação por bucket: matriz quem-pode-fazer-o-quê. |
| [`block10_realtime.sql`](./block10_realtime.sql) | `ALTER PUBLICATION supabase_realtime ADD TABLE …` (tabelas pub/sub). |
| [`block10b_replica_identity_benchmark.md`](./block10b_replica_identity_benchmark.md) | Benchmark `REPLICA IDENTITY DEFAULT vs FULL` (custo/WAL). |
| [`block10c_replica_identity_full_column_leak.md`](./block10c_replica_identity_full_column_leak.md) | Risco de vazamento de colunas com `REPLICA IDENTITY FULL` + RLS. |
| [`block11_cron_jobs.sql`](./block11_cron_jobs.sql) | `cron.schedule(...)` — todos os jobs `pg_cron` do projeto. |
| [`block11_cron_status_report.sql`](./block11_cron_status_report.sql) | Relatório de status dos jobs (último run, falhas, tempo médio). |

---

## 🔐 Auth / Hooks / Webhooks

| Arquivo | Descrição |
|---------|-----------|
| [`block14_auth_config.md`](./block14_auth_config.md) | Configuração `auth` (providers, JWT, session, MFA, redirect URLs). |
| [`block16_auth_hooks.md`](./block16_auth_hooks.md) | Inventário dos hooks de auth (`before_user_created`, `mfa_verification_attempt` etc.). |
| [`block16_auth_hooks_validation.sql`](./block16_auth_hooks_validation.sql) | Validação SQL: cobertura RLS (S/I/U/D), bloqueio de `anon`, presença de hooks. |
| [`block17_database_webhooks.md`](./block17_database_webhooks.md) | Database webhooks ativos (tabela → endpoint, headers, retries). |

---

## 📡 Realtime — Diagnóstico

| Arquivo | Descrição |
|---------|-----------|
| [`block18_realtime_diagnostics.sql`](./block18_realtime_diagnostics.sql) | Queries de diagnóstico Realtime (publication, RLS de `realtime.messages`, identity). |

---

## 🔑 Secrets / Edge Functions

| Arquivo | Descrição |
|---------|-----------|
| [`block19_secrets_inventory.md`](./block19_secrets_inventory.md) | Inventário de secrets (somente nomes) declarados no Cloud + diff vs uso no código. |
| [`block12_edge_functions_batch1.md`](./block12_edge_functions_batch1.md) | Edge Functions — Lote 1 (auth/ownership). |
| [`block12_edge_functions_batch2.md`](./block12_edge_functions_batch2.md) | Edge Functions — Lote 2 (CRM/quote sync). |
| [`block12_edge_functions_batch3.md`](./block12_edge_functions_batch3.md) | Edge Functions — Lote 3 (favorites/collections/comparison public). |
| [`block12_edge_functions_batch4.md`](./block12_edge_functions_batch4.md) | Edge Functions — Lote 4 (MCP keys, full-op-diagnostics). |
| [`block12_edge_functions_batch5.md`](./block12_edge_functions_batch5.md) | Edge Functions — Lote 5 (observability, webhook-alerts-monitor, cors-audit). |
| [`block20_edge_functions_auth_audit.md`](./block20_edge_functions_auth_audit.md) | Auditoria de auth por edge (`verify_jwt`, `authorize`, MFA, public-intent). |
| [`block21_edge_shared_imports_audit.md`](./block21_edge_shared_imports_audit.md) | Mapa de imports `_shared/*` (CORS, logger, authorize, zod schemas). |
| [`block22_edge_secrets_inventory.md`](./block22_edge_secrets_inventory.md) | `Deno.env.get(...)` por função — quais secrets cada edge consome. |

---

## 📜 Histórico

| Arquivo | Descrição |
|---------|-----------|
| [`block15_migrations_history.md`](./block15_migrations_history.md) | Histórico das migrations aplicadas (timestamp + escopo). |

---

## 🛠️ Scripts utilitários

| Arquivo | Descrição |
|---------|-----------|
| [`scripts/diff_validation.sh`](./scripts/diff_validation.sh) | Compara saída de SQL de validação entre 2+ ambientes (OK/MISSING/WARN/FAIL). |
| [`scripts/gen_summary.sh`](./scripts/gen_summary.sh) | Gera tabela markdown com tamanho, linhas e contagem de objetos por bloco. |

---

## 🧪 Exemplos de código

| Arquivo | Descrição |
|---------|-----------|
| [`examples/RealtimeMessagesExample.tsx`](./examples/RealtimeMessagesExample.tsx) | Exemplo React de assinatura `postgres_changes` em `messages` com canal privado. |

---

## 🆕 Migrations recentes (aplicadas no projeto)

| Arquivo | Descrição |
|---------|-----------|
| [`migrations/20260511123935_f45f50db-bcac-46e4-8542-e438396d69be.sql`](./migrations/20260511123935_f45f50db-bcac-46e4-8542-e438396d69be.sql) | Função `purge_expired_step_up_artifacts` + cron `*/15 * * * *` para limpar challenges/tokens expirados. |

---

## 💡 Dicas de uso

- **Restaurar tudo num ambiente novo:** `./run_blocks.sh "$DATABASE_URL"` (fail-fast) ou `./run_all.sh --only block08,block02,...`.
- **Apenas um bloco:** `./run_all.sh --only block11`.
- **A partir de um ponto:** `./run_all.sh --from block09`.
- **Listar blocos disponíveis:** `./run_all.sh --list`.
- **Comparar ambientes:** `./scripts/diff_validation.sh ./block16_auth_hooks_validation.sql dev="$DEV_URL" prod="$PROD_URL"`.
- **Provisionar secrets:** abra [`block19_secrets_inventory.md`](./block19_secrets_inventory.md) e [`block22_edge_secrets_inventory.md`](./block22_edge_secrets_inventory.md) lado a lado — a seção "Diff" do 19 é seu checklist de `add_secret`.
