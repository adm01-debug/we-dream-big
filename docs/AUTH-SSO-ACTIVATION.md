# 🔐 Ativação SSO em Produção — Guia Pré-Deploy

**Status:** SSO desabilitado em código. Login social (botão "Continuar com Google") está visível na UI mas vai retornar erro `Provider not enabled` até este guia ser executado.

**Quando executar:** Antes do deploy de produção. Pode ser feito em ~30 minutos.

**Pré-requisito:** Acesso administrativo ao painel Supabase + acesso ao Google Cloud Console da Promo Brindes.

---

## 📋 Checklist resumido

- [ ] Passo 1 — Criar OAuth Client ID no Google Cloud Console
- [ ] Passo 2 — Adicionar redirect URIs autorizados
- [ ] Passo 3 — Habilitar provider Google no Supabase
- [ ] Passo 4 — Verificar variáveis de ambiente (sanidade)
- [ ] Passo 5 — Smoke test manual em ambiente de staging
- [ ] (Opcional) Passo 6 — Adicionar Apple Sign-In

---

## Passo 1 — OAuth Client ID no Google Cloud

### Criar projeto (se ainda não existir)

1. Acesse https://console.cloud.google.com/
2. Topo da página → menu de projetos → **Novo Projeto**
3. Nome: `Promo Brindes - Auth` (ou similar)
4. Organização: Promo Brindes (se aplicável)
5. Criar

### Configurar OAuth Consent Screen

1. **APIs & Services** → **OAuth consent screen**
2. Tipo: **External** (a menos que a Promo Brindes use Google Workspace e queira limitar a domínio interno)
3. Preencher:
   - **App name**: `Promo Brindes`
   - **User support email**: `contato@promogifts.com.br` (ou similar)
   - **Developer contact**: email do admin
   - **App domain**: `promogifts.com.br`
   - **Authorized domains**: adicionar `promogifts.com.br` e `atomicabr.com.br`
4. **Scopes** — Adicionar:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. **Test users** (durante review): adicionar emails dos colaboradores que vão testar
6. Salvar e voltar

### Criar OAuth Client ID

1. **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**
2. Tipo: **Web application**
3. Nome: `PromoGifts Web Client`
4. **Authorized JavaScript origins** (origens autorizadas):
   ```
   https://promogifts.com.br
   https://www.promogifts.com.br
   https://app.promogifts.com.br
   https://promo-gifts.atomicabr.com.br
   http://localhost:5173
   http://localhost:8080
   ```
5. **Authorized redirect URIs** — Aqui é o ponto crítico:
   ```
   https://<SEU-PROJETO>.supabase.co/auth/v1/callback
   ```
   ⚠️ **Substitua `<SEU-PROJETO>` pelo subdomínio do seu projeto Supabase.**
   Você encontra em: Painel Supabase → Project Settings → API → Project URL.
   
6. **Create**
7. Anote os 2 valores que aparecem:
   - **Client ID** (algo como `1234567890-abc...apps.googleusercontent.com`)
   - **Client secret** (algo como `GOCSPX-xxxxxxxxx`)

---

## Passo 2 — Redirect URIs adicionais

Se a Promo Brindes for usar **subdomínios diferentes em produção**, adicione cada um na lista de `Authorized redirect URIs` do Google + também configure na lista de `Site URL` do Supabase (Passo 3).

Exemplos comuns que talvez precisem entrar:
- `https://promo-gifts-staging.atomicabr.com.br` (staging)
- `https://promo-gifts-pr-*.vercel.app` (Vercel preview deploys — opcional, pode usar wildcard)

---

## Passo 3 — Provider Google no Supabase

1. Acesse https://supabase.com/dashboard
2. Selecione o projeto da Promo Brindes
3. **Authentication** → **Providers** → **Google**
4. Toggle **Enable Google provider** para ON
5. Preencher:
   - **Client ID (for OAuth)**: cole o Client ID do Passo 1
   - **Client Secret (for OAuth)**: cole o Client Secret do Passo 1
   - **Skip nonce check**: deixar OFF (default)
6. **Authentication** → **URL Configuration**:
   - **Site URL**: `https://promogifts.com.br` (URL principal de produção)
   - **Redirect URLs**: adicionar TODOS os domínios onde a app pode rodar:
     ```
     https://promogifts.com.br/auth/callback
     https://www.promogifts.com.br/auth/callback
     https://app.promogifts.com.br/auth/callback
     https://promo-gifts.atomicabr.com.br/auth/callback
     http://localhost:5173/auth/callback
     http://localhost:8080/auth/callback
     ```
7. Salvar.

⚠️ **Importante:** o Supabase só vai redirecionar pra URLs que estão nessa lista exata. Se faltar uma, o login vai dar erro `redirect_to is not allowed`.

---

## Passo 4 — Variáveis de ambiente (sanidade)

O cliente Supabase já lê as vars padrão:

```bash
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ... (anon key)
```

Confirmar que estão configuradas em:
- **Vercel** (Production + Preview): Project Settings → Environment Variables
- **Local** (.env.local — não commitado)
- **GitHub Actions** (Repository Secrets, se usado em testes E2E)

**Nada novo precisa ser adicionado pra Google OAuth.** O Client Secret fica no Supabase, não no nosso código (boa prática — secrets no provedor, não no app).

---

## Passo 5 — Smoke test manual

1. Acesse o ambiente alvo (staging primeiro, depois prod)
2. Vá pra `/login`
3. Clique em **"Continuar com Google"**
4. Esperado:
   - ✅ Redireciona pra `accounts.google.com/...`
   - ✅ Mostra tela de seleção de conta Google
   - ✅ Após escolher conta, redireciona pra `/auth/callback`
   - ✅ Em `/auth/callback`, processa o code/token
   - ✅ Redireciona pra `/` (home autenticado)
5. Verificar no painel Supabase:
   - **Authentication** → **Users** → deve ver o usuário recém-criado
   - **Logs** → **Auth** → não deve ter erros recentes

### Erros possíveis e o que verificar

| Erro na UI | Causa | Solução |
|---|---|---|
| `Provider not enabled` | Provider Google não está ativo no Supabase | Refazer Passo 3 |
| `redirect_to is not allowed` | URL atual não está em Redirect URLs | Adicionar em Supabase URL Config |
| `redirect_uri_mismatch` (na tela do Google) | URL atual não está em Authorized redirect URIs do Google | Adicionar em Google Cloud Console |
| `Sessão não estabelecida` (toast no app, após 8s) | OAuth callback funcionou mas Supabase não conseguiu trocar code por session | Ver logs do Supabase Auth |
| Loop redirect infinito | `Site URL` mal configurado no Supabase | Confirmar que `Site URL` é só a raiz, sem `/auth/callback` |

---

## Passo 6 (Opcional) — Apple Sign-In

⚠️ **Apple Sign-In NÃO está implementado na UI do PromoGifts atualmente.** Existe apenas como tipo no SDK que removemos. Pra ativar, é preciso:

### 6.1 Implementar botão Apple no `SocialLoginButtons.tsx`

Adicionar handler análogo ao de Google:

```typescript
const handleAppleLogin = async () => {
  setIsLoading("apple");
  const redirect_uri = `${window.location.origin}/auth/callback`;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: redirect_uri },
    });
    if (error) {
      // ... mesma lógica de Google
    }
  } finally {
    setIsLoading(null);
  }
};
```

E adicionar botão correspondente no JSX (com SVG do logo Apple).

### 6.2 Configurar Apple Developer

1. Apple Developer Portal → **Certificates, Identifiers & Profiles**
2. Criar **Services ID** (App ID com Sign in with Apple habilitado)
3. Configurar **Domains and Subdomains** + **Return URLs**
4. Gerar **Private Key** (`.p8` file) com Sign in with Apple

### 6.3 Configurar Supabase Apple Provider

1. **Authentication** → **Providers** → **Apple**
2. Preencher:
   - **Services ID**: o Services ID criado
   - **Team ID**: do Apple Developer
   - **Key ID**: do `.p8` file
   - **Secret Key (PEM)**: conteúdo do `.p8`

### 6.4 Smoke test

Mesmo do Passo 5, mas com o botão "Continuar com Apple".

**Custo de implementação total**: ~3-4h (UI + Apple Developer + Supabase). Pode ficar pra um sprint pós-deploy.

---

## 🔁 Reversão (rollback)

Se algo der errado em produção e precisar desativar SSO Google rapidamente:

**Opção 1 — Toggle no Supabase** (mais rápido, ~30 segundos):
- **Authentication** → **Providers** → **Google** → toggle OFF
- Botão "Continuar com Google" volta a dar erro `Provider not enabled`, mas email/senha continua 100%

**Opção 2 — Esconder o botão no código** (PR de 1 linha):
- Comentar `<SocialLoginButtons />` em `src/pages/Auth.tsx`
- Email/senha continua funcionando

---

## 📚 Referências

- [Supabase Auth — Google Provider](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Auth — Apple Provider](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Google OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2/web-server)
- Histórico do PR de remoção do Lovable Auth: PR #104 deste repo

---

**Última atualização:** 2026-05-09
**Mantenedor:** time DevOps Atomica BR
**Versão do guia:** 1.0
