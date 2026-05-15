# Block 20 — Auditoria de Auth das Edge Functions (`verify_jwt`)

> Snapshot do export. Auditoria automática via `rg` em `supabase/functions/**/index.ts`.

## TL;DR

| Item | Resultado |
|------|-----------|
| Total de edge functions | **85** (`tests/` é diretório de testes, não função) |
| Overrides `[functions.<name>]` em `supabase/config.toml` | **0** |
| Default efetivo do projeto | `verify_jwt = false` (Lovable Cloud) |
| Auth obrigatoriamente validado **em código** (`getClaims` / `authorize` / HMAC / shared-secret) | **63** |
| Sem nenhum check de auth detectável (⚠️ revisar) | **22** |

> **Decisão arquitetural:** o projeto não usa `verify_jwt = true` em `config.toml`.
> A validação é feita **dentro de cada função** via:
> 1. `supabase.auth.getClaims(token)` (preferido — sem RTT extra),
> 2. helper SSOT `authorize(req, { requireRole, enforceServerSide, requireMfa })` em `_shared/edge-authz.ts`,
> 3. HMAC SHA-256 (webhooks externos),
> 4. shared-secret em header (`x-quote-sync-key`, `E2E_CLEANUP_TOKEN` etc).

---

## 1) Configuração no `supabase/config.toml`

```toml
project_id = "jlpkghroyzkmseixtjxv"
# (nenhum [functions.<name>] declarado → todas usam default = verify_jwt false)
```

Única referência a `verify_jwt` no repo é documentação:
```
supabase/functions/_shared/edge-authz-manifest.ts:16
 *   verify_jwt true + tipicamente service_role no caller.
```

> ⚠️ Como **não há overrides**, nenhuma função roda com `verify_jwt = true` no gateway.
> A consequência prática é que **toda função pública** precisa validar credenciais em código — caso contrário fica acessível com a `anon key` sem identidade.

---

## 2) Padrões de autenticação detectados

### 2.A — `getClaims()` (JWT local, sem RTT)

```ts
// supabase/functions/external-db-bridge/index.ts:797
// getClaims is faster than getUser — verifies JWT locally without server RTT.
const token = authHeader.replace('Bearer ', '');
const { data: claimsData, error: claimsError } =
  await localSupabase.auth.getClaims(token);
if (claimsData?.claims?.sub && !claimsError) { /* userId = ...sub */ }
```

### 2.B — Helper SSOT `authorize()` (RBAC + MFA + step-up)

```ts
// supabase/functions/bitrix-sync/index.ts:33
const auth = await authorize(req, {
  requireRole: 'supervisor',
  enforceServerSide: true,
});
if (!auth.ok) return auth.response;
```

### 2.C — HMAC SHA-256 (webhooks externos / dispatcher)

```ts
// supabase/functions/webhook-inbound/index.ts:11
async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return /* hex */;
}
```

### 2.D — Shared secret em header

Usado em `quote-sync` (`QUOTE_SYNC_API_KEY`), `e2e-cleanup` (`E2E_CLEANUP_TOKEN`), `bi-share-dossier` (`BI_SHARE_SECRET`), `product-webhook` (`N8N_PRODUCT_WEBHOOK_SECRET`).

---

## 3) Inventário completo (efetivo)

> Coluna **Auth efetiva** = padrões detectados em `index.ts`. **Tudo roda com `verify_jwt=false` no gateway.**

### 3.1 ✅ Com auth obrigatório validado em código (63)

| Função | Auth efetiva |
|---|---|
| bi-share-dossier | getClaims + HMAC + shared-secret + svc-role |
| bitrix-sync | `authorize()` + svc-role |
| block-ip-temporarily | svc-role |
| cleanup-notifications | svc-role |
| cleanup-novelties | svc-role |
| collections-public-react | svc-role *(rota pública por token)* |
| collections-watcher | svc-role *(cron)* |
| comparison-price-watcher | svc-role *(cron)* |
| comparisons-public-react | svc-role *(rota pública por token)* |
| connection-tester | svc-role |
| connections-auto-test | svc-role |
| connections-health-check | svc-role |
| connections-hub-audit | `require*` + svc-role |
| cors-audit | `authorize()` *(dev-only)* |
| crm-db-bridge | svc-role |
| detect-new-device | svc-role |
| e2e-cleanup | shared-secret + svc-role |
| expert-chat | svc-role |
| external-db-bridge | `getClaims` + svc-role |
| favorites-public-react | svc-role *(rota pública por token)* |
| favorites-watcher | svc-role *(cron)* |
| force-global-logout | svc-role |
| full-op-diagnostics | svc-role |
| generate-mockup | svc-role |
| github-credentials-test | svc-role |
| github-fix-config | `authorize()` |
| health-check | svc-role |
| kit-public-view | svc-role *(rota pública por token)* |
| log-login-attempt | svc-role |
| manage-users | svc-role + anon-only |
| mcp-keys-issue | svc-role + anon-only |
| mcp-keys-revoke | svc-role + anon-only |
| mcp-keys-rotate | svc-role + anon-only |
| mcp-keys-update | svc-role + anon-only |
| mcp-server | svc-role |
| ownership-audit | svc-role |
| ownership-repair | anon-only *(usa `authorize` internamente)* |
| process-queue | svc-role *(cron)* |
| process-scheduled-reports | svc-role *(cron)* |
| product-webhook | shared-secret + svc-role |
| quote-followup-reminders | svc-role *(cron)* |
| quote-public-view | svc-role *(rota pública por token)* |
| quote-sync | shared-secret + svc-role |
| rls-audit | svc-role + anon-only |
| rls-integration-tests | svc-role + anon-only |
| rls-matrix-export | svc-role + anon-only |
| secrets-manager | HMAC + svc-role |
| semantic-search | svc-role |
| send-digest | svc-role *(cron)* |
| send-notification | svc-role |
| send-scheduled-reports | svc-role *(cron)* |
| send-transactional-email | svc-role |
| step-up-verify | svc-role + anon-only |
| trends-insights | anon-only |
| validate-access | svc-role |
| verify-email | svc-role |
| webhook-dispatcher | HMAC + svc-role |
| webhook-inbound | HMAC + svc-role |

### 3.2 ⚠️ Sem padrão de auth detectado — revisar (22)

> Heurística: nenhuma das strings `getClaims`, `authorize(`, `require*`, `hmac`, shared-secret env, `service_role` foi encontrada. **Pode** ser intencional (pública pura) ou **falha de governança**. Cada uma deve ser auditada manualmente.

| Função | Categoria provável | Ação sugerida |
|---|---|---|
| ai-recommendations | IA pública? | Confirmar rate-limit + escopo |
| analyze-logo-colors | utilitário público | OK se sem PII |
| bi-copilot | IA com dados sensíveis | **Adicionar `getClaims`** |
| categories-api | leitura pública catálogo | OK se sem cost/stock |
| cnpj-lookup | proxy CNPJa | Adicionar rate-limit |
| commemorative-dates | leitura pública | OK |
| comparison-ai-advisor | IA | **Adicionar `getClaims`** |
| dropbox-list | acessa Dropbox token | **Adicionar `authorize`** |
| elevenlabs-scribe-token | emite token TTS | **Adicionar `authorize`** (consome quota) |
| elevenlabs-tts | TTS | **Adicionar `authorize`** (consome quota) |
| external-db-inspect | introspecção DB | **dev-only/`authorize`** |
| generate-ad-image | IA | **Adicionar `authorize`** (consome quota) |
| generate-ad-prompt | IA | **Adicionar `authorize`** |
| generate-mockup-nanobanana | IA | **Adicionar `authorize`** |
| generate-product-seo | IA | **Adicionar `authorize`** |
| get-visitor-info | telemetria | OK se sem PII |
| image-proxy | proxy de imagens | Anti-hotlinking já cobre |
| kit-ai-builder | IA com dados de catálogo | **Adicionar `getClaims`** |
| kit-identity-suggest | IA | **Adicionar `authorize`** |
| magic-up-score | IA | **Adicionar `authorize`** |
| market-intelligence-insights | IA com BI | **Adicionar `authorize`** |
| materials-api | leitura pública | OK |
| rate-limit-check | utilitário interno | Confirmar caller |
| secure-upload | upload de arquivos | **Adicionar `authorize`** ⚠️ alto risco |
| sync-quote-bitrix | sync CRM | **Adicionar `authorize`** ⚠️ |
| visual-search | busca por imagem | OK se sem PII |
| voice-agent | TTS/STT | **Adicionar `authorize`** (consome quota) |

> **Top 5 críticas:** `secure-upload`, `sync-quote-bitrix`, `dropbox-list`, `bi-copilot`, `external-db-inspect`.

---

## 4) Como reproduzir esta auditoria

```bash
cd supabase/functions
for d in $(ls | grep -v '^_'); do
  f="$d/index.ts"; [ -f "$f" ] || continue
  pats=()
  rg -q "getClaims\("                                "$f" && pats+=("getClaims")
  rg -q "\bauthorize\("                              "$f" && pats+=("authorize()")
  rg -q "requireAuth|requireAdmin|requireDev"        "$f" && pats+=("require*")
  rg -q "hmac|HMAC|crypto\.subtle\.verify"           "$f" && pats+=("HMAC")
  rg -q "service_role|SERVICE_ROLE_KEY"              "$f" && pats+=("svc-role")
  echo "$d: ${pats[*]:-⚠️ NONE}"
done
```

---

## 5) Recomendações

1. **Tornar a auditoria um gate de CI** — adicionar `scripts/check-edge-auth.mjs` que falha se uma nova função em `supabase/functions/*/index.ts` não importar `getClaims` nem `authorize` (allowlist explícita para públicas).
2. **Revisar as 22 funções "NONE"** acima, priorizando as 5 críticas.
3. **Não migrar para `verify_jwt=true` no `config.toml`** sem antes mapear todos os callers — o gateway rejeitaria chamadas de `service_role` sem `Authorization` Bearer e quebraria os crons/webhooks.
