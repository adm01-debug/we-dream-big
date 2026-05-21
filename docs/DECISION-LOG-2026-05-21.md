# DECISION-LOG — Missão "CI Green" (we-dream-big / PromoGifts)

**Data:** 21/mai/2026
**Autor da sessão:** Claude (via Joaquim, PO)
**Repo:** `adm01-debug/we-dream-big` (full_name resolve p/ `promo-gifts-v4`)
**Branch de trabalho:** `claude/resolve-dev-challenges-zBpdc` (PR #27)

---

## 1. OBJETIVO DA MISSÃO

Levar o repositório a um estado verde/funcional, um item por vez, com excelência.
Duas garantias separadas:

- **Garantia A** — "edito no Lovable → vejo no Vercel sem erro". JÁ FUNCIONA.
  Produção `https://we-dream-big.vercel.app/` responde 200; Vercel roda só `vite build`
  e IGNORA os gates de CI vermelhos do GitHub.
- **Garantia B** — selo de qualidade (gates do GitHub Actions verdes) para o dia do
  desligamento do Lovable. EM ANDAMENTO.

**Dor central:** caos de agentes paralelos (6 PRs + Copilot + Lovable) batendo na mesma
base, nenhum integrado, recriando a mesma dívida. + perda de contexto entre chats.

---

## 2. O QUE FOI CONCLUÍDO NESTA SESSÃO (21/mai)

### 2.1. Seis arquivos corrigidos + commitados no PR #27

Commits no branch `zBpdc` (todos autor `adm01-debug`, via HTTP MCP Worker, SEM tocar a main):

| Commit | Conteúdo |
|---|---|
| `3d588c4` | 6 fixes (5 testes + 1 componente) + `.gitignore` |
| `eebee3a` | remove arquivo `null` (lixo) |
| `9de9838` | remove `bun.lock` (projeto usa npm) — HEAD atual |

Base do commit: `3913e7c` (commit assinado de Claude de 20/mai).

**Os 6 arquivos (cada um validado na fonte — drift de mock vs bug real):**

1. `src/services/__tests__/quoteService.test.ts` — DRIFT: produção migrou
   `.single()`→`.maybeSingle()`; mock acompanha. 2/2.
2. `tests/contexts/AuthContext.test.tsx` — mesma raiz (mock `profiles` ganhou
   `maybeSingle`). 5/5.
3. `src/components/dev/BridgeMetricsOverlay.tsx` — BUG REAL de segurança. Gate
   final: `const { isDev, isAllowed } = useDevGate(); if (!isDev || !isAllowed) return null`.
   Combina os 2 testes de regressão:
   - admin não-dev (isAllowed:true, isDev:false) → null
   - dev rejeitado pelo SSOT (isAllowed:false, isDev:true) → null
   7/7 (test próprio + ProdGate).
4. `src/pages/Auth.test.tsx` — 3 causas: mock `useDevGate` faltando +
   `usePasswordResetRequests` (useEffect→supabase) mock parcial via importOriginal +
   ForgotPasswordForm monta via AnimatePresence (teste virou async com findByRole). 3/3.
5. `src/tests/AdminLayout.test.tsx` — mais espinhoso. MainLayout real usa
   lazyWithRetry+Suspense aninhado → pendura quando montado 2x em jsdom.
   SOLUÇÃO: `vi.mock('@/components/layout/MainLayout', ...)` com wrapper fiel
   (sidebar + children). Cobertura real do MainLayout vive em
   `tests/components/layout/MainLayout.breadcrumbs.test.tsx`. 2/2.
6. `src/pages/__tests__/FiltersPage.no-duplicate-sidebar.test.tsx` — path pós-reorg:
   `src/pages/FiltersPage.tsx` → `src/pages/products/FiltersPage.tsx`. Guard
   anti-regressão (lê fonte via readFileSync). 2/2.

### 2.2. Higiene aprovada pelo PO

- Removidos `null` (55B, lixo de `> null` acidental) e `bun.lock` (279KB, conflita
  com npm). Ambos adicionados ao `.gitignore`. Nenhuma referência a bun em CI/vercel.
- **Dependabot #25:** comentado `@dependabot ignore this minor version` (react-router
  6.30.3). Decisão PO: parar a guerra de package-lock com o Lovable, ficar em 6.28.0
  (que o Lovable força). Temporário — Lovable morre na Fase 3.

### 2.3. Verificação (TZ=America/Sao_Paulo, igual ao CI)

- `src` completa: **2342 pass / 0 falha real** (subiu de 2334).
- `tests/components` (4 fatias p/ caber em 4GB): **1555 pass / 0 falha real**.
- `vite build`: **EXIT=0** (~2min) → Garantia A intacta.
- Status combinado do HEAD `9de9838`: **success** (Vercel deploy completed + CodeRabbit).

---

## 3. DESCOBERTAS CRÍTICAS (não repetir investigação)

### 3.1. BUG DE TIMEZONE NOS TESTES (regra permanente)
Sandbox roda UTC; CI roda America/Sao_Paulo (UTC-3). SEM `TZ=America/Sao_Paulo` no
processo, ~14 testes dão FALSO-POSITIVO (snapshots PriceFreshnessBadge +3h, MockupDeletion).
**SEMPRE rodar: `TZ=America/Sao_Paulo npx vitest run <fatia> --no-coverage --reporter=dot`.**
**NUNCA commitar esses snapshots "corrigidos"** (quebraria o CI).

### 3.2. SANDBOX 4GB → OOM na suíte completa
Suíte inteira em threads dá OOM/flaky. Rodar POR FATIAS. As "falhas" de ProductCard e
AIRecommendationsPanel no run cheio eram FLAKY (1º teste de arquivo pesado ~2.7s estoura
timeout sob pressão) — passam 100% isoladas. NÃO ocorrem no CI (mais RAM + maxThreads:2).

### 3.3. MainLayout é frágil de testar isolado
lazyWithRetry (Header/Sidebar/PageTransition/CommandBar/Breadcrumbs) + Suspense aninhado
penduram quando MainLayout monta 2x em jsdom. REGRA: testes que precisam do MainLayout
devem MOCKÁ-LO. Cobertura real dele = `MainLayout.breadcrumbs.test.tsx`.

### 3.4. Push via GitHub App NÃO dispara workflows de CI
Os gates de qualidade (Lint/Typecheck/Test, vitest, e2e, baselines) NÃO rodaram no #27
porque o push via Worker MCP (GitHub App) não dispara cascata de workflows (proteção do
GitHub). Pra disparar: tirar o PR de **draft** → "ready for review", OU push via credencial
de usuário humano. Por isso o #27 só mostra Vercel + CodeRabbit como checks.

---

## 4. MUDANÇA ESTRATÉGICA DETECTADA (decidir no próximo turno)

**A main está sendo consertada em PARALELO por outro agente.** O PR #32 (Copilot,
"fix: rename JSX discount test file to .tsx") foi MERGEADO na main (`04a35ea`, 15:04) —
fazendo EXATAMENTE um dos fixes que o #27 também propunha.

Implicações:
- Parte do #27 já é redundante com a main.
- #27 (base `db94c9b`) diverge muito da main atual (`04a35ea`). Merge as-is arriscaria
  conflito/reversão do que o Copilot já corrigiu.

**RECOMENDAÇÃO (não executada — aguarda PO):** antes de perseguir o verde do #27,
diagnosticar o que a main já absorveu, e decidir entre:
  (a) rebasar #27 sobre a main atual, OU
  (b) extrair só os fixes ÚNICOS do #27 num PR novo e enxuto sobre a main fresca.
NÃO tirar o #27 do draft com base velha (geraria vermelhos artificiais de baseline).

---

## 5. ESTADO DOS PRs (21/mai ~15:40)

- **#27** (zBpdc) — vencedor eleito; 3 commits novos meus; draft; base velha `db94c9b`.
- **#25** (dependabot react-router) — comando `ignore minor` postado; aguarda bot fechar.
- **#32** (Copilot) — JÁ MERGEADO na main (rename .tsx).
- **main** — `04a35ea`; CI=failure, E2E=failure (esperado; não bloqueia Vercel).
- Outros (#28/#26/#24/#23/#29) — não reavaliados nesta sessão.

---

## 6. REGRAS INVIOLÁVEIS (relembrar sempre)

- NUNCA commitar direto na main (branch+PR sempre). Exceto doc-only com precedente.
- NUNCA deletar sem confirmação explícita do PO.
- Validar tudo antes de executar; mapear escopo antes de agir.
- Operações GitHub: SEMPRE via HTTP MCP Worker `https://github-mcp-server.adm01.workers.dev/mcp`
  (curl JSON-RPC) com `branch` explícito. `git push`/`gh` dão 403. MCP FOREVER
  `github_create_or_update_file`/`github_delete_file` SEM branch commitam direto na main.
- `github_delete_file` exige SHA do blob (buscar via `github_get_contents` com `ref`).
- `github_push_files` faz UM commit consolidado (não preserva commits locais).

---

## 7. PRÓXIMOS PASSOS (ordem sugerida)

1. [PO decide] Estratégia do #27 vs main divergente (rebase vs PR novo enxuto) — §4.
2. Confirmar Dependabot #25 fechado.
3. Quando sincronizado: tirar PR de draft → gates rodam → perseguir verde fatia por fatia.
4. Demais PRs antigos (#28/#26/#24/#23/#29): fechar os perdedores p/ reduzir ruído.
5. (Fase 3) transferência do Supabase Lovable; revogar PATs antigos.
