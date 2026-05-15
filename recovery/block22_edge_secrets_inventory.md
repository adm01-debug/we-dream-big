# Edge Functions — Inventário Centralizado de Secrets / Env Vars

Gerado a partir de ocorrências `Deno.env.get("...")` em `supabase/functions/**`.

- Secrets distintos: **33**
- Funções com pelo menos 1 secret: **81**

## §1. Inventário por secret (visão master)

| Secret | Categoria | Variável(eis) no código | # ocorrências | # funções |
|---|---|---|---:|---:|
| `ALLOW_HTTP_FETCH` | Feature flag | `allowHttp` | 1 | 1 |
| `BITRIX24_WEBHOOK_URL` | CRM sync | `bitrixWebhookUrl` | 1 | 1 |
| `BI_SHARE_SECRET` | Other | `(inline)` | 1 | 1 |
| `CNPJA_API_KEY` | Third-party API | `apiKey` | 1 | 1 |
| `CRM_SUPABASE_ANON_KEY` | CRM Supabase | `(inline)` | 1 | 1 |
| `CRM_SUPABASE_SERVICE_KEY` | CRM Supabase | `(inline)` | 1 | 1 |
| `CRM_SUPABASE_URL` | CRM Supabase | `(inline)` | 1 | 1 |
| `DROPBOX_ACCESS_TOKEN` | Third-party API | `accessToken` | 1 | 1 |
| `E2E_CLEANUP_ALLOWED_EMAILS` | E2E / Tests | `allowedRaw` | 1 | 1 |
| `E2E_CLEANUP_RATE_LIMIT_MAX` | E2E / Tests | `rlMax` | 1 | 1 |
| `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS` | E2E / Tests | `rlWindow` | 1 | 1 |
| `E2E_CLEANUP_TOKEN` | E2E / Tests | `expectedToken` | 1 | 1 |
| `ELEVENLABS_API_KEY` | Third-party API | `ELEVENLABS_API_KEY` | 2 | 2 |
| `EXTERNAL_SUPABASE_SERVICE_KEY` | External Supabase (BD principal) | `externalKey, EXT_KEY, EXT_KEY2, key` | 8 | 7 |
| `EXTERNAL_SUPABASE_URL` | External Supabase (BD principal) | `externalUrl, EXT_URL, EXT_URL2, url` | 8 | 7 |
| `GITHUB_PAT` | Third-party API | `GITHUB_TOKEN` | 1 | 1 |
| `LOG_CREDENTIAL_RESOLUTION` | Feature flag | `(inline)` | 1 | 1 |
| `LOG_CRM_BRIDGE_VERBOSE` | Feature flag | `(inline)` | 1 | 1 |
| `LOVABLE_API_KEY` | Lovable AI | `LOVABLE_API_KEY` | 17 | 17 |
| `N8N_PRODUCT_WEBHOOK_SECRET` | n8n | `webhookSecret` | 1 | 1 |
| `N8N_QUOTE_WEBHOOK_URL` | n8n | `n8nWebhookUrl, webhookUrl` | 2 | 2 |
| `QUOTE_SYNC_API_KEY` | CRM sync | `apiKey` | 2 | 1 |
| `RESEND_API_KEY` | Third-party API | `resendKey` | 2 | 2 |
| `SALESPRO_WEBHOOK_URL` | CRM sync | `salesProUrl, webhookUrl` | 2 | 1 |
| `SUPABASE_ANON_KEY` | Supabase auto-injected | `(inline), anonKey, supabaseAnonKey, SUPABASE_ANON_KEY, ANON, ANON_KEY` | 30 | 27 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase auto-injected | `SHARE_SECRET, supabaseServiceKey, serviceRoleKey, (inline), serviceKey, SERVICE_KEY, localService, SUPABASE_SERVICE_ROLE_KEY, SERVICE_ROLE_KEY, supabaseKey, SERVICE, key` | 62 | 54 |
| `SUPABASE_URL` | Supabase auto-injected | `(inline), supabaseUrl, SUPABASE_URL, url, localUrl` | 72 | 60 |
| `TEST_ADMIN_JWT` | E2E / Tests | `ADMIN_JWT` | 1 | 1 |
| `TEST_USER_EMAIL` | E2E / Tests | `TEST_USER_EMAIL` | 1 | 1 |
| `TEST_USER_PASSWORD` | E2E / Tests | `TEST_USER_PASSWORD` | 1 | 1 |
| `VIRUSTOTAL_API_KEY` | Third-party API | `vtApiKey` | 1 | 1 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase auto-injected | `SUPABASE_ANON_KEY, (inline)` | 9 | 4 |
| `VITE_SUPABASE_URL` | Supabase auto-injected | `SUPABASE_URL, (inline)` | 9 | 4 |

## §2. Por categoria

### CRM Supabase
- `CRM_SUPABASE_ANON_KEY`
- `CRM_SUPABASE_SERVICE_KEY`
- `CRM_SUPABASE_URL`

### CRM sync
- `BITRIX24_WEBHOOK_URL`
- `QUOTE_SYNC_API_KEY`
- `SALESPRO_WEBHOOK_URL`

### E2E / Tests
- `E2E_CLEANUP_ALLOWED_EMAILS`
- `E2E_CLEANUP_RATE_LIMIT_MAX`
- `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS`
- `E2E_CLEANUP_TOKEN`
- `TEST_ADMIN_JWT`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

### External Supabase (BD principal)
- `EXTERNAL_SUPABASE_SERVICE_KEY`
- `EXTERNAL_SUPABASE_URL`

### Feature flag
- `ALLOW_HTTP_FETCH`
- `LOG_CREDENTIAL_RESOLUTION`
- `LOG_CRM_BRIDGE_VERBOSE`

### Lovable AI
- `LOVABLE_API_KEY`

### Other
- `BI_SHARE_SECRET`

### Supabase auto-injected
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`

### Third-party API
- `CNPJA_API_KEY`
- `DROPBOX_ACCESS_TOKEN`
- `ELEVENLABS_API_KEY`
- `GITHUB_PAT`
- `RESEND_API_KEY`
- `VIRUSTOTAL_API_KEY`

### n8n
- `N8N_PRODUCT_WEBHOOK_SECRET`
- `N8N_QUOTE_WEBHOOK_URL`

## §3. Por edge function (destino)

### `_shared`

| Secret | Variável local |
|---|---|
| `ALLOW_HTTP_FETCH` | `allowHttp` |
| `LOG_CREDENTIAL_RESOLUTION` | `(inline)` |
| `SUPABASE_ANON_KEY` | `supabaseAnonKey, ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline), serviceRoleKey, SERVICE_KEY, serviceKey, key` |
| `SUPABASE_URL` | `(inline), supabaseUrl, SUPABASE_URL, url, localUrl` |

### `ai-recommendations`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `analyze-logo-colors`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `bi-copilot`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `bi-share-dossier`

| Secret | Variável local |
|---|---|
| `BI_SHARE_SECRET` | `(inline)` |
| `SUPABASE_ANON_KEY` | `(inline)` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SHARE_SECRET` |
| `SUPABASE_URL` | `(inline)` |

### `bitrix-sync`

| Secret | Variável local |
|---|---|
| `BITRIX24_WEBHOOK_URL` | `bitrixWebhookUrl` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseServiceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `block-ip-temporarily`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `anonKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceRoleKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `categories-api`

| Secret | Variável local |
|---|---|
| `EXTERNAL_SUPABASE_SERVICE_KEY` | `externalKey` |
| `EXTERNAL_SUPABASE_URL` | `externalUrl` |

### `cleanup-notifications`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `cleanup-novelties`

| Secret | Variável local |
|---|---|
| `EXTERNAL_SUPABASE_SERVICE_KEY` | `externalKey` |
| `EXTERNAL_SUPABASE_URL` | `externalUrl` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseServiceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `cnpj-lookup`

| Secret | Variável local |
|---|---|
| `CNPJA_API_KEY` | `apiKey` |
| `SUPABASE_ANON_KEY` | `supabaseAnonKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `collections-public-react`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `collections-watcher`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `commemorative-dates`

| Secret | Variável local |
|---|---|
| `EXTERNAL_SUPABASE_SERVICE_KEY` | `externalKey` |
| `EXTERNAL_SUPABASE_URL` | `externalUrl` |
| `SUPABASE_ANON_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `comparison-ai-advisor`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `comparison-price-watcher`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `comparisons-public-react`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `connection-tester`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `anonKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `connections-auto-test`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `connections-health-check`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `connections-hub-audit`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline), serviceKey` |
| `SUPABASE_URL` | `(inline), supabaseUrl` |

### `crm-db-bridge`

| Secret | Variável local |
|---|---|
| `CRM_SUPABASE_ANON_KEY` | `(inline)` |
| `CRM_SUPABASE_SERVICE_KEY` | `(inline)` |
| `CRM_SUPABASE_URL` | `(inline)` |
| `LOG_CRM_BRIDGE_VERBOSE` | `(inline)` |
| `SUPABASE_ANON_KEY` | `supabaseAnonKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseServiceKey` |
| `SUPABASE_URL` | `supabaseUrl` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `SUPABASE_ANON_KEY` |
| `VITE_SUPABASE_URL` | `SUPABASE_URL` |

### `detect-new-device`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseServiceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `dropbox-list`

| Secret | Variável local |
|---|---|
| `DROPBOX_ACCESS_TOKEN` | `accessToken` |

### `e2e-cleanup`

| Secret | Variável local |
|---|---|
| `E2E_CLEANUP_ALLOWED_EMAILS` | `allowedRaw` |
| `E2E_CLEANUP_RATE_LIMIT_MAX` | `rlMax` |
| `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS` | `rlWindow` |
| `E2E_CLEANUP_TOKEN` | `expectedToken` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `elevenlabs-scribe-token`

| Secret | Variável local |
|---|---|
| `ELEVENLABS_API_KEY` | `ELEVENLABS_API_KEY` |

### `elevenlabs-tts`

| Secret | Variável local |
|---|---|
| `ELEVENLABS_API_KEY` | `ELEVENLABS_API_KEY` |

### `expert-chat`

| Secret | Variável local |
|---|---|
| `EXTERNAL_SUPABASE_SERVICE_KEY` | `EXT_KEY, EXT_KEY2` |
| `EXTERNAL_SUPABASE_URL` | `EXT_URL, EXT_URL2` |
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `external-db-bridge`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `(inline)` |
| `SUPABASE_SERVICE_ROLE_KEY` | `localService` |
| `SUPABASE_URL` | `(inline)` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `SUPABASE_ANON_KEY` |
| `VITE_SUPABASE_URL` | `SUPABASE_URL` |

### `external-db-inspect`

| Secret | Variável local |
|---|---|
| `EXTERNAL_SUPABASE_SERVICE_KEY` | `externalKey` |
| `EXTERNAL_SUPABASE_URL` | `externalUrl` |
| `SUPABASE_ANON_KEY` | `supabaseAnonKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `favorites-public-react`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `favorites-watcher`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `force-global-logout`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `anonKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceRoleKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `full-op-diagnostics`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `anonKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `generate-ad-image`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `generate-ad-prompt`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `generate-mockup`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `generate-product-seo`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `github-credentials-test`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `anonKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `github-fix-config`

| Secret | Variável local |
|---|---|
| `GITHUB_PAT` | `GITHUB_TOKEN` |

### `health-check`

| Secret | Variável local |
|---|---|
| `EXTERNAL_SUPABASE_SERVICE_KEY` | `key` |
| `EXTERNAL_SUPABASE_URL` | `url` |
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `kit-ai-builder`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `kit-identity-suggest`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `kit-public-view`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceRoleKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `log-login-attempt`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `magic-up-score`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `manage-users`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `anonKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceRoleKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `market-intelligence-insights`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `materials-api`

| Secret | Variável local |
|---|---|
| `EXTERNAL_SUPABASE_SERVICE_KEY` | `externalKey` |
| `EXTERNAL_SUPABASE_URL` | `externalUrl` |
| `SUPABASE_ANON_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `mcp-keys-issue`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY, (inline)` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY, SERVICE_ROLE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |
| `TEST_USER_EMAIL` | `TEST_USER_EMAIL` |
| `TEST_USER_PASSWORD` | `TEST_USER_PASSWORD` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `(inline)` |
| `VITE_SUPABASE_URL` | `(inline)` |

### `mcp-keys-revoke`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `mcp-keys-rotate`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `mcp-keys-update`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `mcp-server`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `ownership-audit`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `ownership-repair`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `ANON` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `process-queue`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `process-scheduled-reports`

| Secret | Variável local |
|---|---|
| `RESEND_API_KEY` | `resendKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `product-webhook`

| Secret | Variável local |
|---|---|
| `N8N_PRODUCT_WEBHOOK_SECRET` | `webhookSecret` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseServiceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `quote-followup-reminders`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `quote-public-view`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceRoleKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `quote-sync`

| Secret | Variável local |
|---|---|
| `N8N_QUOTE_WEBHOOK_URL` | `n8nWebhookUrl` |
| `QUOTE_SYNC_API_KEY` | `apiKey` |
| `SALESPRO_WEBHOOK_URL` | `salesProUrl, webhookUrl` |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseServiceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `rls-audit`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `ANON` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `rls-integration-tests`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `rls-matrix-export`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_ROLE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `secrets-manager`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `anonKey, (inline)` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceKey` |
| `SUPABASE_URL` | `supabaseUrl, (inline)` |
| `TEST_ADMIN_JWT` | `ADMIN_JWT` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `(inline)` |
| `VITE_SUPABASE_URL` | `(inline)` |

### `secure-upload`

| Secret | Variável local |
|---|---|
| `VIRUSTOTAL_API_KEY` | `vtApiKey` |

### `semantic-search`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceKey` |
| `SUPABASE_URL` | `url` |

### `send-digest`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `send-notification`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `send-scheduled-reports`

| Secret | Variável local |
|---|---|
| `RESEND_API_KEY` | `resendKey` |
| `SUPABASE_SERVICE_ROLE_KEY` | `serviceKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `send-transactional-email`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `(inline)` |
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `step-up-verify`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `ANON_KEY` |
| `SUPABASE_SERVICE_ROLE_KEY` | `SERVICE_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `sync-quote-bitrix`

| Secret | Variável local |
|---|---|
| `N8N_QUOTE_WEBHOOK_URL` | `webhookUrl` |

### `trends-insights`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |
| `SUPABASE_ANON_KEY` | `SUPABASE_ANON_KEY` |
| `SUPABASE_URL` | `SUPABASE_URL` |

### `validate-access`

| Secret | Variável local |
|---|---|
| `SUPABASE_ANON_KEY` | `(inline)` |
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `verify-email`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `supabaseKey` |
| `SUPABASE_URL` | `supabaseUrl` |

### `visual-search`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `voice-agent`

| Secret | Variável local |
|---|---|
| `LOVABLE_API_KEY` | `LOVABLE_API_KEY` |

### `webhook-dispatcher`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

### `webhook-inbound`

| Secret | Variável local |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | `(inline)` |
| `SUPABASE_URL` | `(inline)` |

## §4. Ocorrências detalhadas (secret → arquivo:linha)

#### `ALLOW_HTTP_FETCH`

- `_shared/external-fetch.ts:30` → `allowHttp` — `const allowHttp = Deno.env.get("ALLOW_HTTP_FETCH") === "1";`

#### `BITRIX24_WEBHOOK_URL`

- `bitrix-sync/index.ts:36` → `bitrixWebhookUrl` — `const bitrixWebhookUrl = Deno.env.get('BITRIX24_WEBHOOK_URL');`

#### `BI_SHARE_SECRET`

- `bi-share-dossier/index.ts:14` → `(inline)` — `const SHARE_SECRET = Deno.env.get("BI_SHARE_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";`

#### `CNPJA_API_KEY`

- `cnpj-lookup/index.ts:48` → `apiKey` — `const apiKey = Deno.env.get("CNPJA_API_KEY");`

#### `CRM_SUPABASE_ANON_KEY`

- `crm-db-bridge/singleton-client.test.ts:22` → `(inline)` — `if (!Deno.env.get("CRM_SUPABASE_SERVICE_KEY") && !Deno.env.get("CRM_SUPABASE_ANON_KEY")) {`

#### `CRM_SUPABASE_SERVICE_KEY`

- `crm-db-bridge/singleton-client.test.ts:22` → `(inline)` — `if (!Deno.env.get("CRM_SUPABASE_SERVICE_KEY") && !Deno.env.get("CRM_SUPABASE_ANON_KEY")) {`

#### `CRM_SUPABASE_URL`

- `crm-db-bridge/singleton-client.test.ts:19` → `(inline)` — `if (!Deno.env.get("CRM_SUPABASE_URL")) {`

#### `DROPBOX_ACCESS_TOKEN`

- `dropbox-list/index.ts:34` → `accessToken` — `const accessToken = Deno.env.get("DROPBOX_ACCESS_TOKEN");`

#### `E2E_CLEANUP_ALLOWED_EMAILS`

- `e2e-cleanup/index.ts:330` → `allowedRaw` — `const allowedRaw = Deno.env.get("E2E_CLEANUP_ALLOWED_EMAILS") ?? "";`

#### `E2E_CLEANUP_RATE_LIMIT_MAX`

- `e2e-cleanup/index.ts:179` → `rlMax` — `const rlMax = Number(Deno.env.get("E2E_CLEANUP_RATE_LIMIT_MAX") ?? "30");`

#### `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS`

- `e2e-cleanup/index.ts:181` → `rlWindow` — `const rlWindow = Number(Deno.env.get("E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS") ?? "60");`

#### `E2E_CLEANUP_TOKEN`

- `e2e-cleanup/index.ts:218` → `expectedToken` — `const expectedToken = Deno.env.get("E2E_CLEANUP_TOKEN") ?? "";`

#### `ELEVENLABS_API_KEY`

- `elevenlabs-scribe-token/index.ts:31` → `ELEVENLABS_API_KEY` — `const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');`
- `elevenlabs-tts/index.ts:47` → `ELEVENLABS_API_KEY` — `const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');`

#### `EXTERNAL_SUPABASE_SERVICE_KEY`

- `categories-api/index.ts:19` → `externalKey` — `const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');`
- `cleanup-novelties/index.ts:28` → `externalKey` — `const externalKey = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");`
- `commemorative-dates/index.ts:54` → `externalKey` — `const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');`
- `expert-chat/index.ts:837` → `EXT_KEY` — `const EXT_KEY = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");`
- `expert-chat/index.ts:1097` → `EXT_KEY2` — `const EXT_KEY2 = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");`
- `external-db-inspect/index.ts:79` → `externalKey` — `const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');`
- `health-check/index.ts:57` → `key` — `const key = Deno.env.get("EXTERNAL_SUPABASE_SERVICE_KEY");`
- `materials-api/index.ts:58` → `externalKey` — `const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY');`

#### `EXTERNAL_SUPABASE_URL`

- `categories-api/index.ts:18` → `externalUrl` — `const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');`
- `cleanup-novelties/index.ts:27` → `externalUrl` — `const externalUrl = Deno.env.get("EXTERNAL_SUPABASE_URL");`
- `commemorative-dates/index.ts:53` → `externalUrl` — `const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');`
- `expert-chat/index.ts:836` → `EXT_URL` — `const EXT_URL = Deno.env.get("EXTERNAL_SUPABASE_URL");`
- `expert-chat/index.ts:1096` → `EXT_URL2` — `const EXT_URL2 = Deno.env.get("EXTERNAL_SUPABASE_URL");`
- `external-db-inspect/index.ts:78` → `externalUrl` — `const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');`
- `health-check/index.ts:56` → `url` — `const url = Deno.env.get("EXTERNAL_SUPABASE_URL");`
- `materials-api/index.ts:57` → `externalUrl` — `const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');`

#### `GITHUB_PAT`

- `github-fix-config/index.ts:19` → `GITHUB_TOKEN` — `const GITHUB_TOKEN = Deno.env.get('GITHUB_PAT');`

#### `LOG_CREDENTIAL_RESOLUTION`

- `_shared/credentials.ts:366` → `(inline)` — `if (Deno.env.get("LOG_CREDENTIAL_RESOLUTION") === "off") return;`

#### `LOG_CRM_BRIDGE_VERBOSE`

- `crm-db-bridge/index.ts:890` → `(inline)` — `if (wasCold || Deno.env.get("LOG_CRM_BRIDGE_VERBOSE") === "on") {`

#### `LOVABLE_API_KEY`

- `ai-recommendations/index.ts:80` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `analyze-logo-colors/index.ts:88` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `bi-copilot/index.ts:10` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `comparison-ai-advisor/index.ts:70` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `expert-chat/index.ts:587` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `generate-ad-image/index.ts:60` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `generate-ad-prompt/index.ts:25` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `generate-mockup/index.ts:46` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `generate-product-seo/index.ts:53` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `kit-ai-builder/index.ts:30` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');`
- `kit-identity-suggest/index.ts:69` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');`
- `magic-up-score/index.ts:66` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');`
- `market-intelligence-insights/index.ts:273` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `semantic-search/index.ts:235` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `trends-insights/index.ts:28` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `visual-search/index.ts:56` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");`
- `voice-agent/index.ts:38` → `LOVABLE_API_KEY` — `const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');`

#### `N8N_PRODUCT_WEBHOOK_SECRET`

- `product-webhook/index.ts:9` → `webhookSecret` — `const webhookSecret = Deno.env.get("N8N_PRODUCT_WEBHOOK_SECRET");`

#### `N8N_QUOTE_WEBHOOK_URL`

- `quote-sync/index.ts:10` → `n8nWebhookUrl` — `const n8nWebhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");`
- `sync-quote-bitrix/index.ts:61` → `webhookUrl` — `const webhookUrl = Deno.env.get("N8N_QUOTE_WEBHOOK_URL");`

#### `QUOTE_SYNC_API_KEY`

- `quote-sync/index.ts:205` → `apiKey` — `const apiKey = Deno.env.get("QUOTE_SYNC_API_KEY");`
- `quote-sync/index.ts:325` → `apiKey` — `const apiKey = Deno.env.get("QUOTE_SYNC_API_KEY");`

#### `RESEND_API_KEY`

- `process-scheduled-reports/index.ts:87` → `resendKey` — `const resendKey = Deno.env.get("RESEND_API_KEY");`
- `send-scheduled-reports/index.ts:14` → `resendKey` — `const resendKey = Deno.env.get("RESEND_API_KEY");`

#### `SALESPRO_WEBHOOK_URL`

- `quote-sync/index.ts:204` → `salesProUrl` — `const salesProUrl = Deno.env.get("SALESPRO_WEBHOOK_URL");`
- `quote-sync/index.ts:324` → `webhookUrl` — `const webhookUrl = Deno.env.get("SALESPRO_WEBHOOK_URL");`

#### `SUPABASE_ANON_KEY`

- `bi-share-dossier/index.ts:137` → `(inline)` — `Deno.env.get("SUPABASE_ANON_KEY")!,`
- `block-ip-temporarily/index.ts:27` → `anonKey` — `const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `cnpj-lookup/index.ts:27` → `supabaseAnonKey` — `const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `commemorative-dates/index.ts:34` → `(inline)` — `Deno.env.get('SUPABASE_ANON_KEY')!,`
- `connection-tester/index.ts:60` → `anonKey` — `const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `crm-db-bridge/index.ts:448` → `supabaseAnonKey` — `const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `external-db-bridge/index.ts:794` → `(inline)` — `Deno.env.get('SUPABASE_ANON_KEY')!,`
- `external-db-inspect/index.ts:43` → `supabaseAnonKey` — `const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;`
- `force-global-logout/index.ts:24` → `anonKey` — `const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `full-op-diagnostics/index.ts:63` → `anonKey` — `const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `github-credentials-test/index.ts:57` → `anonKey` — `const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `manage-users/index.ts:83` → `anonKey` — `const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;`
- `materials-api/index.ts:34` → `(inline)` — `Deno.env.get('SUPABASE_ANON_KEY')!,`
- `mcp-keys-issue/index.ts:42` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `mcp-keys-issue/rls-isolation.test.ts:29` → `(inline)` — `Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");`
- `mcp-keys-revoke/index.ts:23` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `mcp-keys-rotate/index.ts:30` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `mcp-keys-update/index.ts:30` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `ownership-repair/index.ts:28` → `ANON` — `const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `rls-audit/index.ts:31` → `ANON` — `const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `rls-integration-tests/index.ts:11` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `rls-matrix-export/index.ts:34` → `ANON_KEY` — `const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `secrets-manager/index.ts:85` → `anonKey` — `const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `secrets-manager/list-contract.test.ts:22` → `(inline)` — `Deno.env.get("SUPABASE_ANON_KEY") ?? "";`
- `send-transactional-email/index.ts:146` → `(inline)` — `Deno.env.get("SUPABASE_ANON_KEY") ?? "",`
- `step-up-verify/index.ts:17` → `ANON_KEY` — `const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `trends-insights/index.ts:27` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`
- `validate-access/index.ts:65` → `(inline)` — `Deno.env.get("SUPABASE_ANON_KEY")!,`
- `_shared/auth.ts:27` → `supabaseAnonKey` — `const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;`
- `_shared/authorize.ts:46` → `ANON_KEY` — `const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;`

#### `SUPABASE_SERVICE_ROLE_KEY`

- `bi-share-dossier/index.ts:14` → `SHARE_SECRET` — `const SHARE_SECRET = Deno.env.get("BI_SHARE_SECRET") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";`
- `bitrix-sync/index.ts:20` → `supabaseServiceKey` — `const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;`
- `block-ip-temporarily/index.ts:26` → `serviceRoleKey` — `const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `cleanup-notifications/index.ts:14` → `(inline)` — `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''`
- `cleanup-novelties/index.ts:18` → `supabaseServiceKey` — `const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");`
- `collections-public-react/index.ts:44` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `collections-watcher/index.ts:38` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `comparison-price-watcher/index.ts:18` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!`
- `comparisons-public-react/index.ts:45` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `connection-tester/index.ts:61` → `serviceKey` — `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `connections-auto-test/index.ts:126` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `connections-health-check/index.ts:66` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `connections-hub-audit/index.ts:74` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `connections-hub-audit/index.ts:164` → `serviceKey` — `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `crm-db-bridge/index.ts:449` → `supabaseServiceKey` — `const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `detect-new-device/index.ts:34` → `supabaseServiceKey` — `const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `e2e-cleanup/index.ts:172` → `SERVICE_KEY` — `const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `external-db-bridge/index.ts:803` → `localService` — `const localService = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);`
- `favorites-public-react/index.ts:52` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `favorites-watcher/index.ts:38` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `force-global-logout/index.ts:23` → `serviceRoleKey` — `const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `full-op-diagnostics/index.ts:64` → `serviceKey` — `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `generate-mockup/index.ts:133` → `(inline)` — `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',`
- `github-credentials-test/index.ts:58` → `serviceKey` — `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `health-check/index.ts:31` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""`
- `kit-public-view/index.ts:62` → `serviceRoleKey` — `const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `log-login-attempt/index.ts:52` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!`
- `manage-users/index.ts:74` → `serviceRoleKey` — `const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;`
- `mcp-keys-issue/index.ts:41` → `SUPABASE_SERVICE_ROLE_KEY` — `const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `mcp-keys-issue/rls-isolation.test.ts:30` → `SERVICE_ROLE_KEY` — `const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");`
- `mcp-keys-revoke/index.ts:22` → `SUPABASE_SERVICE_ROLE_KEY` — `const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `mcp-keys-rotate/index.ts:29` → `SUPABASE_SERVICE_ROLE_KEY` — `const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `mcp-keys-update/index.ts:29` → `SUPABASE_SERVICE_ROLE_KEY` — `const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `mcp-server/index.ts:27` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `ownership-audit/index.ts:22` → `SERVICE_ROLE_KEY` — `const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `process-queue/index.ts:14` → `(inline)` — `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''`
- `process-scheduled-reports/index.ts:13` → `supabaseKey` — `const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `product-webhook/index.ts:8` → `supabaseServiceKey` — `const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `quote-followup-reminders/index.ts:17` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!`
- `quote-public-view/index.ts:82` → `serviceRoleKey` — `const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `quote-sync/index.ts:9` → `supabaseServiceKey` — `const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `rls-audit/index.ts:32` → `SERVICE` — `const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `rls-integration-tests/index.ts:12` → `SERVICE_ROLE_KEY` — `const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `rls-matrix-export/index.ts:35` → `SERVICE_ROLE_KEY` — `const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `secrets-manager/index.ts:86` → `serviceKey` — `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `semantic-search/index.ts:26` → `serviceKey` — `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");`
- `send-digest/index.ts:14` → `(inline)` — `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''`
- `send-notification/index.ts:32` → `(inline)` — `Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''`
- `send-scheduled-reports/index.ts:13` → `serviceKey` — `const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `send-transactional-email/index.ts:172` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""`
- `step-up-verify/index.ts:18` → `SERVICE_KEY` — `const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `validate-access/index.ts:51` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `verify-email/index.ts:17` → `supabaseKey` — `const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;`
- `webhook-dispatcher/index.ts:48` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `webhook-inbound/index.ts:32` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,`
- `_shared/ai-usage.ts:32` → `(inline)` — `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!`
- `_shared/auth.ts:28` → `serviceRoleKey` — `const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;`
- `_shared/authorize.ts:47` → `SERVICE_KEY` — `const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;`
- `_shared/bot-protection.ts:98` → `serviceKey` — `const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;`
- `_shared/credentials.ts:344` → `key` — `const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");`
- `_shared/external-db-telemetry.ts:92` → `serviceKey` — `const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');`
- `_shared/security.ts:14` → `serviceRoleKey` — `const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;`

#### `SUPABASE_URL`

- `bi-share-dossier/index.ts:136` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `bitrix-sync/index.ts:19` → `supabaseUrl` — `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;`
- `block-ip-temporarily/index.ts:25` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `cleanup-notifications/index.ts:13` → `(inline)` — `Deno.env.get('SUPABASE_URL') ?? '',`
- `cleanup-novelties/index.ts:17` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL");`
- `cnpj-lookup/index.ts:26` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `collections-public-react/index.ts:43` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `collections-watcher/index.ts:37` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `commemorative-dates/index.ts:33` → `(inline)` — `Deno.env.get('SUPABASE_URL')!,`
- `comparison-price-watcher/index.ts:17` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `comparisons-public-react/index.ts:44` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `connection-tester/index.ts:59` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `connections-auto-test/index.ts:125` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `connections-health-check/index.ts:65` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `connections-hub-audit/index.ts:73` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `connections-hub-audit/index.ts:163` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `crm-db-bridge/index.ts:447` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `detect-new-device/index.ts:33` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `e2e-cleanup/index.ts:170` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `external-db-bridge/index.ts:793` → `(inline)` — `Deno.env.get('SUPABASE_URL')!,`
- `external-db-bridge/index.ts:803` → `(inline)` — `const localService = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);`
- `external-db-inspect/index.ts:42` → `supabaseUrl` — `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;`
- `favorites-public-react/index.ts:51` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `favorites-watcher/index.ts:37` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `force-global-logout/index.ts:22` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `full-op-diagnostics/index.ts:62` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `generate-mockup/index.ts:132` → `(inline)` — `Deno.env.get('SUPABASE_URL') ?? '',`
- `github-credentials-test/index.ts:56` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `health-check/index.ts:30` → `(inline)` — `Deno.env.get("SUPABASE_URL") || "",`
- `kit-public-view/index.ts:61` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `log-login-attempt/index.ts:51` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `manage-users/index.ts:73` → `supabaseUrl` — `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;`
- `materials-api/index.ts:33` → `(inline)` — `Deno.env.get('SUPABASE_URL')!,`
- `mcp-keys-issue/index.ts:40` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `mcp-keys-issue/rls-isolation.test.ts:27` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");`
- `mcp-keys-revoke/index.ts:21` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `mcp-keys-rotate/index.ts:28` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `mcp-keys-update/index.ts:28` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `mcp-server/index.ts:26` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `ownership-audit/index.ts:21` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `ownership-repair/index.ts:27` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `process-queue/index.ts:13` → `(inline)` — `Deno.env.get('SUPABASE_URL') ?? '',`
- `process-scheduled-reports/index.ts:12` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `product-webhook/index.ts:7` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `quote-followup-reminders/index.ts:16` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `quote-public-view/index.ts:81` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `quote-sync/index.ts:8` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `rls-audit/index.ts:30` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `rls-integration-tests/index.ts:10` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `rls-matrix-export/index.ts:33` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `secrets-manager/index.ts:84` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `secrets-manager/list-contract.test.ts:19` → `(inline)` — `Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";`
- `semantic-search/index.ts:25` → `url` — `const url = Deno.env.get("SUPABASE_URL");`
- `send-digest/index.ts:13` → `(inline)` — `Deno.env.get('SUPABASE_URL') ?? '',`
- `send-notification/index.ts:31` → `(inline)` — `Deno.env.get('SUPABASE_URL') ?? '',`
- `send-scheduled-reports/index.ts:12` → `supabaseUrl` — `const supabaseUrl = Deno.env.get("SUPABASE_URL")!;`
- `send-transactional-email/index.ts:145` → `(inline)` — `Deno.env.get("SUPABASE_URL") ?? "",`
- `send-transactional-email/index.ts:171` → `(inline)` — `Deno.env.get("SUPABASE_URL") ?? "",`
- `step-up-verify/index.ts:16` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `trends-insights/index.ts:26` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `validate-access/index.ts:50` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `validate-access/index.ts:64` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `verify-email/index.ts:16` → `supabaseUrl` — `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;`
- `webhook-dispatcher/index.ts:47` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `webhook-inbound/index.ts:31` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `_shared/ai-usage.ts:31` → `(inline)` — `Deno.env.get("SUPABASE_URL")!,`
- `_shared/auth.ts:26` → `supabaseUrl` — `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;`
- `_shared/authorize.ts:45` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;`
- `_shared/bot-protection.ts:97` → `supabaseUrl` — `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;`
- `_shared/credentials.ts:343` → `url` — `const url = Deno.env.get("SUPABASE_URL");`
- `_shared/external-db-telemetry.ts:91` → `localUrl` — `const localUrl = Deno.env.get('SUPABASE_URL');`
- `_shared/security.ts:13` → `supabaseUrl` — `const supabaseUrl = Deno.env.get('SUPABASE_URL')!;`

#### `TEST_ADMIN_JWT`

- `secrets-manager/list-contract.test.ts:23` → `ADMIN_JWT` — `const ADMIN_JWT = Deno.env.get("TEST_ADMIN_JWT") ?? "";`

#### `TEST_USER_EMAIL`

- `mcp-keys-issue/rls-isolation.test.ts:34` → `TEST_USER_EMAIL` — `const TEST_USER_EMAIL = Deno.env.get("TEST_USER_EMAIL");`

#### `TEST_USER_PASSWORD`

- `mcp-keys-issue/rls-isolation.test.ts:35` → `TEST_USER_PASSWORD` — `const TEST_USER_PASSWORD = Deno.env.get("TEST_USER_PASSWORD");`

#### `VIRUSTOTAL_API_KEY`

- `secure-upload/index.ts:73` → `vtApiKey` — `const vtApiKey = Deno.env.get("VIRUSTOTAL_API_KEY");`

#### `VITE_SUPABASE_PUBLISHABLE_KEY`

- `crm-db-bridge/breaker-status.test.ts:5` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;`
- `crm-db-bridge/creds_health.test.ts:13` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;`
- `crm-db-bridge/diag.test.ts:5` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;`
- `crm-db-bridge/ping.test.ts:5` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;`
- `external-db-bridge/lightweightSelect.e2e.test.ts:14` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;`
- `external-db-bridge/performance.test.ts:14` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;`
- `external-db-bridge/singleton.test.ts:7` → `SUPABASE_ANON_KEY` — `const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;`
- `mcp-keys-issue/rls-isolation.test.ts:29` → `(inline)` — `Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");`
- `secrets-manager/list-contract.test.ts:21` → `(inline)` — `Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ??`

#### `VITE_SUPABASE_URL`

- `crm-db-bridge/breaker-status.test.ts:4` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;`
- `crm-db-bridge/creds_health.test.ts:12` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;`
- `crm-db-bridge/diag.test.ts:4` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;`
- `crm-db-bridge/ping.test.ts:4` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;`
- `external-db-bridge/lightweightSelect.e2e.test.ts:13` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;`
- `external-db-bridge/performance.test.ts:13` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;`
- `external-db-bridge/singleton.test.ts:6` → `SUPABASE_URL` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;`
- `mcp-keys-issue/rls-isolation.test.ts:27` → `(inline)` — `const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL");`
- `secrets-manager/list-contract.test.ts:19` → `(inline)` — `Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";`

## §5. Checklist de deploy em novo ambiente

Configure os secrets a seguir via **Lovable Cloud → Secrets** ou `supabase secrets set`:

**CRM Supabase:**
- [ ] `CRM_SUPABASE_ANON_KEY`
- [ ] `CRM_SUPABASE_SERVICE_KEY`
- [ ] `CRM_SUPABASE_URL`

**CRM sync:**
- [ ] `BITRIX24_WEBHOOK_URL`
- [ ] `QUOTE_SYNC_API_KEY`
- [ ] `SALESPRO_WEBHOOK_URL`

**E2E / Tests:**
- [ ] `E2E_CLEANUP_ALLOWED_EMAILS`
- [ ] `E2E_CLEANUP_RATE_LIMIT_MAX`
- [ ] `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS`
- [ ] `E2E_CLEANUP_TOKEN`
- [ ] `TEST_ADMIN_JWT`
- [ ] `TEST_USER_EMAIL`
- [ ] `TEST_USER_PASSWORD`

**External Supabase (BD principal):**
- [ ] `EXTERNAL_SUPABASE_SERVICE_KEY`
- [ ] `EXTERNAL_SUPABASE_URL`

**Feature flag:**
- [ ] `ALLOW_HTTP_FETCH`
- [ ] `LOG_CREDENTIAL_RESOLUTION`
- [ ] `LOG_CRM_BRIDGE_VERBOSE`

**Lovable AI:**
- [ ] `LOVABLE_API_KEY`

**Other:**
- [ ] `BI_SHARE_SECRET`

**Third-party API:**
- [ ] `CNPJA_API_KEY`
- [ ] `DROPBOX_ACCESS_TOKEN`
- [ ] `ELEVENLABS_API_KEY`
- [ ] `GITHUB_PAT`
- [ ] `RESEND_API_KEY`
- [ ] `VIRUSTOTAL_API_KEY`

**n8n:**
- [ ] `N8N_PRODUCT_WEBHOOK_SECRET`
- [ ] `N8N_QUOTE_WEBHOOK_URL`

> `Supabase auto-injected` (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_URL) são providos automaticamente pelo runtime — **não precisam ser configurados manualmente**.
