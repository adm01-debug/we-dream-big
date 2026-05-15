# Block 19 — Inventário de Secrets / Env Vars (somente nomes)

> Snapshot gerado para o export. **Apenas nomes** — nenhum valor é exposto.
> Fontes: `secrets--fetch_secrets` (runtime), grep em `supabase/functions/**` (`Deno.env.get`), `vault.secrets`.

---

## 1) Secrets do projeto (Lovable Cloud runtime — 11)

Disponíveis em **todas** as Edge Functions via `Deno.env.get(...)`.

| # | Nome | Origem / observação |
|---|------|---------------------|
| 1 | `CNPJA_API_KEY` | API CNPJa (lookup CNPJ) |
| 2 | `CRM_SUPABASE_ANON_KEY` | Bridge para CRM externo |
| 3 | `CRM_SUPABASE_SERVICE_KEY` | Bridge CRM (service role) — **mandatório** |
| 4 | `CRM_SUPABASE_URL` | URL do projeto CRM |
| 5 | `EXTERNAL_SUPABASE_ANON_KEY` | BD externo (catálogo SSOT) |
| 6 | `EXTERNAL_SUPABASE_SERVICE_KEY` | BD externo (service) |
| 7 | `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` | Alias service-role |
| 8 | `EXTERNAL_SUPABASE_URL` | URL do BD externo |
| 9 | `LOVABLE_API_KEY` | **Managed** — rotacionar via `lovable_api_key--rotate_lovable_api_key` |
| 10 | `SUPABASE_ANON_KEY` | Auto-injetado pelo runtime |
| 11 | `SUPABASE_URL` | Auto-injetado pelo runtime |

> Adicionalmente, o runtime injeta automaticamente: `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_URL`.

---

## 2) Env vars referenciadas pelas Edge Functions (34 únicas)

Levantadas por `rg "Deno\.env\.get\(['\"]…['\"]\)"` em `supabase/functions/**`.

### 2.1 Auto-injetadas pelo runtime Supabase (5)
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`
- `LOVABLE_API_KEY` *(injetada pelo Lovable Cloud)*

### 2.2 Bridges para projetos Supabase externos (7)
- `CRM_SUPABASE_URL`
- `CRM_SUPABASE_ANON_KEY`
- `CRM_SUPABASE_SERVICE_KEY`
- `EXTERNAL_SUPABASE_URL`
- `EXTERNAL_SUPABASE_SERVICE_KEY`
- `VITE_SUPABASE_URL` *(referência cruzada client/edge)*
- `VITE_SUPABASE_PUBLISHABLE_KEY`

### 2.3 Integrações de terceiros (8)
- `BITRIX24_WEBHOOK_URL` — Bitrix24 inbound webhook
- `CNPJA_API_KEY` — CNPJa
- `DROPBOX_ACCESS_TOKEN` — Dropbox uploads
- `ELEVENLABS_API_KEY` — TTS
- `GITHUB_PAT` — GitHub API (releases / repo)
- `N8N_PRODUCT_WEBHOOK_SECRET` — assinatura HMAC n8n
- `N8N_QUOTE_WEBHOOK_URL` — endpoint n8n de orçamentos
- `RESEND_API_KEY` — envio de email
- `SALESPRO_WEBHOOK_URL` — sync SalesPro
- `VIRUSTOTAL_API_KEY` — verificação de uploads

### 2.4 Quote sync / BI (2)
- `QUOTE_SYNC_API_KEY` — auth para `quote-sync-receive`
- `BI_SHARE_SECRET` — assinatura de links públicos BI

### 2.5 E2E / testes (6) — **não usar em produção**
- `E2E_CLEANUP_ALLOWED_EMAILS`
- `E2E_CLEANUP_RATE_LIMIT_MAX`
- `E2E_CLEANUP_RATE_LIMIT_WINDOW_SECONDS`
- `E2E_CLEANUP_TOKEN`
- `TEST_ADMIN_JWT`
- `TEST_USER_EMAIL`
- `TEST_USER_PASSWORD`

### 2.6 Feature flags / debug (3)
- `ALLOW_HTTP_FETCH` — habilita fetch HTTP (não-HTTPS) em dev
- `LOG_CREDENTIAL_RESOLUTION` — verbose nos resolvers de credencial
- `LOG_CRM_BRIDGE_VERBOSE` — verbose no `crm-db-bridge`

---

## 3) `vault.secrets`

| Resultado | Observação |
|-----------|------------|
| **vazio** (0 linhas) | O projeto não usa `pgsodium`/`vault` para guardar segredos no banco — todos os segredos vivem como **Edge Function secrets** no Cloud. |

---

## 4) Diff: declarados no Cloud × usados no código

| Categoria | Itens |
|-----------|-------|
| ✅ Declarados E usados | `CNPJA_API_KEY`, `CRM_SUPABASE_*`, `EXTERNAL_SUPABASE_URL`, `EXTERNAL_SUPABASE_SERVICE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `LOVABLE_API_KEY` |
| ⚠️ Declarado mas não referenciado por nome no código | `EXTERNAL_SUPABASE_ANON_KEY`, `EXTERNAL_SUPABASE_SERVICE_ROLE_KEY` *(podem ser aliases / acessados via helper)* |
| ❌ **Usado no código mas NÃO presente em `fetch_secrets`** — exigem provisionamento manual antes do deploy: <br> `BITRIX24_WEBHOOK_URL`, `BI_SHARE_SECRET`, `DROPBOX_ACCESS_TOKEN`, `ELEVENLABS_API_KEY`, `GITHUB_PAT`, `N8N_PRODUCT_WEBHOOK_SECRET`, `N8N_QUOTE_WEBHOOK_URL`, `QUOTE_SYNC_API_KEY`, `RESEND_API_KEY`, `SALESPRO_WEBHOOK_URL`, `VIRUSTOTAL_API_KEY`, `E2E_*`, `TEST_*`, `ALLOW_HTTP_FETCH`, `LOG_*` |

> 💡 Use este diff como **checklist de provisionamento** ao restaurar o backend num novo projeto (`add_secret` para cada item da última linha, conforme funcionalidades habilitadas).

---

## 5) Como reaplicar num novo ambiente

```bash
# Via Lovable Cloud (UI): Connectors → Secrets → Add
# Ou via CLI (Supabase):
supabase secrets set --env-file .env.production
```

**Não commitar valores.** Mantenha um `.env.example` com apenas os nomes acima.
