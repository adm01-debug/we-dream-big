---
name: connections-hub
description: Hub central /admin/conexoes — 5 abas, 7 tabelas, 6 edge functions (incluindo health-check cron 15min), crons, health card, auditoria, rotação de secrets, replay, circuit breaker, timeline por conexão, dashboard inbound, catálogo de eventos SSOT, exportação CSV/JSON, playground de testes
type: feature
---

# Connections Hub — `/admin/conexoes`

## Abas (5)
Bancos · Bitrix24 · n8n · MCP · Webhooks (sub-abas: Saída + **Playground** / Entrada / Eventos recebidos / Entregas falhas).

## Tabelas (7)
`external_connections` (+ `auto_test_enabled` toggle por conexão; **auto-registra** todos os tipos no 1º teste — runner usa upsert por `type,name` quando `env_key` é null, índice parcial `external_connections_type_name_no_env_uidx`; status definido como `active` em sucesso, `error` em falha), `outbound_webhooks` (+ `consecutive_failures`, `auto_disabled_at`, `auto_disabled_reason`), `webhook_deliveries`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `mcp_api_keys`, `secret_rotation_log`, `connection_test_history` (+ `attempts`; retenção automática 200/conexão via trigger), `system_settings` (key/value admin tunables, ex: `connection_failure_window_minutes`).

## Edge functions (6)
`secrets-manager` · `connection-tester` (+ grava `connection_test_history`) · `webhook-dispatcher` (+ replay + circuit breaker + **`test_mode`**) · `webhook-inbound` · `mcp-server` · **`connections-health-check`** (cron `*/15 * * * *`, dedupe 4h via `workspace_notifications.metadata.incident_key`).

## Onda 11 — hardening
- Rotação versionada (`SecretField` + `secret_rotation_log`)
- Replay manual (`FailedDeliveriesPanel`)
- Circuit breaker (`active=false` após 5 falhas seguidas)
- Health card com alertas para staleSecrets/autoDisabled

## Onda 12 — observabilidade & DX
- `ConnectionTimelineDrawer` (sparkline 7d + top 5 erros)
- `InboundEventsPanel` (KPIs + barras stacked + JSON viewer)
- `EventsMultiSelect` (catálogo SSOT em `webhook-events-catalog.ts`, 16 eventos)

## Onda 13 — classe enterprise (10/10 ⇒ 11/10)
- **#7 Notificações proativas**: edge `connections-health-check` + cron 15min insere `workspace_notifications` (categoria `integrations`) para webhooks auto-desabilitados, secrets >90d e conexões caídas. Dedupe 4h por `incident_key`. **Janela de falha contínua configurável** (RPC admin `set_connection_failure_window_minutes` — 0/15/30/60/120/240min, default 30min, persistido em `system_settings`): só notifica `connection_down` se nenhum teste sucesso ocorreu dentro da janela (suprime flaps). Card UI `FailureWindowCard` em `/admin/conexoes`.
- **#8 Exportação**: componente `ExportButton` reusável (CSV + JSON, sem deps extras — usa `trends-export.ts`). Aplicado em Timeline, Inbound events e Failed deliveries.
- **#9 Playground**: `WebhookPlaygroundPanel` na sub-aba "Saída" com seleção de webhook + evento do catálogo, payload de exemplo editável (`webhook-events-payload-samples.ts` com 16 amostras), disparo via `webhook-dispatcher` em `test_mode=true` (não conta `consecutive_failures`, não persiste em `webhook_deliveries`, não aciona breaker).
- **#10 Status do job auto-test**: `AutoTestJobStatusCard` em `/admin/conexoes` agrega `connection_test_history` (cron) por minuto via RPC admin `get_auto_test_job_status` (últimos 7d, 100 runs). Mostra: KPIs do último run (quando, duração, OK/falha), taxa de sucesso 24h e tabela com latência média + contagem de retries por execução. Polling 60s.

## Crons
- `webhook-retry-failed` `*/10 * * * *`
- `connections-health-check` `*/15 * * * *` (Onda 13)
- `connections-auto-test` (configurável via UI: 5/10/15/30/60/120/240min — RPC `set_connections_auto_test_interval` admin-only com auditoria; respeita `auto_test_enabled` por conexão; **até 2 retries automáticos em erros transitórios** — timeout/network/dns/5xx — com backoff escalonado 500ms→1500ms→3000ms; cada tentativa intermediária roda com `skipPersistence` e apenas o resultado final é gravado em `connection_test_history` com a coluna `attempts` real; badge `2×`/`3×` no painel "Últimos testes")
- `webhook-logs-cleanup-daily` `30 3 * * *`
