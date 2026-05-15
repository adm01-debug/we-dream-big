# BATCH D.2 — COMPLETO ✅

**Data:** 11/MAY/2026
**Status:** 5/5 sub-patches aplicados com sucesso

## Sub-patches aplicados

### D.2.4 — External Connections ⭐ (fechou FK do D.1)
- 1 table: `external_connections` (CRÍTICA)
- 5 RPCs: get/set_connection_failure_window_minutes, get/set_connections_auto_test_interval, sync_external_connections_from_credentials (+ overload)
- FK fechado: `connection_test_history.connection_id → external_connections.id`

### D.2.1 — Security & Audit Logs
- 7 tables: access_security_settings, audit_logs, auth_login_attempts, geo_allowed_countries, hardening_health_snapshots, rls_denial_log, step_up_audit_log
- 4 RPCs: log_access_denied, log_rls_denial, log_user_logout, check_hardening_status
- Enum step_up_action criado
- admin_audit_log expandido: 9 → 16 cols (status, source, started_at, finished_at, duration_ms, request_id, payload_summary)

### D.2.2 — Outbound Webhooks
- 2 tables: outbound_webhooks, webhook_deliveries
- FK delivery → webhook CASCADE

### D.2.3 — MCP API Keys System
- 4 tables: mcp_api_keys, mcp_key_auto_revocations, mcp_full_grantors, mcp_access_violations
- 1 RPC: can_grant_mcp_full
- mcp_api_keys com FORCE RLS + 4 policies de bloqueio direto JWT

### D.2.5 — Telemetry & Monitoring
- 3 tables base: app_vitals, query_telemetry, webhook_delivery_metrics (sem partitioning)
- 6 RPCs: get_app_health_summary, get_platform_failure_metrics, check_telemetry_regression, lookup_request_id, record_dev_route_telemetry, record_platform_failure

## Decisions tomadas

### Decision 005 — D.2.5 expandido com deps
Tables app_vitals, query_telemetry, webhook_delivery_metrics estavam em deps das funcs D.2.5 mas não no plano original. Adicionadas ao patch.

### Decision 006 — Adaptação schema system_settings
Schema do dump (`key`/`value`) ≠ schema destino (`setting_key`/`setting_value`). RPCs adaptadas inicialmente, mas Decision 007 reverteu.

### Decision 007 — Plano A'' (segundo RENAME)
Mesma estratégia da Decision 004 aplicada a `system_settings`:
- Backup `_backup_system_settings_legacy_20260511` (78 rows)
- RENAME `system_settings` → `system_settings_legacy` (preserva 78 rows + UNIQUE + PK + policy renomeados)
- CREATE `system_settings` novo com schema Lovable (key text PK, value jsonb, updated_by uuid, updated_at)
- RPCs aplicadas com schema original do dump

## Totais D.2

- **15 tables novas** (14 + system_settings) + 1 renomeada (system_settings_legacy)
- **16 RPCs novas** (todas com SECURITY DEFINER + search_path)
- **1 enum** (step_up_action)
- **7 colunas** adicionadas a admin_audit_log
- **1 FK** fechado retroativamente (D.1 pendência resolvida)
- **78 rows** preservados em system_settings_legacy

## Smoke test (consolidado)

- ✅ 19/19 tables D.2 com RLS habilitado
- ✅ 15/16 funcs com search_path setado
- ✅ FK connection_test_history fechado
- ✅ Data B2B D.1 preservada: 7 + 4433 rows
- ✅ 11/11 funcs executam funcionalmente
- ✅ 3 funcs protegidas por admin retornam "forbidden" corretamente

## Próximos passos

- **D.3**: P3 features (Magic Up, Expert chat, Voice commands)
- **D.4**: Completude (107 RPCs + 41 tables não-críticas + cron jobs)
- **D.5**: Validação final + deploy

## Pendências
- ⚠️ Cosmético: policies de `b2b_collection_products` ainda com nome legacy `collection_products_*`
- ⚠️ Off-DB: types.ts não regenerado (Supabase CLI requer Lovable conectado)
