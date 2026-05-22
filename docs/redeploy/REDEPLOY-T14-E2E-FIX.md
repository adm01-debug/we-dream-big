# T14 — E2E Smoke Gate Fix (Hidratação SPA)

**Data**: 2026-05-22
**Operador**: Agente Claude via GitHub MCP + bash local
**Sponsor**: Joaquim (adm01-debug)
**Status**: ✅ FIX APLICADO — aguardando validação no GH Actions
**Run de referência**: [26301868515](https://github.com/adm01-debug/promo-gifts-v4/actions/runs/26301868515)

## TL;DR

12 runs E2E consecutivos falhavam no mesmo teste (`90 · Tela de login renderiza`) com timeout de 15s. Causa raiz: **10.8s de hidratação React no main thread**, depois do bundle JS já estar baixado, antes do form renderizar. Fix: escalar timeouts do Playwright apenas em CI (`process.env.CI`). Local inalterado.

T14 do plano de redeploy 2026-05 finalmente desbloqueia.

## Diagnóstico

### Sintoma
Run E2E 26301868515 (e os 11 anteriores) falham em:

```
Step 15: 🛑 Fail-fast se smoke falhou (gate)
```

O step 12 (`Run E2E smoke`) tem `continue-on-error: true`, registra a falha,
e o gate explícito (step 15) detecta `steps.e2e_smoke.outcome != 'success'` e mata o job.

### Teste que falha
`e2e/flows/20-all-features-smoke.spec.ts:253` — primeiro teste **público** real
(testes 00–33 e 99 são `skipped` via `requireAuth()` sem credenciais `E2E_USER_EMAIL`):

```
Error: expect(locator).toBeVisible() failed
Locator: locator('[data-testid="login-email-input"]')
Timeout: 15000ms — element(s) not found
```

### Causa raiz (reproduzida e quantificada localmente)

Instrumentando a página `/login` via `playwright trace` no mode `vite preview`
(bundle de produção minified, idêntico ao Vercel deploy):

| Fase | Tempo | O que acontece |
|---|---|---|
| 0–7s   | 7.5s | Browser baixa ~100 chunks JS (5732 módulos transformados pelo Vite) |
| 7–18s  | **10.8s SILÊNCIO** | **Parsing + hidratação React no main thread** (nenhum HTTP) |
| 18–19s | 1s   | Fontes + assets (astronaut.svg) |
| ~21s   | —    | ✅ Form de login finalmente visível |

O `expect.timeout: 15_000` original cai **no meio** da janela de hidratação.
Antigamente o app cabia em <10s; bundle cresceu (chunks: `index-NCSmzCgN.js`
sozinho é 904 kB), ultrapassou o teto.

### Por que TODOS os 12 runs falham idêntico
Bug é **determinístico**, não flaky. Em CI Linux com 2 vCPU compartilhados,
hidratação é consistentemente lenta. Não depende do conteúdo do commit
(todos recentes eram docs/manuals).

### Por que `vite preview` não resolveu sozinho
Hipótese inicial (dev mode → preview mode) descartada: o gap de 10.8s
acontece **igual** com bundle minificado. É **CPU-bound (JS execution)**,
não bandwidth-bound (HTTP serving).

## Solução aplicada

Escalar timeouts do Playwright apenas em CI, mantendo limites apertados localmente:

### `playwright.config.ts` (commit `8c3bb0b`)
```diff
- expect: { timeout: 15_000 },
+ expect: { timeout: process.env.CI ? 45_000 : 15_000 },
- actionTimeout: 10_000,
- navigationTimeout: 20_000,
+ actionTimeout: process.env.CI ? 30_000 : 10_000,
+ navigationTimeout: process.env.CI ? 45_000 : 20_000,
```

### `e2e/helpers/waits.ts` (commit `b340ec38`)
```diff
- const DEFAULT_TIMEOUT = 10_000;
+ const DEFAULT_TIMEOUT = process.env.CI ? 30_000 : 10_000;
```

Esse helper interno é usado por `expectVisibleByTestId`, `waitForTestIdVisible`,
`clickTestId`, `pollUntil`, etc. Sem este segundo patch, o spec 22 (Google OAuth)
ainda quebrava no `expectVisibleByTestId(page, "social-login-google")` aos 10s.

## Validação local

Ambiente: Vite preview (`vite build && vite preview --host 127.0.0.1 --port 8080`),
storageState vazio, sem credenciais E2E_USER_*.

| Estado | Resultado |
|---|---|
| Sem patches, `expect.timeout=15s` | ❌ Teste 90 falha aos 15s |
| Com `expect.timeout=60s` | ✅ Teste 90 passa em 21s (de novo confirmando o gap) |
| Com patches completos (45s/30s/45s + 30s helpers) | ✅ Smoke gate passa pelos testes 90/91/92/95 |

## Cenários simulados antes do commit

| # | Cenário | Risco | Mitigação |
|---|---|---|---|
| 1 | Local dev começa a falhar | **0** — fix gated por `process.env.CI` | — |
| 2 | TypeScript reclama do ternary | **0** — pattern já existe (`workers: process.env.CI ? 1 : undefined`) | — |
| 3 | Build/lint quebra | **0** — alteração puramente runtime | — |
| 4 | Outros CIs sem `CI=true` herdam comportamento local | OK — GitHub Actions, Vercel, Netlify todos setam `CI=true` automaticamente | Fallback original |
| 5 | Test 23/24 (rocket-animation, visual-regression) podem ter outros timeouts hardcoded (5s) | Médio — só descobre rodando | Próximo PR se falhar |
| 6 | Fix mascara degradação real do app | **Sim, mas controlado** — teto de 45s ainda detecta degradação extrema | Follow-up: investigar 10.8s hidratação |
| 7 | CI ainda falha em test 90 (>45s) | Baixo — local mostra 21s; CI tem 2x folga | Subir mais ou investigar |
| 8 | Quebra outros workflows (Quote Builder, Visual Baseline) | **0** — mesma config; só amplia janela em CI | — |

## Trade-offs aceitos

1. **Mascarar latência real**: o app demora 10.8s para hidratar no CI. O fix
   eleva o teto, mas não resolve a causa. Recomendação: criar issue de
   **performance budget** investigando code-split de `MainLayout` e
   `GlobalSearchPalette` (estaticamente arrastados pelo main bundle).

2. **CI mais lento em caso de teste lento legítimo**: até 45s por teste
   (vs 15s antes). Compensação: smoke gate só roda ~5-6 testes públicos
   + setup; impacto total <1min adicional no pior caso.

## Próximos passos

### Imediatos
- [ ] **Validar próximo push no main** — verificar se o run E2E passa o smoke gate
- [ ] Se falhar, **identificar próximo teste com timeout hardcoded** e iterar

### Acompanhamento (não-bloqueante)
- [ ] **Issue de performance**: dynamic-import de `MainLayout` em `AppRoutes.tsx`
      reduziria o main chunk significativamente. `GlobalSearchPalette` (e árvore
      de produtos/voz/busca) está sendo arrastada estaticamente — investigar.
- [ ] **Adicionar `setup` warmup** opcional em `globalSetup` que faz um
      `page.goto('/login')` para "aquecer" o navegador, reduzindo o gap de
      cold-start no primeiro test real.
- [ ] **T22** (branch protection) — ativar após `main` ficar verde por 24h.

## Relação com a memória do projeto

Esta era exatamente a tarefa **T14 do plano redeploy 2026-05** registrada em
`REDEPLOY-FASE1-EXECUTION-LOG.md`, marcada como pendente desde **2026-05-12**
(quando o agente Claude da época não tinha acesso a `.github/workflows/e2e.yml`
via tools disponíveis).

O bug **não era** o que `REDEPLOY-T13-E2E-TRIAGE.md` hipotetizava (regressão de
`supabase/setup-cli` v1→v2 do PR #144). Aquilo já estava corrigido. Era uma
**degradação de performance acumulada** que ultrapassou o teto de timeout
configurado quando o bundle ainda era menor.

## Commits

| SHA | Arquivo | Descrição |
|---|---|---|
| `8c3bb0b` | `playwright.config.ts` | expect.timeout / actionTimeout / navigationTimeout × CI |
| `b340ec38` | `e2e/helpers/waits.ts` | DEFAULT_TIMEOUT × CI |
| (este) | `docs/redeploy/REDEPLOY-T14-E2E-FIX.md` | Execution log durável |

## Como confirmar que funcionou

1. Verificar próximo run E2E em https://github.com/adm01-debug/promo-gifts-v4/actions/workflows/e2e.yml
2. Job `e2e` deve completar com `conclusion: success`
3. Step 12 (`Run E2E smoke`) e step 15 (`Fail-fast se smoke falhou`) devem ser ✅
4. Smoke summary deve mostrar testes 90/91/92/93/95 passando, autenticados skipped

Se falhar de novo:
- Olhar QUAL teste falhou (provavelmente 23/24 com timeout 5s hardcoded)
- Aplicar mesmo padrão (`process.env.CI ? X : Y`) ao timeout específico
- Não regredir o fix global — manter os patches aqui aplicados
