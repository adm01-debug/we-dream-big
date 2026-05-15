# Bloco 16 — Auth Hooks customizados

> Complemento do bloco de autenticação (`block01` + `block04` + edge
> functions de auth). Este documento mapeia **toda extensão custom do
> fluxo de autenticação**, mesmo quando ela não está implementada como
> Supabase Auth Hook nativo.

---

## ⚠️ Achado importante

**Nenhum Supabase Auth Hook nativo está habilitado neste projeto.**

Verificações executadas:

| Tipo de hook nativo                  | Status   | Como verifiquei                                          |
|--------------------------------------|----------|-----------------------------------------------------------|
| **Send Email Hook** (`auth-email-hook`) | ❌ não existe | Sem função `auth-email-hook` em `supabase/functions/`     |
| **Send SMS Hook**                    | ❌ não existe | Sem `send-sms-hook`                                       |
| **Before User Created Hook**         | ❌ não existe | Sem migrations referenciando `auth.hook` / `before_user_created` |
| **Custom Access Token Hook**         | ❌ não existe | Sem `custom_access_token` em migrations                   |
| **MFA Verification Hook (Postgres)** | ❌ não existe | Não há função SQL com signature de hook MFA               |
| **Password Verification Hook**       | ❌ não existe | Sem `password_verification` em config/migrations          |

`supabase/config.toml` contém apenas `project_id = "..."` — sem blocos
`[auth.hook.*]` e sem `enable_hook=true`. **E-mails de autenticação são
enviados pelos templates default da Supabase Auth.**

---

## ✅ Extensões de auth implementadas (camada app)

Em vez de hooks nativos, o projeto implementa lógica de auth via **edge
functions chamadas explicitamente pelo cliente** (`supabase.functions.invoke(...)`)
e via **triggers PostgreSQL** (já cobertos no `block05_triggers.sql`).

### 1. `verify-email` — confirmação de email custom

**Tipo:** Edge function pública (sem JWT) chamada por link no email.

**Fluxo:**
1. Usuário clica em link recebido (template default Supabase).
2. Frontend extrai `token` (= `user.id`) e chama `POST /verify-email`.
3. Edge usa `auth.admin.getUserById(token)` para validar.
4. Marca `email_confirm: true` via `auth.admin.updateUserById`.
5. Retorna `{ success: true }` ou `400 token inválido/expirado`.

**Secrets/env:**
- `SUPABASE_URL` (auto)
- `SUPABASE_SERVICE_ROLE_KEY` (auto, gerenciado pela plataforma)

**Validação:** Zod (`token: z.string().min(1)`).

---

### 2. `step-up-verify` — re-autenticação para ações sensíveis (MFA-lite)

**Tipo:** Edge function autenticada (JWT obrigatório). É o ponto central
do **MFA aplicacional** descrito em [`mem://security/mfa-enforcement-authorize`].

**Fluxo de 3 passos:**
1. `step="request"` → cliente envia `action`, `target_ref`, `action_label`.
   - Edge chama RPC `start_step_up_challenge()` que devolve
     `{ challenge_id, otp_plain, expires_at }` e dispara email com OTP
     (via `send-notification` ou template inline).
2. `step="verify_password"` → confere senha do usuário (re-login).
3. `step="verify_otp"` → valida OTP e emite **step-up token** (de
   curta duração) consumido pelos endpoints sensíveis via
   header `X-Step-Up-Token`.
4. `step="cancel"` → registra `cancelled` no audit log.

**Audit log:** TODAS as transições gravam em `admin_audit_log`:
`requested | password_verified | password_failed | otp_failed | issued | cancelled | unauthorized`.

**Ações cobertas:** `promote_dev`, `demote_dev`, `mcp_full_issue`,
`mcp_full_escalate`, `mcp_key_revoke`, `mcp_key_rotate`,
`secret_rotation`, `secret_revoke`.

**Secrets/env:**
- `SUPABASE_URL` (auto)
- `SUPABASE_ANON_KEY` (auto) — usado para validar JWT do caller
- `SUPABASE_SERVICE_ROLE_KEY` (auto) — usado para gravar audit/RPC

---

### 3. `force-global-logout` — kill-switch admin

**Tipo:** Edge function autenticada, restrita a role `admin`.

**Fluxo:** Admin chama → edge valida role via `user_roles` →
`auth.admin.signOut(user_id, "global")` para o alvo (ou todos os usuários
ativos, dependendo do payload). Útil para incident response.

**Secrets/env:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

### 4. `detect-new-device` — alerta de novo dispositivo

**Tipo:** Edge function autenticada, chamada **pelo cliente após login
bem-sucedido**.

**Fluxo:**
1. Cliente coleta `fingerprint` + `userAgent` + `osName` + `deviceType`.
2. Edge consulta `user_known_devices` por `(user_id, fingerprint)`.
3. Se desconhecido → grava nova linha + dispara notificação
   (via `send-notification`) com IP (`x-forwarded-for`).
4. Atualiza `last_seen_at` em devices conhecidos.

**Secrets/env:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
**Validação:** Zod (`fingerprint`, `userAgent`, `userEmail`, etc).

---

### 5. `log-login-attempt` — auditoria de tentativas

**Tipo:** Edge function pública (sem JWT — propositalmente, para registrar
falhas pré-login). Protegida por **rate limiter de 10 req/min/IP**.

**Fluxo:** cliente envia `{ email, success, failure_reason, ip_address,
user_agent, user_id? }` → edge insere em `login_attempts` com IP real
via `x-forwarded-for`. Alimenta o painel `/admin/seguranca-acesso`
e o sistema anti-scraping ([`mem://security/anti-scraping-protection`]).

**Secrets/env:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
**Validação:** Zod + rate limit.

---

### 6. `send-transactional-email` — emails de negócio (NÃO-auth)

**Tipo:** Edge function autenticada. **Não é hook de auth** — listada
aqui porque compartilha infraestrutura SMTP. Eventos suportados:
`quote_sent | quote_approved | quote_rejected | order_created`.

**Secrets/env:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` + (potencialmente) `RESEND_API_KEY` /
`SMTP_*` se configurados — verificar via `secrets-manager`.

---

## 🗺️ Mapa: gatilho → função

| Evento                                    | Onde dispara                                | Função                  |
|-------------------------------------------|---------------------------------------------|-------------------------|
| Confirmação de email (clique no link)     | Frontend `/verify-email?token=…`           | `verify-email`          |
| Login bem-sucedido (1º vez no device)     | Cliente, pós `signInWithPassword`           | `detect-new-device`     |
| Tentativa de login (sucesso ou falha)     | Cliente, em todo fluxo de login             | `log-login-attempt`     |
| Ação sensível (promover dev, MCP, secret) | Cliente, antes da ação destrutiva           | `step-up-verify`        |
| Incidente — forçar logout global          | `/admin/seguranca-acesso` (admin only)      | `force-global-logout`   |
| Auto-revogação chave MCP FULL órfã        | Trigger `AFTER DELETE on user_roles` + cron | `mcp-keys-revoke` (RPC) |

---

## 🔐 Inventário de secrets/env vars (auth-related)

Todos auto-injetados pela plataforma — **nenhum secret manual configurado
para auth**:

| Secret                       | Tipo      | Usado por                                                                 |
|------------------------------|-----------|---------------------------------------------------------------------------|
| `SUPABASE_URL`               | platform  | todas as 6 funções acima                                                  |
| `SUPABASE_ANON_KEY`          | platform  | `step-up-verify`, `force-global-logout`, `send-transactional-email`       |
| `SUPABASE_SERVICE_ROLE_KEY`  | platform  | todas as 6 funções acima                                                  |

> Para descobrir secrets adicionais (Resend, SMTP, Twilio, etc) usados
> indiretamente, abra `/admin/conexoes` ou rode o bloco 16 complementar
> com `SELECT name FROM vault.secrets;`.

---

## 🛠️ Como restaurar em outro projeto

1. **Edge functions:** copiar `supabase/functions/{verify-email,
   step-up-verify, force-global-logout, detect-new-device,
   log-login-attempt, send-transactional-email}/` + `_shared/`.
   Plataforma Lovable Cloud deploya automaticamente.
2. **Tabelas dependentes** (já no `block01`): `login_attempts`,
   `user_known_devices`, `admin_audit_log`, `step_up_challenges`,
   `step_up_tokens`, `user_roles`.
3. **RPCs dependentes** (já no `block04`): `start_step_up_challenge`,
   `verify_step_up_password`, `verify_step_up_otp`,
   `consume_step_up_token`, `has_role`.
4. **Triggers dependentes** (já no `block05`): trigger de auto-revogação
   de MCP FULL keys em `AFTER DELETE on user_roles`.
5. **Configuração de auth** (manual no Dashboard ou via `configure_auth`):
   - Email/password habilitado
   - **Auto-confirm email = OFF** (necessário para `verify-email` funcionar)
   - Password HIBP check = ON (recomendado)
   - Signup público = OFF (`closed-platform-policy`)

---

## 🚫 O que NÃO está implementado

- ❌ Templates de email custom da Supabase Auth (usa default)
- ❌ Send Email Hook → todos os emails de auth (reset, confirmation,
  magic link) saem com branding default Supabase
- ❌ Custom Access Token Hook → JWT claims são default
- ❌ MFA TOTP nativo (Supabase MFA AAL2) → projeto usa `step-up-verify`
  como substituto aplicacional, mas `authorize({ requireMfa })` aceita
  AAL2 também ([`mem://security/mfa-enforcement-authorize`])
- ❌ SAML SSO
- ❌ Social providers (Google/Apple) — `closed-platform-policy`

---

**Última atualização:** 2026-05-11
**Próximo lote sugerido:** Bloco 13 — Storage policies completas (já
coberto parcialmente no `block09`) ou Bloco 14 — Configurações de Auth
do Dashboard (rate limits, redirect URLs, password policy).