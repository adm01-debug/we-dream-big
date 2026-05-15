# AUDITORIA COMPLETA DO SISTEMA — PromoGifts (ADM01)

> **Data da auditoria:** 12 de Maio de 2026  
> **Auditor:** Claude Code (Anthropic) — revisão independente, sem conflito de interesse  
> **Versão auditada:** 2.0.0 (package.json), branch main  
> **Metodologia:** Inspeção de código-fonte, análise estática, simulação de cenários reais  

---

## SUMÁRIO EXECUTIVO

### Pontuação Geral: **6.5 / 10**

O sistema PromoGifts é uma aplicação React/Supabase com arquitectura madura em vários aspectos: pipeline de CI com múltiplos gates de qualidade, uso generalizado de Zod para validação, logger estruturado, camada centralizada de autorização para edge functions, e documentação extensa. Contudo, foram identificados problemas de segurança e robustez que impedem a classificação como "pronto para produção em escala".

### Top 5 Achados Críticos

| # | Achado | Risco | Localização |
|---|--------|-------|-------------|
| 1 | **Actions não-existentes**: `actions/checkout@v6`, `actions/setup-node@v6`, `actions/upload-artifact@v7` não existem no GitHub Marketplace — todo o pipeline de CI falha silenciosamente ou falha completamente | CRÍTICO | `.github/workflows/ci.yml`, `e2e.yml` |
| 2 | **Rate limiter em memória efêmera**: `_shared/rate-limiter.ts` usa um `Map` em memória — descartado a cada cold start do Deno. Limites de rate não persistem entre invocações | ALTO | `supabase/functions/_shared/rate-limiter.ts:11` |
| 3 | **CSP com nonce não substituído**: Edge function retorna `Content-Security-Policy: ... 'nonce-{{nonce}}'` com o placeholder literal, invalidando toda a directiva `script-src` | ALTO | `supabase/functions/_shared/cors.ts:61` |
| 4 | **Image proxy sem validação de Content-Type da resposta**: repassa o `Content-Type` retornado pela origem sem verificar se é de facto um ficheiro de imagem — potencial content-sniffing | MÉDIO | `supabase/functions/image-proxy/index.ts:100-107` |
| 5 | **sanitizeHtml é regex manual sem DOMPurify**: implementação caseira em `src/lib/security/validation.ts` que não cobre vetores como `<svg onload=...>`, `<details ontoggle=...>`, `<body onscroll=...>` | MÉDIO | `src/lib/security/validation.ts:7-20` |

---

## SEÇÃO 1 — ESTRUTURA DO REPOSITÓRIO E TOPOLOGIA DO PROJETO

### O que foi encontrado

O repositório está bem estruturado com separação clara de responsabilidades:

- **Raiz**: configurações (`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tailwind.config.ts`, `eslint.config.js`)
- **`src/`**: 1.635 ficheiros TypeScript/TSX organizados em `components/`, `hooks/`, `pages/`, `routes/`, `contexts/`, `services/`, `lib/`, `stores/`, `types/`, `utils/`
- **`supabase/functions/`**: 84+ edge functions com `_shared/` SSOT
- **`supabase/migrations/`**: 371 ficheiros de migração
- **`e2e/`**: 129 specs Playwright
- **`tests/`**: 344 testes unitários/integração (Vitest)
- **`docs/`**: 50+ ficheiros de documentação bem mantidos
- **`recovery/`**: artefactos de uma recuperação de sistema em 2026-05-11

Existe `CLAUDE.md`? Não foi encontrado. `README.md` existe e é extenso (12.444 bytes). `CHANGELOG.md` existe e segue Keep a Changelog. `CONTRIBUTING.md` e `SECURITY.md` existem com boa qualidade.

A pasta `recovery/` com 30+ sub-diretórios revela uma crise recente (2026-05-11), com snapshots do banco e patches organizados por sprints D1-D7. Isto é sinal de um sistema que passou por uma recuperação significativa recentemente.

### Riscos identificados

| Risco | Nível | Recomendação |
|-------|-------|--------------|
| Ausência de `CLAUDE.md` para guia de IA | BAIXO | Criar arquivo com convenções de desenvolvimento |
| Pasta `recovery/` no repositório com SQL e snapshots de produção | MÉDIO | Mover para repositório privado separado ou remover histórico |
| `sitemap.xml` aponta para `criar-together-now.lovable.app` (domínio de desenvolvimento) | BAIXO | Actualizar para `promogifts.com.br` |
| `robots.txt` também aponta `Sitemap:` para domínio Lovable | BAIXO | Actualizar para produção |

---

## SEÇÃO 2 — AUDITORIA DE DEPENDÊNCIAS

### Versões principais

| Pacote | Versão | Status |
|--------|--------|--------|
| `react` | ^18.3.1 | Estável |
| `typescript` | ^6.0.3 | **TypeScript 6 ainda em beta — risco de instabilidade** |
| `@supabase/supabase-js` | ^2.98.0 | Estável, recente |
| `@playwright/test` | ^1.59.1 | Estável |
| `vitest` | ^3.2.4 | Estável |
| `react-router-dom` | 6.30.3 | Versão fixada (sem `^`) — boa prática |
| `@sentry/react` | ^8.45.0 | Estável |
| `lucide-react` | ^0.309.0 | 680KB descomprimido — comentado no código |
| `jspdf` | 4.2.1 | Sem `^` — fixada |
| `@tanstack/react-query` | ^5.100.10 | Estável |

### Riscos identificados

| Risco | Nível | Recomendação |
|-------|-------|--------------|
| TypeScript `^6.0.3` ainda em beta público — pode quebrar o build | ALTO | Fixar em `5.x` estável até TS6 GA |
| `lucide-react` sem tree-shaking real (chunk de 680KB) | MÉDIO | Migrar para imports individuais `lucide-react/icons/<Name>` |
| `date-fns` v2 — v3 já lançado com melhorias de tree-shaking | BAIXO | Planejar migração para v3 |
| `npm audit --audit-level=high || true` no CI — não bloqueia o pipeline | MÉDIO | Remover `|| true` ou configurar política de vulnerabilidades |
| `jsdom` v20 em dependência de produção (deveria ser devDependency) | BAIXO | Mover para `devDependencies` |
| `@testing-library/*` e `jest-axe` em dependencies (não devDependencies) | BAIXO | Mover para `devDependencies` |

---

## SEÇÃO 3 — PIPELINE CI/CD (GITHUB ACTIONS)

### O que foi encontrado

O pipeline é ambicioso e bem estruturado com múltiplos jobs:
- `smoke` → `quality` → `integration-tests` + `critical-e2e`  
- Jobs dedicados: `ref-warning-suite`, `hooks-tests`, `price-freshness-tests`, `cloud-status-tests`, `edge-functions-typecheck`, `theme-validation`
- Workflows separados: `security.yml` (Gitleaks), `codeql.yml`, `deploy-edge-functions.yml`

### PROBLEMA CRÍTICO: Versões de Actions Inexistentes

As versões utilizadas **não existem** no GitHub Marketplace:
- `actions/checkout@v6` — versão atual: v4
- `actions/setup-node@v6` — versão atual: v4  
- `actions/upload-artifact@v7` — versão atual: v4

**Consequência**: Todo o CI provavelmente está falhando ou usando versões erradas em produção. Se o GitHub resolveu automaticamente como `latest`, introduz risco de supply chain attack (sem pinagem de SHA).

```yaml
# PROBLEMÁTICO (ci.yml linha 20, 45, 96, etc.)
- uses: actions/checkout@v6         # NÃO EXISTE — atual é @v4
- uses: actions/setup-node@v6       # NÃO EXISTE — atual é @v4
- uses: actions/upload-artifact@v7  # NÃO EXISTE — atual é @v4
```

### Outros problemas identificados

| Problema | Arquivo:Linha | Risco |
|----------|---------------|-------|
| `npm audit --audit-level=high \|\| true` — não bloqueia vulnerabilidades | `ci.yml:108-110` | MÉDIO |
| RLS policy tests com `continue-on-error: true` — falhas ignoradas | `ci.yml:167-168` | MÉDIO |
| Edge Integration Tests com `\|\| true` — falhas ignoradas | `ci.yml:185-186` | MÉDIO |
| Actions não pinadas por SHA (apenas tags flutuantes) | Todos os workflows | MÉDIO |
| SUPABASE_PROJECT_REF hardcoded no workflow deploy | `deploy-edge-functions.yml:32` | BAIXO |
| `github/codeql-action@v4` — versão atual é v3 | `codeql.yml:33,38,43` | BAIXO |

---

## SEÇÃO 4 — EDGE FUNCTIONS SUPABASE

### O que foi encontrado

84+ edge functions com uma camada `_shared/` madura:
- `cors.ts` — CORS centralizado com allowlist de origens
- `authorize.ts` — autorização SSOT com hierarquia de roles
- `rate-limiter.ts` — rate limiting (ver problema abaixo)
- `structured-logger.ts`, `audit-log.ts`, `request-id.ts` — observabilidade
- `zod-validate.ts`, `validate.ts` — validação de entrada

### PROBLEMA CRÍTICO: Rate Limiter em Memória Efêmera

```typescript
// supabase/functions/_shared/rate-limiter.ts:11
const requestCounts = new Map<string, { count: number; resetAt: number }>();
```

Este `Map` vive na memória do isolate Deno. A cada cold start (reinicialização do container), o estado é **completamente perdido**. Para funções de alta frequência de cold start, o rate limiting simplesmente não funciona. Protecção real exige armazenamento persistente (Redis, tabela Supabase, KV).

### PROBLEMA: CSP com Nonce Placeholder Literal

```typescript
// supabase/functions/_shared/cors.ts:61
'Content-Security-Policy': "default-src 'self'; script-src 'self' 'nonce-{{nonce}}' 'strict-dynamic'; ..."
```

O placeholder `{{nonce}}` **nunca é substituído**. O browser receberá literalmente `'nonce-{{nonce}}'` como directiva CSP, o que invalida a protecção de `strict-dynamic`. O `script-src` fica ineficaz.

### PROBLEMA: `verify_jwt = false` em 10 Edge Functions

As seguintes funções desabilitam a verificação JWT do Supabase:

```toml
# supabase/config.toml
[functions.crm-db-bridge]      verify_jwt = false
[functions.ai-recommendations] verify_jwt = false
[functions.external-db-inspect] verify_jwt = false
[functions.image-proxy]         verify_jwt = false
[functions.webhook-dispatcher]  verify_jwt = false
[functions.webhook-inbound]     verify_jwt = false
[functions.mcp-server]          verify_jwt = false
[functions.connections-auto-test] verify_jwt = false
[functions.e2e-cleanup]         verify_jwt = false
```

Cada uma dessas funções implementa o seu próprio mecanismo de autenticação — o que é tecnicamente correto mas requer atenção especial. Análise individual:
- `e2e-cleanup`: usa token secreto com timing-safe compare — **aceitável**
- `image-proxy`: usa bot protection + anti-hotlinking — **aceitável mas fraco sem auth real**
- `mcp-server`: usa `x-mcp-key` validado em BD — **aceitável**
- `ai-recommendations`: verifica Bearer token manualmente — **aceitável**
- `crm-db-bridge`: sem auth de usuário — **risco**, qualquer IP pode chamar se souber a URL

### PROBLEMA: Image Proxy — Content-Type não validado

```typescript
// supabase/functions/image-proxy/index.ts:100-107
const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';
// ... repassa diretamente
'Content-Type': contentType,
```

Se a origem devolver `Content-Type: text/html` (página de erro, redirect), o proxy repassa esse content-type, potenciando content-sniffing.

| Risco | Arquivo:Linha | Nível |
|-------|---------------|-------|
| Rate limiter em memória (não persistente entre cold starts) | `_shared/rate-limiter.ts:11` | ALTO |
| CSP nonce não substituído nas edge functions | `_shared/cors.ts:61` | ALTO |
| `crm-db-bridge` sem autenticação de usuário | `crm-db-bridge/index.ts` | ALTO |
| Image proxy não valida se content-type é imagem | `image-proxy/index.ts:100` | MÉDIO |
| `@ts-ignore` em `e2e-cleanup/index.ts:26` | `e2e-cleanup/index.ts:26` | BAIXO |

---

## SEÇÃO 5 — MIGRAÇÕES E SCHEMA DO BANCO

### O que foi encontrado

371 migrações SQL organizadas cronologicamente. As últimas migrações mostram práticas saudáveis:
- Criação de índices para FKs importantes (`idx_product_views_product_id`, `idx_quotes_client_status`)
- REVOKE de funções sensíveis de PUBLIC/anon (`cleanup_rate_limits`, `acquire_ai_quota`)
- Limpeza de tabelas obsoletas com verificação de sanidade (`DROP TABLE IF EXISTS` + `DO $$ BEGIN...`)

A migração `20260507161547_drop_public_token_tables.sql` está **marcada como "PREPARED but NOT YET APPLIED"** — tabelas `quote_approval_tokens`, `public_token_failures`, `kit_share_tokens` ainda existem no banco de produção mas o código já foi removido.

### Riscos identificados

| Risco | Arquivo | Nível |
|-------|---------|-------|
| Migração pendente não aplicada (tabelas órfãs em produção) | `20260507161547_drop_public_token_tables.sql` | ALTO |
| 371 migrações sem mecanismo de rollback documentado | `supabase/migrations/` | MÉDIO |
| `supabase/config.toml` contém ID de projeto hardcoded (`doufsxqlfjyuvxuezpln`) | `config.toml:1` | BAIXO |
| Ausência de `supabase db test` integrado ao CI com resultado garantido | CI | MÉDIO |

---

## SEÇÃO 6 — AUTENTICAÇÃO E AUTORIZAÇÃO

### O que foi encontrado

O sistema de autenticação é robusto e bem arquitectado:

**Pontos positivos:**
- `AuthContext.tsx` implementa hierarquia de roles `dev > supervisor > agente` com aliases legados
- Rate limiting cliente-side no login (`useLoginRateLimit`) com lockout progressivo
- MFA/AAL2 suportado e verificado (`currentAAL`, `nextAAL`, `hasMFA`)
- Sessão auto-renovada 5 minutos antes de expirar
- Logout registrado em auditoria via `log_user_logout` RPC
- Guard contra race conditions com `fetchPromiseRef`
- Sessão armazenada em `localStorage` com `persistSession: true`

**Riscos identificados:**

```typescript
// src/integrations/supabase/client.ts:11
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
```

Estas variáveis são expostas no bundle do browser — **esperado e correto** para a anon key. Mas se `VITE_SUPABASE_URL` não estiver configurada, o cliente cria com `undefined` sem falhar imediatamente.

| Risco | Arquivo:Linha | Nível |
|-------|---------------|-------|
| `rolesLoaded: userRoles.length > 0` — se roles=[] por erro de rede, parece "não carregado" indefinidamente | `AuthContext.tsx:507` | MÉDIO |
| Sessão em `localStorage` — vulnerável a XSS se a sanitização falhar | `client.ts:11` | MÉDIO |
| `mfaRequired = canManage && currentAAL !== 'aal2'` é computado mas não forçado automaticamente (depende do componente consumidor) | `AuthContext.tsx:484` | MÉDIO |
| Sem mecanismo de revogação de sessão em todos os dispositivos no logout | `AuthContext.tsx:370-403` | BAIXO |
| Login social (Google SSO) mencionado mas não auditado profundamente | `docs/AUTH-SSO-ACTIVATION.md` | INFO |

---

## SEÇÃO 7 — SEGURANÇA: XSS, INJEÇÃO, CSRF, SECRETS

### XSS

Um único uso de `dangerouslySetInnerHTML` encontrado:

```tsx
// src/components/ui/chart.tsx:71-72
<style dangerouslySetInnerHTML={{ __html: sanitizeHtml(...) }} />
```

A função `sanitizeHtml` em `src/lib/security/validation.ts:7-20` é uma **implementação regex caseira** que não usa DOMPurify ou similar. Não cobre vectores como:
- `<svg><animate onbegin="alert(1)" attributeName="x" dur="0.1s" repeatCount="indefinite" /></svg>`
- `<details open ontoggle="alert(1)"><summary>x</summary></details>`
- `<body onscroll="alert(1)">` (quando injectado em contexto de body)
- Encoding duplo: `%3Cscript%3E`

### CSRF

Não foi encontrado token CSRF explícito — **aceitável** para SPA com autenticação via Bearer token (CORS protege contra CSRF em requests cross-origin).

### Secrets/Env

Nenhum segredo hardcoded encontrado no código-fonte. Variáveis sensíveis (`SUPABASE_SERVICE_ROLE_KEY`, etc.) são injectadas via GitHub Secrets e env vars do Deno.

**Ausência de `.env.example`**: apenas `.env.e2e.example` existe. Não há documentação de quais `VITE_*` vars são obrigatórias para desenvolvimento local.

### Variáveis VITE_ expostas ao browser

```
VITE_SENTRY_DSN           — pode revelar DSN do Sentry (não crítico)
VITE_SUPABASE_URL         — URL pública esperada
VITE_SUPABASE_PUBLISHABLE_KEY — anon key esperada
VITE_SHOW_DEV_INFRA_MESSAGES — flag interna
VITE_SUPABASE_PROJECT_ID  — ID do projeto (informação pública)
```

Nenhuma variável sensível (service_role_key, passwords) está exposta via `VITE_*`.

| Risco | Arquivo:Linha | Nível |
|-------|---------------|-------|
| `sanitizeHtml` regex caseira — não cobre todos vectores XSS | `src/lib/security/validation.ts:7-20` | MÉDIO |
| Ausência de `.env.example` para variáveis obrigatórias | Raiz do projeto | BAIXO |
| `Gitleaks` no CI mas apenas com `GITHUB_TOKEN` sem licença para orgs | `security.yml:32-35` | BAIXO |

---

## SEÇÃO 8 — ARQUITECTURA FRONTEND

### O que foi encontrado

**Pontos positivos:**
- `EnhancedErrorBoundary` na raiz (`main.tsx:7,30`)
- Sentry inicializado lazily após `requestIdleCallback` (não bloqueia FCP)
- Global error handlers instalados (`installGlobalErrorHandlers`)
- Todas as rotas usam lazy loading via `lazyWithRetry` (retry em caso de chunk error)
- Route-specific skeletons via `getFallback(pathname)` (`AppRoutes.tsx:15`)
- 404 handling via catch-all `*` no `homeAndClientRoutes`
- `RouteSuspense` location-aware para skeletons correctos
- Provider tree bem estruturado em `App.tsx`

**console.log/error em código de produção:**
Foram encontradas 221 chamadas a `console.*` no código-fonte que não são puramente testes, logger SSOT, ou comentadas. O Vite está configurado para remover `console` em produção (`drop: ['console', 'debugger']`) — mas isso apenas cobre `console.log/debug/info`, não `console.warn/error`. Logs de diagnóstico podem aparecer no console em produção.

| Risco | Arquivo | Nível |
|-------|---------|-------|
| 221 chamadas console.* que sobrevivem ao build de produção (warn/error) | src/ geral | BAIXO |
| `DevOnlyBridgeOverlay` em App.tsx — verificar tree-shaking em produção | `App.tsx:51` | BAIXO |
| Service Worker desregistado manualmente no boot — pode conflitir com cache | `main.tsx:38-42` | BAIXO |

---

## SEÇÃO 9 — GESTÃO DE ESTADO E PADRÕES DE DATA FETCHING

### O que foi encontrado

- 177 ficheiros usam `useQuery`/`useMutation`/`useInfiniteQuery` (React Query dominante)
- Zustand para estado global (`stores/`)
- React Hook Form para formulários

**Empty catch blocks** (potencialmente silenciando erros):

```typescript
// src/components/admin/connections/useSecretField.ts:139
} catch {}

// src/components/products/ColumnSelector.tsx:72
} catch {}

// src/components/expert/chat/useExpertChat.ts:169,435
} catch {}
```

Estes padrões silenciam falhas em localStorage, regeneração de thumbnails, e preferências de TTS. Embora muitos sejam justificados (localStorage pode falhar em modo privado), a falta de logging torna diagnósticos difíceis.

**Invalidação de cache pós-mutação**: não foi possível verificar em profundidade sem executar o código, mas o uso do React Query sugere que o padrão correto é seguido onde `queryClient.invalidateQueries` é chamado nas mutations.

| Risco | Arquivo:Linha | Nível |
|-------|---------------|-------|
| Múltiplos `catch {}` vazios silenciando falhas | Vários ficheiros | MÉDIO |
| Ausência de `onError` em alguns `useQuery` (erros não mostrados ao utilizador) | src/hooks/ geral | MÉDIO |

---

## SEÇÃO 10 — QUALIDADE DA SUÍTE E2E

### O que foi encontrado

- **129 ficheiros spec** Playwright (muito extenso)
- Catálogo centralizado em `e2e/routes/_catalog.ts` — excelente prática de SSOT
- Gate smoke com `--max-failures=1` — determinístico
- `--forbid-only` no CI para prevenir `test.only` esquecido
- Retries configurados: 2 no CI, 1 localmente

**Hardcoded sleeps encontrados:**

```typescript
// e2e/admin-conexoes-zone-collapse.spec.ts
await page.waitForTimeout(2200);

// e2e/flows/11-errors.spec.ts
await page.waitForTimeout(2000);

// e2e/protected-routes.spec.ts
await page.waitForTimeout(2000);

// e2e/estoque-exaustivo.spec.ts (múltiplas ocorrências)
await page.waitForTimeout(300); // "Aguarda animação"
await page.waitForTimeout(600); // "Debounce"

// e2e/flows/03-products.spec.ts (2 ocorrências)
await page.waitForTimeout(1500);
```

Total de `waitForTimeout` encontrado: **20+ ocorrências** — anti-pattern que causa flakiness em CI com recursos limitados.

**IDs fixos em testes:**
```typescript
// e2e/routes/_catalog.ts:10
export const SAMPLE_ID = "00000000-0000-0000-0000-000000000001";
```
Funciona bem com mocks, mas specs que acessam dados reais podem falhar se o ID não existir.

| Risco | Arquivo | Nível |
|-------|---------|-------|
| 20+ `waitForTimeout` hardcoded causando flakiness | e2e/ geral | ALTO |
| Spec `admin-conexoes-zone-collapse.spec.ts` com sleep de 2200ms | `admin-conexoes-zone-collapse.spec.ts` | MÉDIO |
| E2E workers=1 no CI (muito lento para 129 specs) | `playwright.config.ts:46` | MÉDIO |
| Secrets E2E como `E2E_USER_EMAIL` — sem verificação de que existem antes de rodar specs autenticados | `e2e.yml:26-29` | BAIXO |

---

## SEÇÃO 11 — COBERTURA DE TESTES UNITÁRIOS

### O que foi encontrado

- **344 ficheiros** de teste unitário em `tests/`
- **57 ficheiros** de teste unitário em `src/` (colocados com o código)
- **1.635 ficheiros** TypeScript/TSX em `src/`
- **Thresholds de cobertura**: 60% para statements/branches/functions/lines

A taxa de ~24% de ficheiros de teste vs ficheiros de fonte sugere que a cobertura pode ser inferior ao threshold de 60% em módulos críticos. O `vitest.config.ts` aplica thresholds globais, não por módulo.

**Scripts de teste customizados** por módulo (`test:price-freshness`, `test:cloud-status`) sugerem que certas áreas têm cobertura próxima de 0% sem esforço adicional específico.

**Ausência de testes unitários verificada em:**
- `src/lib/external-db/` (integração com DB externo)
- `src/lib/mcp/` (MCP client)
- `src/lib/pdf/` (geração de PDF)
- `src/services/` (vários services)

| Risco | Arquivo | Nível |
|-------|---------|-------|
| Threshold de 60% global pode esconder módulos críticos com 0% | `vitest.config.ts:57-62` | MÉDIO |
| `noUnusedLocals: false` e `noUnusedParameters: false` no tsconfig — código morto não detectado | `tsconfig.app.json:17-18` | BAIXO |
| Ausência de testes em lib/pdf, lib/mcp, services/ | src/ | MÉDIO |

---

## SEÇÃO 12 — PERFORMANCE E ANÁLISE DE BUNDLE

### O que foi encontrado

**Pontos positivos:**
- Todas as rotas lazy-loaded via `lazyWithRetry` — excelente
- `manualChunks` bem configurado separando: react-vendor, router, ui, query, supabase, framer-motion, date, charts, icons, zod, forms, toast, export, dnd
- Sourcemaps desabilitados em produção (`sourcemap: false`)
- `drop: ['console', 'debugger']` em produção
- `chunkSizeWarningLimit: 2000` (2MB) — tolerante demais

**Problemas de performance:**

```typescript
// vite.config.ts:79-82
// Icons — chunk único compartilhado entre rotas (cache de longo prazo).
// 680KB descomprimido / 118KB gzip carregado UMA vez por usuário.
// Otimização futura: migrar para imports `lucide-react/icons/<Name>`
```

O próprio código documenta que `lucide-react` é 680KB descomprimido. Com 1.635 ficheiros que provavelmente usam dozens de ícones, o tree-shaking não resolve sem imports individuais.

**Pre-warming externo no boot de sessão:**
```typescript
// AuthContext.tsx:277
import('@/lib/external-db-prewarm').then(m => m.prewarmExternalDb({ oncePerSession: true }));
```
Pre-aquece o DB externo em cada login — útil para UX mas adiciona carga de rede invisível ao utilizador.

| Risco | Arquivo:Linha | Nível |
|-------|---------------|-------|
| `lucide-react` 680KB sem tree-shaking real | `vite.config.ts:79` | MÉDIO |
| `chunkSizeWarningLimit: 2000` — threshold muito permissivo | `vite.config.ts:38` | BAIXO |
| Pre-warm de DB externo no login pode atrasar UX em redes lentas | `AuthContext.tsx:277` | BAIXO |

---

## SEÇÃO 13 — TRATAMENTO DE ERROS E OBSERVABILIDADE

### O que foi encontrado

**Pontos positivos:**
- Sentry integrado com carregamento lazy (`src/lib/sentry.ts`) — não bloqueia FCP
- `EnhancedErrorBoundary` na raiz
- Logger estruturado SSOT (`src/lib/logger.ts`)
- `installGlobalErrorHandlers` — captura `unhandledrejection` e `error`
- Edge functions usam logger estruturado JSON com `X-Request-Id`
- Headers `Authorization` e `Cookie` removidos do payload Sentry (`beforeSend`)
- `captureException` com buffer de 50 erros pré-inicialização

**Problemas:**
- `npm audit` com `|| true` — vulnerabilidades de segurança não bloqueiam CI
- 20+ empty catch blocks silenciando erros silenciosamente

```typescript
// src/components/admin/products/video-gallery/useProductVideoGallery.ts:334
for (const video of withoutThumb) { try { await regenerateThumbnail(video); successCount++; } catch {} }
// Falhas de regeneração de thumbnail são completamente silenciadas
```

| Risco | Arquivo:Linha | Nível |
|-------|---------------|-------|
| Empty catch blocks silenciando falhas em produção | Vários | MÉDIO |
| `VITE_SENTRY_DSN` não documentado como variável obrigatória | Config geral | BAIXO |
| Sem alertas automáticos configurados para taxa de erro elevada | Sentry config | INFO |

---

## SEÇÃO 14 — PADRÕES DE INTEGRAÇÃO DE API E EDGE CASES

### O que foi encontrado

**Padrão dominante**: `supabase.functions.invoke()` e React Query — consistente.

**Raw `fetch` encontrado** em componentes:
- `src/components/admin/telemetry/BreakerStatusCard.tsx:98`
- `src/components/ai/AIChat.tsx:199`
- `src/components/admin/telemetry/ColdVsWarmCrmCard.tsx:78`
- `src/components/admin/products/video-gallery/useProductVideoGallery.ts:310`
- `src/components/mockup/ShareMenu.tsx:46`

Estas chamadas `fetch` diretas não usam a camada de retry/circuit-breaker das edge functions. Em redes instáveis, falham sem retry.

**`_shared/external-fetch.ts`** com circuit breaker existe para edge functions mas não é aproveitado no frontend.

```typescript
// src/services/ramoAtividadeService.ts:35
const result = await response.json().catch(() => ({}));
// Se a API falha, silencia o erro e retorna {}
```

| Risco | Arquivo:Linha | Nível |
|-------|---------------|-------|
| Chamadas raw `fetch` sem timeout ou retry no frontend | Vários componentes | MÉDIO |
| `response.json().catch(() => ({}))` silencia falhas de parse | `ramoAtividadeService.ts:35`, `materialService.ts:71` | BAIXO |
| Edge function `crm-db-bridge` sem autenticação de usuário (verify_jwt=false + sem Bearer check) | `crm-db-bridge/index.ts` | ALTO |

---

## SEÇÃO 15 — GESTÃO DE VARIÁVEIS DE AMBIENTE

### O que foi encontrado

**Variáveis VITE_ usadas no código:**
```
VITE_SUPABASE_URL              — obrigatória
VITE_SUPABASE_PUBLISHABLE_KEY  — obrigatória  
VITE_SENTRY_DSN                — opcional (Sentry desativado se ausente)
VITE_SHOW_DEV_INFRA_MESSAGES   — opcional
VITE_SUPABASE_PROJECT_ID       — usada em componentes admin
VITE_DEV_CONTACT_EMAIL         — opcional, com fallback
```

**Ausência de `.env.example`**: apenas `.env.e2e.example` existe. Não há template para o ambiente de desenvolvimento local.

**Problema**: Se `VITE_SUPABASE_URL` ou `VITE_SUPABASE_PUBLISHABLE_KEY` não estiverem configuradas, o app cria o cliente Supabase com `undefined` e falha silenciosamente nas primeiras chamadas.

```typescript
// src/integrations/supabase/client.ts:5-6
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;         // pode ser undefined
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY; // pode ser undefined
```

| Risco | Arquivo:Linha | Nível |
|-------|---------------|-------|
| Ausência de `.env.example` para desenvolvimento local | Raiz | MÉDIO |
| `VITE_SUPABASE_URL` sem validação de presença (falha silenciosa) | `client.ts:5-6` | MÉDIO |
| `robots.txt` aponta Sitemap para domínio de desenvolvimento | `public/robots.txt:12` | BAIXO |

---

## SEÇÃO 16 — SEGURANÇA DE TIPOS TYPESCRIPT

### O que foi encontrado

**tsconfig.app.json:**
- `"strict": true` — **ótimo**
- `"noImplicitAny": true` — **ótimo**
- `"noUnusedLocals": false` — permite variáveis mortas (risco de dead code)
- `"noUnusedParameters": false` — permite parâmetros não usados
- `"skipLibCheck": true` — necessário mas ignora erros em .d.ts

**83 ocorrências** de `as any`, `@ts-ignore`, `@ts-nocheck` em `src/`:

```typescript
// src/components/admin/products/hooks/useProductFormDraft.ts
if (val !== undefined) setValue(key, val as any);

// src/components/dev/DiagnosticProfiler.tsx
(window as any).__DIAGNOSTICS__ = [];
```

Maioria das ocorrências são em ficheiros de teste (mocking de hooks), o que é aceitável. As ocorrências em código de produção são menos de 10.

**Baseline de TypeScript** (`tsc-baseline.json` com 20.497 bytes) sugere que existem erros de TypeScript conhecidos que foram "baselinados" em vez de corrigidos.

| Risco | Arquivo | Nível |
|-------|---------|-------|
| `.tsc-baseline.json` com 20KB de erros ignorados | `.tsc-baseline.json` | ALTO |
| `noUnusedLocals/Parameters: false` — código morto não detectado | `tsconfig.app.json:17-18` | BAIXO |
| 83 `as any`/`@ts-ignore` (maioria em testes — aceitável) | src/ | BAIXO |

---

## SEÇÃO 17 — ACESSIBILIDADE (A11Y)

### O que foi encontrado

- **1.223 ocorrências** de `aria-*` em componentes TSX — boa cobertura
- **215 ocorrências** de `role=` — cobertura razoável
- `eslint-plugin-jsx-a11y` configurado no ESLint
- `AccessibilityProvider` e `AriaLiveProvider` na raiz da aplicação (`App.tsx`)
- `ACCESSIBILITY.md` e `docs/MAGIC_UP_ONDA5_A11Y.md` existentes

**Imagens sem alt:**
```tsx
// src/components/catalog/BulkVariantWizard.tsx
<img ...>  // sem alt

// src/components/shared/AvatarLogo.tsx
<img ...>  // sem alt

// src/components/admin/ImageUploadButton.tsx
<img ...>  // sem alt

// src/components/bi/*.tsx (múltiplos)
<img ...>  // sem alt
```

20+ ocorrências de `<img>` sem atributo `alt` encontradas.

**Elementos clicáveis não semânticos:**
```tsx
// src/components/novelties/NoveltyCards.tsx
<div onClick={(e) => e.stopPropagation()}>...</div>
```
Divs com `onClick` que não têm `role="button"` ou `tabIndex` não são acessíveis por teclado.

| Risco | Arquivo | Nível |
|-------|---------|-------|
| 20+ `<img>` sem `alt` em componentes de produção | src/components/ geral | MÉDIO |
| `<div onClick>` sem `role="button"` ou `tabIndex` | `NoveltyCards.tsx`, outros | MÉDIO |
| ESLint baseline pode estar silenciando novas violações a11y | `.eslint-baseline.json` | BAIXO |

---

## SEÇÃO 18 — RESPONSIVIDADE MOBILE

### O que foi encontrado

- **1.153 ocorrências** de classes Tailwind responsivas (`sm:`, `md:`, `lg:`, `xl:`)
- `docs/MOBILE.md` existe
- Projeto E2E inclui `routes-mobile` (embora com poucos specs dedicados)
- `ACCESSIBILITY.md` menciona responsividade

Não foram encontrados larguras fixas em pixels hardcoded em componentes principais (uso correto de Tailwind).

O ficheiro `playwright.config.ts` tem o projeto `routes-mobile` configurado mas CI executa principalmente `chromium-public` e `chromium-authed` — mobile não está garantido no gate de CI.

| Risco | Arquivo | Nível |
|-------|---------|-------|
| Testes mobile não incluídos no gate de CI principal | `e2e.yml`, `playwright.config.ts` | MÉDIO |
| `lovable-tagger` em dependencies (plugin de development em produção) | `package.json:145` | BAIXO |

---

## SEÇÃO 19 — DOCUMENTAÇÃO E EXPERIÊNCIA DO DESENVOLVEDOR

### O que foi encontrado

A documentação é excepcionalmente extensa — mais de 50 ficheiros em `docs/`:
- ADRs (`docs/adr/`)
- Runbooks (`docs/RUNBOOKS/`, `docs/RUNBOOK.md`, `docs/SECURITY_RUNBOOK.md`)
- Postmortem template (`docs/POSTMORTEM_TEMPLATE.md`)
- Guias específicos (HOOKS_USAGE_GUIDE.md, EDGE_FUNCTIONS.md, RBAC_HELPERS.md)
- Histórico de sessões (`docs/sessoes/`, `docs/historico/`)

**Ausências notáveis:**
- Sem `CLAUDE.md` (documento de onboarding para IA assistentes)
- Sem `.env.example` para ambiente local
- `docs/RUNBOOK.md` não foi verificado em profundidade

**DX (Developer Experience):**
- `husky` com pre-push hook executando `npm run test`
- `lint-staged` com Prettier + ESLint
- Scripts bem nomeados em `package.json` com descrições implícitas
- `check:*` scripts para validações específicas

| Risco | Arquivo | Nível |
|-------|---------|-------|
| Ausência de `CLAUDE.md` | Raiz | BAIXO |
| Ausência de `.env.example` | Raiz | MÉDIO |
| `docs/historico/` e `docs/sessoes/` podem conter informação sensível de sessões passadas | docs/ | BAIXO |

---

## SEÇÃO 20 — CHECKLIST DE PRONTIDÃO PARA PRODUÇÃO

### CHANGELOG e Versioning

`CHANGELOG.md` existe e segue Keep a Changelog. Versão actual no package.json é `2.0.0`. O CHANGELOG tem entradas até `[3.4.0]` mas o package.json diz `2.0.0` — **inconsistência de versão**.

### TODO/FIXME/HACK

Análise dos comentários encontrados: a maioria das ocorrências de "TODO" no código são em português e referem-se a palavras da língua (ex: "TODOS os vendedores", "TODOS os papéis"), não a marcadores de tarefas pendentes. Sem TODOs de código críticos identificados.

### Rate Limiting em Endpoints de Auth

O frontend tem rate limiting cliente-side em `useLoginRateLimit` mas não há evidência de rate limiting server-side no endpoint de auth do Supabase (além do que o Supabase Auth já provê).

### CSP

- `public/_headers`: CSP configurada com `'unsafe-inline'` para `script-src` — **reduz a protecção XSS**
- Edge functions: CSP com nonce placeholder não substituído
- CSP do `_headers` inclui domínios externos legítimos (Supabase, Cloudflare, ElevenLabs, OpenAI, Gemini)

### Robots.txt / Security.txt

- `robots.txt`: existe mas com `Sitemap:` apontando para domínio de desenvolvimento
- `security.txt`: **não existe** — `SECURITY.md` no repo substitui parcialmente mas não é o padrão RFC 9116

### Backup de Base de Dados

Não foi encontrada documentação de estratégia de backup. A pasta `recovery/snapshots/` sugere que o backup é manual/ad-hoc.

| Risco | Arquivo | Nível |
|-------|---------|-------|
| `'unsafe-inline'` em `script-src` da CSP do frontend | `public/_headers:11` | ALTO |
| CHANGELOG diz v3.4.0 mas package.json diz v2.0.0 | `CHANGELOG.md`, `package.json` | BAIXO |
| Sem `security.txt` (RFC 9116) | `public/` | BAIXO |
| Estratégia de backup de BD não documentada | docs/ | MÉDIO |
| `supabase/functions/tests/` directório de testes nas funções mas não integrado ao CI de forma garantida | CI | BAIXO |

---

## CENÁRIOS SIMULADOS (Dia-a-Dia)

Simulação de 20 cenários reais de uso com análise de pass/fail:

| # | Cenário | Status | Observação |
|---|---------|--------|------------|
| 1 | **Vendedor tenta login com password errada 6x** | PASS | Rate limiting cliente-side funciona; bloqueia após N tentativas |
| 2 | **Admin cria novo usuário via manage-users** | PASS | Zod valida payload; auth verificada; auditoria registrada |
| 3 | **Agente tenta acessar rota `/admin`** | PASS | `AdminRoute` redireciona; RLS impede acesso ao banco |
| 4 | **Usuário faz logout em tab A; tab B ainda está aberta** | PARCIAL | `onAuthStateChange` deveria propagar; mas se há debounce ou race, tab B pode ficar com token válido até refresh |
| 5 | **Chamada ao endpoint `ai-recommendations` com 61 req/min** | FAIL | Rate limiter em memória não persiste entre cold starts — limite pode ser bypassado |
| 6 | **Atacante tenta SSRF via image proxy com URL de IP interno** | PASS | Allowlist de domínios bloqueia — apenas `spotgifts.com.br` permitido |
| 7 | **Imagem no image proxy retorna `Content-Type: text/html`** | FAIL | Content-type não validado — repassa HTML para o browser |
| 8 | **Build de CI após atualizar uma edge function** | INDETERMINADO | Actions `@v6/@v7` não existem — CI pode estar falhando |
| 9 | **Desenvolvedor novo clona o repo e tenta rodar localmente** | FAIL | Sem `.env.example` — variáveis obrigatórias não documentadas |
| 10 | **Usuário com MFA habilitado faz login** | PASS | AAL2 verificado; `mfaRequired` computado corretamente |
| 11 | **Screen reader navega pelo catálogo** | PARCIAL | 1223 aria-* é bom; 20+ imagens sem alt são problemas reais |
| 12 | **Usuário em mobile (375px) usa o kit builder** | PARCIAL | 1153 classes responsivas; testes mobile não no gate de CI |
| 13 | **Orçamento com valor > MAX_INT em campo de preço** | PASS (provável) | Zod valida nos edge functions; mas validação frontend não auditada em profundidade |
| 14 | **Injeção de HTML malicioso em campo de nome de produto** | PARCIAL | `sanitizeHtml` regex caseira — não cobre todos os vectores XSS |
| 15 | **Admin tenta promover outro usuário para supervisor** | PASS | `PromoteRoleSchema` exige password do caller + justificativa; auditado |
| 16 | **Sessão expira durante uso; token auto-renova** | PASS | Timer de auto-refresh 5 min antes do expire; `refreshSession` bem implementado |
| 17 | **E2E spec falha no CI porque SAMPLE_ID não existe no banco** | FAIL (risco) | IDs fixos dependem de dados de seed que podem não existir |
| 18 | **Webhook externo envia payload malformado para `webhook-inbound`** | PASS (provável) | Zod valida entrada nas edge functions |
| 19 | **Desenvolvedor abre PR sem rodar testes** | PASS | husky pre-push + CI obrigatório bloqueiam merge |
| 20 | **Atacante tenta aceder `crm-db-bridge` sem credenciais** | FAIL (risco) | `verify_jwt=false` e sem Bearer check visível nas primeiras 60 linhas — necessita auditoria completa da função |

---

## BACKLOG DE REMEDIAÇÃO PRIORIZADO

### P0 — Crítico (Bloqueia Produção) — Resolver em < 48h

| ID | Problema | Esforço | Arquivo |
|----|----------|---------|---------|
| P0-1 | Corrigir versões de GitHub Actions (`@v6/@v7` → `@v4`) em **todos** os workflows | 1h | `.github/workflows/*.yml` |
| P0-2 | Substituir nonce placeholder `{{nonce}}` na CSP das edge functions ou remover a directiva incompleta | 2h | `supabase/functions/_shared/cors.ts:61` |
| P0-3 | Auditar `crm-db-bridge` — garantir que tem autenticação de usuário antes de qualquer operação de leitura/escrita | 4h | `supabase/functions/crm-db-bridge/index.ts` |
| P0-4 | Aplicar migração pendente (`drop_public_token_tables`) em produção ou reverter a decisão documentada | 2h | `supabase/migrations/20260507161547_*` |

### P1 — Alto (Resolver em < 1 semana)

| ID | Problema | Esforço | Arquivo |
|----|----------|---------|---------|
| P1-1 | Substituir rate limiter em memória por solução persistente (tabela Supabase com cleanup automático) | 1 dia | `supabase/functions/_shared/rate-limiter.ts` |
| P1-2 | Substituir `sanitizeHtml` regex caseira por DOMPurify ou equivalente testado | 4h | `src/lib/security/validation.ts` |
| P1-3 | Validar Content-Type da resposta no image proxy (aceitar apenas `image/*`) | 2h | `supabase/functions/image-proxy/index.ts:100` |
| P1-4 | Remover `|| true` do `npm audit` no CI — configurar política de vulnerabilidades clara | 1h | `.github/workflows/ci.yml:108-110` |
| P1-5 | Criar `.env.example` com todas as variáveis obrigatórias documentadas | 2h | Raiz do projecto |
| P1-6 | Fixar TypeScript em `5.x` estável até TS6 atingir GA | 1h | `package.json:devDependencies` |
| P1-7 | Remover `'unsafe-inline'` do `script-src` na CSP do `_headers` ou implementar nonce real | 4h | `public/_headers:11` |

### P2 — Médio (Resolver em < 1 mês)

| ID | Problema | Esforço | Arquivo |
|----|----------|---------|---------|
| P2-1 | Substituir 20+ `waitForTimeout` nos E2E por `waitForSelector` / `waitForResponse` | 2 dias | `e2e/*.spec.ts` |
| P2-2 | Adicionar testes mobile ao gate de CI (`routes-mobile` no job de regression) | 4h | `.github/workflows/e2e.yml` |
| P2-3 | Adicionar `alt` a 20+ `<img>` sem atributo | 4h | `src/components/` geral |
| P2-4 | Corrigir inconsistência de versão (CHANGELOG v3.4.0 vs package.json v2.0.0) | 30min | `CHANGELOG.md`, `package.json` |
| P2-5 | Resolver erros do `.tsc-baseline.json` em vez de os ignorar | 3 dias | `.tsc-baseline.json`, `src/` |
| P2-6 | Mover `@testing-library/*`, `jsdom`, `jest-axe` para `devDependencies` | 1h | `package.json` |
| P2-7 | Pinnar GitHub Actions por SHA para supply chain security | 2h | `.github/workflows/*.yml` |
| P2-8 | Actualizar `robots.txt` e `sitemap.xml` para domínio de produção | 30min | `public/robots.txt`, `public/sitemap.xml` |
| P2-9 | Documentar estratégia de backup de base de dados | 4h | `docs/DEPLOYMENT.md` |
| P2-10 | Adicionar thresholds de cobertura por módulo (não apenas global) | 4h | `vitest.config.ts` |

### P3 — Baixo (Backlog Normal)

| ID | Problema | Esforço | Arquivo |
|----|----------|---------|---------|
| P3-1 | Criar `CLAUDE.md` com convenções de desenvolvimento | 2h | Raiz |
| P3-2 | Criar `public/.well-known/security.txt` (RFC 9116) | 1h | `public/` |
| P3-3 | Migrar `lucide-react` para imports individuais (tree-shaking real) | 2 dias | `src/` geral |
| P3-4 | Activar `noUnusedLocals: true` e `noUnusedParameters: true` | 1 dia | `tsconfig.app.json`, `src/` |
| P3-5 | Remover `recovery/` do repositório ou mover para repositório privado | 4h | `recovery/` |
| P3-6 | Resolver empty catch blocks com logging adequado | 1 dia | `src/` geral |
| P3-7 | Implementar chamadas `fetch` frontend com timeout e retry | 2 dias | Componentes com raw fetch |
| P3-8 | Actualizar `date-fns` de v2 para v3 | 4h | `package.json`, `src/` |

---

## ANÁLISE DE RISCO AGREGADO

| Categoria | Score | Notas |
|-----------|-------|-------|
| Autenticação e Autorização | 7/10 | Boa arquitectura mas MFA não forçado automaticamente |
| Segurança de APIs (Edge Functions) | 6/10 | Rate limiter não persistente; nonce CSP inválido |
| Pipeline de CI/CD | 4/10 | Actions com versões inexistentes é bloqueante |
| Qualidade de Código | 7/10 | TypeScript strict; alguns `as any`; baseline de erros |
| Cobertura de Testes | 6/10 | 344 testes mas thresholds globais; flakiness nos E2E |
| Documentação | 9/10 | Excepcionalmente documentado |
| Performance | 7/10 | Code splitting bom; lucide não tree-shaken |
| Acessibilidade | 6/10 | Boa base; 20+ imgs sem alt |
| **TOTAL** | **6.5/10** | Pronto para produção com P0/P1 resolvidos |

---

*Auditoria realizada por inspeção estática de código. Recomenda-se validação dinâmica (pen test, load test) após implementação das correções P0 e P1.*
