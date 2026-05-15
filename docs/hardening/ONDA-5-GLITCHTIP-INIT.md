# Onda 5 — GlitchTip init (Sentry SDK compatível)

**Data:** 14 de maio de 2026  
**PR alvo:** cleanup/onda-5-glitchtip-init  
**Bloqueador resolvido:** B-1.2 (Sentry init — fechamento do ciclo da Onda 4)  
**Tempo de execução:** ~30 minutos  
**Risco:** baixo (modifica config do init existente, não muda arquitetura)

## Contexto

A Onda 4 (PR #191) preservou `console.error/warn` em bundle de produção. Mas eles aparecem **só no DevTools dos vendedores** — o time técnico não tem visibilidade. Esta Onda fecha esse ciclo enviando erros pro **GlitchTip self-hosted** da Atomica BR.

## Por que GlitchTip e não Sentry SaaS

| Item | Sentry SaaS | **GlitchTip self-hosted** (escolhido) |
|---|---|---|
| Custo | Free tier 5k erros/mês, depois US$26+ | **Zero** (Atomica VPS) |
| Limite de erros | 5k/mês free | **Ilimitado** |
| Dados onde | Sentry.io (EUA) | **VPS da Atomica BR** (LGPD-friendly) |
| SDK no código | `@sentry/react` | `@sentry/react` (idêntico) |
| Config no código | só muda DSN | só muda DSN |

GlitchTip aceita o SDK do Sentry sem modificação porque é uma reimplementação OSS do protocolo de envio de eventos do Sentry.

**Projeto no GlitchTip:** `PromoGifts Frontend` (id=4) já existia, criado em 10/mai/2026.

## Estado anterior à Onda 5

O arquivo `src/lib/sentry.ts` (134 linhas) **já existia** e fazia o essencial:
- Lazy load do bundle Sentry (~186KB) após `requestIdleCallback` ou 3s — bom pra performance
- Buffer de erros + `setUser` pré-init
- Env var: `VITE_SENTRY_DSN`
- Replay integration com `maskAllText` + `blockAllMedia`
- `beforeSend` que remove headers `authorization` e `cookie` (LGPD)

`src/main.tsx` já chamava `initSentry()` antes do React render.  
`src/lib/error-reporter.ts` já fazia forward de erros via `captureException`.

**O que faltava:**
1. `captureConsoleIntegration` — pra capturar `console.error` (e logger.error) automaticamente
2. `replaysOnErrorSampleRate: 1.0` em prod (estava em 0.1 = 10%)
3. `maskAllInputs: true` (inputs de cliente — LGPD)
4. `release` tag = commit SHA do Vercel (associar erro ao deploy)
5. `ignoreErrors` pra ruído conhecido (ResizeObserver, network, extensões)
6. `.env.example` documentando as vars

## Mudanças aplicadas

### `src/lib/sentry.ts` (modificado, +25/-3 linhas)

Ver diff no PR.

### `.env.example` (novo, ~50 linhas)

Documenta TODAS as 7 vars VITE_* usadas no projeto, com:
- Comentários explicando cada uma
- Aviso sobre não colocar secrets
- Link para o GlitchTip onde pegar o DSN

## Decisões arquiteturais

### Por que NÃO modificar `logger.ts`

`logger.error()` já chama `console.error()` internamente (logger.ts:70). Com a Onda 4 mantendo `console.error` no bundle prod + `captureConsoleIntegration({ levels: ['error'] })` da Onda 5, a captura é **automática e transparente**. Não há ganho em adicionar `Sentry.captureException()` explícito no logger.

### Por que manter `VITE_SENTRY_DSN` (e não renomear pra `VITE_GLITCHTIP_DSN`)

1. Já está em uso no código existente (sentry.ts, main.tsx)
2. GlitchTip é um clone OSS do Sentry SDK protocol — o nome "Sentry DSN" é semanticamente correto pro SDK
3. Reduz blast radius da mudança (zero rebuild em outros lugares)
4. Anti-bikeshedding

### Por que `replaysOnErrorSampleRate: 1.0` em prod

Aprovado por Joaquim. Trade-off: +80KB no bundle (replay integration) + ~1MB por erro armazenado no GlitchTip. Benefício: ver EXATAMENTE o que o vendedor fez antes de quebrar — debug ~10x mais rápido. Com 15 vendedores e ~poucos erros/dia esperados, armazenamento é desprezível.

### LGPD

- `maskAllText: true` — todo texto na tela vira `*****` no replay
- `maskAllInputs: true` — valores digitados em inputs viram `*****`
- `blockAllMedia: true` — imagens (incluindo logos de cliente que vendedor sobe pra mockup) NÃO vão pro GlitchTip
- `beforeSend` remove headers `authorization` e `cookie`
- Apenas `user.id` é setado (sem email, sem nome)

## Validação empírica feita

1. ✅ `captureConsoleIntegration` confirmada em `@sentry/core` (e reexportada em `@sentry/react` via `export *`)
2. ✅ Sintaxe TS validada via `esbuild` standalone (transpila sem erros)
3. ✅ Versão real instalada: `@sentry/react@8.55.2` (compatível com declarado `^8.45.0`)

`tsc` do projeto inteiro não rodou no VPS (>7min, limite de MCP) — validação completa de tipos roda no CI quando PR for aberto.

## Pré-requisitos para deploy

**Você (Joaquim) precisa adicionar 1 env var no Vercel:**

| Variável | Valor |
|---|---|
| `VITE_SENTRY_DSN` | `https://66323199858e42958e4dfcde3cd77b7e@erros.atomicabr.com.br/4` |

Opcionalmente:

| Variável | Valor |
|---|---|
| `VITE_SENTRY_ENVIRONMENT` | `production` |

**Como adicionar no Vercel (3 cliques):**
1. https://vercel.com/dashboard → projeto **Promo_Gifts**
2. **Settings** (aba superior) → **Environment Variables** (menu lateral)
3. **Add New** → Name: `VITE_SENTRY_DSN` → Value: cola o DSN → marcar **Production** + **Preview** + **Development** → Save
4. (Opcional) Repetir pra `VITE_SENTRY_ENVIRONMENT=production`
5. Próximo deploy automático vai usar essas vars

## O que vai acontecer depois do merge + Vercel deploy

1. Próxima vez que algo quebrar no frontend → aparece em https://erros.atomicabr.com.br
2. Cada erro vem com:
   - Stack trace completo
   - Browser, URL, ação
   - Replay do que o vendedor fez nos últimos 30s antes do erro (com texto/inputs mascarados)
   - Release tag = SHA do commit que causou
3. Logs `logger.error()` automaticamente viram issues no GlitchTip
4. Ruído (ResizeObserver, network offline, extensões) NÃO vira issue

## Riscos / rollback

- **Performance:** Sentry carrega após idle (3s) — não afeta First Contentful Paint
- **Replay (80KB):** baixado apenas se o bundle Sentry carregar, e o usuário precisar
- **Custo GlitchTip:** zero (self-hosted)
- **Rollback simples:** reverter o PR (1 arquivo lógico)

## Próximos passos (Ondas 6+)

- **Onda 6 (B-7):** `checkAiQuota` fail-closed em vez de fail-open
- **Onda 7 (B-4):** `validate_quote_real_discount` fail-closed em NULL
- **Onda 8 (B-3):** RLS `USING(true)` em 7 tabelas
