# Bloco 14 — Auth Config (Dashboard + Código)

> Documenta as configurações de autenticação. Algumas vivem **no Dashboard
> da Lovable Cloud** (não exportáveis via API pública) e outras estão
> declaradas **em código** (SSOT verificável). Este bloco lista ambos os
> lados para deploy/restore.
>
> **Project ref:** `jlpkghroyzkmseixtjxv`

---

## §1. Identity providers

| Provider          | Status         | Onde está configurado                                    |
|-------------------|----------------|----------------------------------------------------------|
| **Email/password**| ✅ Habilitado  | Dashboard → Cloud → Users → Auth settings → Email        |
| **Google OAuth**  | ✅ Habilitado  | Dashboard → Cloud → Users → Auth settings → Google (managed via `lovable.auth.signInWithOAuth("google")`) |
| **Apple OAuth**   | ⚠️ Verificar  | Dashboard (componente `SocialLoginButtons` suporta, mas só Google está em uso) |
| **Anonymous**     | ❌ Desabilitado | Política: plataforma fechada (`mem://auth/closed-platform-policy`) |
| **Phone / SMS**   | ❌ Desabilitado | —                                                        |

**Restore:** após restore, reabilitar Google via tool `configure_social_auth` ou Dashboard → Auth → Google (BYOK ou managed).

---

## §2. Sign-up & email confirmation

| Setting                            | Valor              | Fonte                                            |
|------------------------------------|--------------------|--------------------------------------------------|
| **Disable signup (`disable_signup`)** | ⚠️ deve ser `true` | Política `closed-platform`. Confirme em Dashboard → Auth settings → General. |
| **Auto-confirm email**             | ❌ `false` (default)| Usuário precisa confirmar email antes do 1º login. |
| **Secure email change**            | ✅ recomendado      | Dashboard → Email settings.                       |
| **Email OTP length / expiration**  | Default Supabase (6 dígitos / 1h) | Dashboard.                          |

> **Importante:** este projeto NÃO expõe formulário público de cadastro
> (`/signup` desativado). Novos usuários são criados internamente via
> RPC `create_workspace_user` (admin-only). O `signUp()` em
> `src/contexts/AuthContext.tsx` existe mas não é exposto na UI pública.

---

## §3. Password policy

### §3.1 Server-side (Dashboard)

| Setting                         | Recomendação      |
|----------------------------------|-------------------|
| **Minimum password length**     | `8`               |
| **Required characters**         | `lowercase, uppercase, digits, symbols` |
| **Password HIBP check**         | ✅ **Habilitar**  |

> Configure em Dashboard → Cloud → Users → Auth settings → Email → Password rules.
> Para enable via tool: `configure_auth({ password_hibp_enabled: true, ... })`.

### §3.2 Client-side (código — SSOT)

`src/lib/validations/authSchema.ts` aplica via Zod (signup + reset):

- `min(8)`
- `regex(/[A-Z]/)` — maiúscula obrigatória
- `regex(/[a-z]/)` — minúscula obrigatória
- `regex(/[0-9]/)` — dígito obrigatório
- `regex(/[!@#$%^&*(),.?":{}|<>]/)` — caractere especial obrigatório

`src/hooks/usePasswordBreachCheck.tsx` faz checagem extra contra
**HaveIBeenPwned** via k-anonymity (`api.pwnedpasswords.com/range/<sha1[:5]>`)
no client antes de submeter — defesa em profundidade caso o flag HIBP do
servidor esteja off.

> ⚠️ `loginSchema` tolera senhas com `min(6)` para login (compat com contas
> antigas). Apenas signup/reset exigem a política completa.

---

## §4. Brute-force / lockout (client-side)

`src/hooks/useLoginRateLimit.ts` — proteção de **client** contra brute-force:

| Setting          | Valor          |
|------------------|----------------|
| `MAX_ATTEMPTS`   | **5**          |
| `LOCKOUT_MS`     | **5 minutos**  |
| Janela           | 5 min rolling  |

> Esta é defesa cosmética (localStorage). A camada **autoritativa** vive
> no GoTrue do Supabase (rate-limits internos por IP) — não configuráveis
> via Dashboard, são fixos da plataforma.

---

## §5. Redirect URLs / Site URL

| Configuração            | Valor                                                                 |
|-------------------------|-----------------------------------------------------------------------|
| **Site URL**            | `https://promogifts.app` (produção) — confirmar em Dashboard → URL Configuration |
| **Additional Redirect URLs** | Devem incluir: <br/>• `https://promogifts.app/*`<br/>• `https://id-preview--*.lovable.app/*` (preview)<br/>• `https://*.lovable.app/*`<br/>• `http://localhost:*` (dev) |
| **Email signup redirect** | `${window.location.origin}/` (`AuthContext.tsx:320`)                |
| **Password reset redirect** | `${window.location.origin}/reset-password` (`usePasswordResetRequests.ts:67`) |
| **OAuth redirect**       | `${window.location.origin}` (`SocialLoginButtons` + `lovable.auth.signInWithOAuth`) |

> **Restore:** entre Dashboard → Auth → URL Configuration e adicione
> manualmente cada origin acima na "Redirect URLs allow list", senão
> emails de signup/reset retornam para localhost ou rejeitam o callback.

---

## §6. JWT / sessões

| Setting                    | Valor padrão Lovable Cloud   |
|----------------------------|------------------------------|
| **JWT expiration**         | 3600s (1h)                    |
| **Refresh token rotation** | ✅ habilitado                 |
| **Refresh token reuse interval** | 10s                     |
| **Inactivity timeout**     | Não configurado (usa default) |

> Não exportável via API pública — verifique em Dashboard → Auth settings →
> Sessions. Mantenha JWT em 1h (compatível com claims `aal2` em MFA).

---

## §7. MFA (Multi-Factor Auth)

| Setting              | Valor                                              |
|----------------------|----------------------------------------------------|
| **TOTP enabled**     | ✅ habilitado (claim `aal=aal2` aceita pelo backend) |
| **Phone factor**     | ❌ desabilitado                                    |
| **Enforcement**      | Por-rota via `authorize({ requireMfa: ... })` em edge functions sensíveis (MCP keys, ownership repair, etc.) |
| **Step-up token TTL**| 5 min (header `X-Step-Up-Token`)                   |

> Detalhes: `mem://security/mfa-enforcement-authorize`. Tabelas
> `step_up_tokens`, `password_reset_requests` no schema público.

---

## §8. Email templates (auth-email-hook)

Templates customizados em `supabase/functions/_shared/email-templates/`:

| Template            | Evento auth disparador     |
|---------------------|----------------------------|
| `signup.tsx`        | `signup` (confirm email)   |
| `magic-link.tsx`    | `magiclink`                |
| `recovery.tsx`      | `recovery` (password reset)|
| `invite.tsx`        | `invite`                   |
| `email-change.tsx`  | `email_change`             |
| `reauthentication.tsx` | `reauthentication`      |

Roteador: `supabase/functions/auth-email-hook/index.ts`.
Sender domain: `notify.promogifts.app` (Lovable Emails managed).

---

## §9. Checklist de restore (Dashboard manual)

Após restaurar o banco, **revisitar manualmente** no Dashboard:

- [ ] **Auth → Providers**: habilitar Google (BYOK ou managed); manter Email; desabilitar Anonymous.
- [ ] **Auth → General**: `Disable signup = true`, `Anonymous users = false`.
- [ ] **Auth → Email**: confirmar `Auto-confirm = false`, `Secure email change = true`.
- [ ] **Auth → Email → Password**: min length 8, todos os caracteres requeridos, **HIBP check ON**.
- [ ] **Auth → URL Configuration**: Site URL = `https://promogifts.app`; redirect allow-list inclui produção, preview Lovable, localhost.
- [ ] **Auth → Sessions**: JWT 1h, refresh rotation on.
- [ ] **Auth → MFA**: TOTP enabled.
- [ ] **Cloud → Emails**: domínio `notify.promogifts.app` ativo + templates `auth-email-hook` deployados.

---

## §10. Tools para reaplicação

```ts
// 1) Auth básico
configure_auth({
  disable_signup: true,
  external_anonymous_users_enabled: false,
  auto_confirm_email: false,
  password_hibp_enabled: true,
});

// 2) Social login (Google managed)
configure_social_auth({ providers: ["google"] });

// 3) Auth email hook (após domínio configurado)
scaffold_auth_email_templates();
deploy_edge_functions(["auth-email-hook"]);
```

> Os campos **não cobertos pelas tools** (Site URL, redirect allow-list,
> JWT TTL, MFA TOTP, password length numérica) **devem ser ajustados
> manualmente** no Dashboard — não há API pública para eles.
