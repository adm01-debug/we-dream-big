# Edge Functions — Imports de `_shared/*`

Total functions: **85**

Com pelo menos 1 import: **85** | Sem imports de _shared: **0**

## §1. Uso por arquivo compartilhado

| Arquivo `_shared/` | Funções que usam |
|---|---|
| `cors.ts` | 85 |
| `bot-protection.ts` | 19 |
| `supabase-client-adapter.ts` | 18 |
| `auth.ts` | 16 |
| `zod-validate.ts` | 15 |
| `request-id.ts` | 12 |
| `ai-usage.ts` | 11 |
| `external-fetch.ts` | 7 |
| `audit-log.ts` | 7 |
| `credentials.ts` | 6 |
| `rate-limiter.ts` | 5 |
| `json-parser.ts` | 4 |
| `mcp-violations.ts` | 4 |
| `authorize.ts` | 3 |
| `structured-logger.ts` | 3 |
| `mcp-scopes.ts` | 3 |
| `connection-test-runner.ts` | 2 |
| `circuit-breaker.ts` | 2 |
| `connection-timeouts.ts` | 1 |
| `cors-snapshot.json` | 1 |
| `external-db-config.ts` | 1 |
| `external-db-aliases.ts` | 1 |
| `external-db-telemetry.ts` | 1 |
| `external-db-cache.ts` | 1 |
| `retry-backoff.ts` | 1 |
| `security.ts` | 1 |

## §2. Imports por edge function

### `ai-recommendations`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/rate-limiter.ts` | `rate-limiter.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/json-parser.ts` | `json-parser.ts` |

### `analyze-logo-colors`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `bi-copilot`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `bi-share-dossier`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `bitrix-sync`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/authorize.ts` | `authorize.ts` |
| `../_shared/external-fetch.ts` | `external-fetch.ts` |

### `block-ip-temporarily`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `categories-api`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |

### `cleanup-notifications`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `cleanup-novelties`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `cnpj-lookup`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/external-fetch.ts` | `external-fetch.ts` |

### `collections-public-react`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `collections-watcher`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `commemorative-dates`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |

### `comparison-ai-advisor`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `comparison-price-watcher`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `comparisons-public-react`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `connection-tester`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/connection-test-runner.ts` | `connection-test-runner.ts` |

### `connections-auto-test`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/connection-test-runner.ts` | `connection-test-runner.ts` |
| `../_shared/connection-timeouts.ts` | `connection-timeouts.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `connections-health-check`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `connections-hub-audit`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/audit-log.ts` | `audit-log.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |

### `cors-audit`

| Caminho original | Arquivo |
|---|---|
| `../_shared/structured-logger.ts` | `structured-logger.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/authorize.ts` | `authorize.ts` |
| `../_shared/cors-snapshot.json` | `cors-snapshot.json` |

### `crm-db-bridge`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/circuit-breaker.ts` | `circuit-breaker.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/credentials.ts` | `credentials.ts` |

### `detect-new-device`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `dropbox-list`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/external-fetch.ts` | `external-fetch.ts` |

### `e2e-cleanup`

| Caminho original | Arquivo |
|---|---|
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |
| `../_shared/cors.ts` | `cors.ts` |

### `elevenlabs-scribe-token`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/external-fetch.ts` | `external-fetch.ts` |

### `elevenlabs-tts`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/external-fetch.ts` | `external-fetch.ts` |

### `expert-chat`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/rate-limiter.ts` | `rate-limiter.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/credentials.ts` | `credentials.ts` |
| `../_shared/json-parser.ts` | `json-parser.ts` |

### `external-db-bridge`

| Caminho original | Arquivo |
|---|---|
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/external-db-config.ts` | `external-db-config.ts` |
| `../_shared/external-db-aliases.ts` | `external-db-aliases.ts` |
| `../_shared/external-db-telemetry.ts` | `external-db-telemetry.ts` |
| `../_shared/external-db-cache.ts` | `external-db-cache.ts` |
| `../_shared/circuit-breaker.ts` | `circuit-breaker.ts` |
| `../_shared/retry-backoff.ts` | `retry-backoff.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/credentials.ts` | `credentials.ts` |

### `external-db-inspect`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `favorites-public-react`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `favorites-watcher`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `force-global-logout`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `full-op-diagnostics`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `generate-ad-image`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `generate-ad-prompt`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `generate-mockup`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/json-parser.ts` | `json-parser.ts` |

### `generate-mockup-nanobanana`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `generate-product-seo`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `get-visitor-info`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `github-credentials-test`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `github-fix-config`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/authorize.ts` | `authorize.ts` |

### `health-check`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/structured-logger.ts` | `structured-logger.ts` |

### `image-proxy`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/external-fetch.ts` | `external-fetch.ts` |

### `kit-ai-builder`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `kit-identity-suggest`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `kit-public-view`

| Caminho original | Arquivo |
|---|---|
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/cors.ts` | `cors.ts` |

### `log-login-attempt`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/rate-limiter.ts` | `rate-limiter.ts` |

### `magic-up-score`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `manage-users`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |
| `../_shared/json-parser.ts` | `json-parser.ts` |

### `market-intelligence-insights`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |

### `materials-api`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |

### `mcp-keys-issue`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/mcp-scopes.ts` | `mcp-scopes.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/audit-log.ts` | `audit-log.ts` |
| `../_shared/mcp-violations.ts` | `mcp-violations.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `mcp-keys-revoke`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/audit-log.ts` | `audit-log.ts` |
| `../_shared/mcp-violations.ts` | `mcp-violations.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `mcp-keys-rotate`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/mcp-scopes.ts` | `mcp-scopes.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/audit-log.ts` | `audit-log.ts` |
| `../_shared/mcp-violations.ts` | `mcp-violations.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `mcp-keys-update`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/mcp-scopes.ts` | `mcp-scopes.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/audit-log.ts` | `audit-log.ts` |
| `../_shared/mcp-violations.ts` | `mcp-violations.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `mcp-server`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/audit-log.ts` | `audit-log.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `ownership-audit`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `ownership-repair`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `process-queue`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `process-scheduled-reports`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `product-webhook`

| Caminho original | Arquivo |
|---|---|
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/cors.ts` | `cors.ts` |

### `quote-followup-reminders`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `quote-public-view`

| Caminho original | Arquivo |
|---|---|
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |
| `../_shared/credentials.ts` | `credentials.ts` |
| `../_shared/cors.ts` | `cors.ts` |

### `quote-sync`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/credentials.ts` | `credentials.ts` |

### `rate-limit-check`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/security.ts` | `security.ts` |

### `rls-audit`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `rls-integration-tests`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `rls-matrix-export`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `secrets-manager`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/credentials.ts` | `credentials.ts` |
| `../_shared/audit-log.ts` | `audit-log.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |

### `secure-upload`

| Caminho original | Arquivo |
|---|---|
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/structured-logger.ts` | `structured-logger.ts` |
| `../_shared/request-id.ts` | `request-id.ts` |
| `../_shared/cors.ts` | `cors.ts` |

### `semantic-search`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/rate-limiter.ts` | `rate-limiter.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `send-digest`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `send-notification`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `send-scheduled-reports`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `send-transactional-email`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `step-up-verify`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/supabase-client-adapter.ts` | `supabase-client-adapter.ts` |

### `sync-quote-bitrix`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/external-fetch.ts` | `external-fetch.ts` |

### `trends-insights`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `validate-access`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `verify-email`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `visual-search`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/zod-validate.ts` | `zod-validate.ts` |
| `../_shared/rate-limiter.ts` | `rate-limiter.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `voice-agent`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |
| `../_shared/auth.ts` | `auth.ts` |
| `../_shared/ai-usage.ts` | `ai-usage.ts` |
| `../_shared/bot-protection.ts` | `bot-protection.ts` |

### `webhook-dispatcher`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

### `webhook-inbound`

| Caminho original | Arquivo |
|---|---|
| `../_shared/cors.ts` | `cors.ts` |

## §3. Funções sem imports de `_shared/`

