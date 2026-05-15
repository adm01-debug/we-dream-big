---
name: hardening-roadmap
description: Roadmap de hardening 10/10 + ondas pós-meta de excelência contínua
type: feature
---

# Hardening Roadmap — 10/10 ATINGIDO ✅

**Score final:** 10/10 · **Score inicial:** 7.8/10

## Onda 1 ✅ COMPLETA (9/9)
ESLint CI, HIBP, Storage RLS, PR template, Dependabot, security headers, CHANGELOG, coverage 60%, Husky pre-push.

## Onda 2 ✅ COMPLETA (9/9)
Zod edge functions, CORS allow-list, Sentry, RLS audit, optimistic locking, EDGE_FUNCTIONS.md, Web Vitals, rate limiting, MFA TOTP.

## Onda 3 ✅ COMPLETA (10/10)
Refatoração modular, E2E Playwright, RLS personas, ADRs 0001-0005, ONBOARDING.md, DATA_DICTIONARY.md, bundle analyzer, PERFORMANCE_AUDIT.md, circuit breaker `external-db-bridge` + `crm-db-bridge`, POSTMORTEM_TEMPLATE.md.

## Onda 4 — Excelência Contínua ✅ COMPLETA (6/6)
ESLint local, `lint:check`/`typecheck` scripts, pre-push estendido, `external-fetch.ts` (`fetchWithBreaker`), `<DeprecatedRoute>`, E2E descontos+usuários, doc atualizada.

## Onda 5 — Excelência Operacional ✅ COMPLETA (6/6)
Adoção `fetchWithBreaker` em 8 edge functions, `<DeprecatedRoute>` montado, redirects descontos, lint baseline reduzido, Zod URL guard anti-SSRF, helper `circuitOpenResponse()`.

## Onda 6 — Inteligência de Mercado 10/10 ✅ COMPLETA (16/16)
Cache server-side `ai_insights_cache` (6h TTL), empty states, debounce, virtualização, telemetria `ai_usage_events`, painel admin, pg_cron cleanup, tooltips, animações.

## Onda 7 — Connections Hub ✅ COMPLETA
Hub `/admin/conexoes` com 5 abas (Bancos, Bitrix24, n8n, MCP, Webhooks), 5 edge functions (`secrets-manager`, `connection-tester`, `webhook-dispatcher`, `webhook-inbound`, `mcp-server`), 6 tabelas (`external_connections`, `outbound_webhooks`, `webhook_deliveries`, `inbound_webhook_endpoints`, `inbound_webhook_events`, `mcp_api_keys`), trigger `dispatch_quote_webhook_event` em quotes/orders/discount/kit_share_tokens.

## Onda 8 — Operacionalização ✅ COMPLETA (3/3)
1. Função `retry_failed_webhook_deliveries()` SECURITY DEFINER — re-invoca dispatcher para entregas com `success=false` e `attempt < max_attempts` da última hora.
2. Função `cleanup_webhook_logs()` — apaga `webhook_deliveries` e `inbound_webhook_events` > 90 dias.
3. Cron jobs: `webhook-retry-failed` (`*/10 * * * *`) e `webhook-logs-cleanup-daily` (`30 3 * * *`).

## Onda 10 — Auditoria Final ✅ COMPLETA (2026-04-19)
- **Edge function** `connections-hub-audit` (admin-only, GET) → JSON com checks de 6 tabelas, 5 edge functions, 2 crons do hub, 4 triggers + score 0-10.
- **Memória** atualizada: este roadmap + `mem://integrations/connections-hub` (quando criada).

## Adoção `fetchWithBreaker` por service

| Service       | Edge Functions                                    |
|---------------|---------------------------------------------------|
| `external-db` | external-db-bridge                                |
| `crm-db`      | crm-db-bridge                                     |
| `bitrix`      | bitrix-sync, sync-quote-bitrix                    |
| `cnpja`       | cnpj-lookup                                       |
| `dropbox`     | dropbox-list                                      |
| `elevenlabs`  | elevenlabs-tts, elevenlabs-scribe-token           |
| `image-cdn`   | image-proxy                                       |

Total: **8 edge functions** com graceful degradation (503+Retry-After:60 quando OPEN).

## Wire-ups
- Sentry: `VITE_SENTRY_DSN` em Build Secrets ativa em produção.
- CI RLS: `vitest tests/rls/` quando `TEST_SELLER_PASSWORD`+`TEST_ADMIN_PASSWORD` definidos.
- Pre-push: `npm run typecheck && npm run lint:check && npm run test`.
- Audit: `GET /functions/v1/connections-hub-audit` (admin Bearer).

## Onda 5 (Observability) — progresso
- Item 6: client logging em auth/quote/mcp ✅
- Item 7: gate CI `check-edge-structured-logging.mjs` ✅
- Item 8: instrumentação `magicUp.generate`, `magicUp.score`, `comparison.publicShare`, `connections.testCredentials` ✅ (2026-04-27)
- Item 9: bateria E2E auth+RLS+recovery ✅ (2026-04-27)
  - `e2e/flows/p0/06-auth-lifecycle.spec.ts` (5 testes — login válido/inválido, refresh 401, back após logout, purge de tokens)
  - `e2e/flows/p0/07-rls-enforcement.spec.ts` (4 testes — leitura cross-user, anon-deny, UPDATE alheio)
  - `e2e/flows/p0/08-password-recovery.spec.ts` (6 testes — token válido/sem-token, senha fraca, senhas divergentes, 5xx, anti-enumeration)
  - Smoke gate: testes 93 (login negativo), 94 (RLS guard), 95 (recovery sem token) em `flows/20-all-features-smoke.spec.ts`
