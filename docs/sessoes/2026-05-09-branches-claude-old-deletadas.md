# Limpeza: Branches `claude/*` > 30 dias deletadas em 2026-05-09

**Operação:** Deleção de 5 branches `claude/*` antigas (>30 dias sem atividade) — trabalho de sessões Claude abandonado, anterior à saída do Lovable Cloud.

**Decisão:** Aprovada por @adm01-debug em chat ("Caminho A — deletar branches `claude/*` > 30 dias sem atividade").

**Critérios aplicados:**
- ✅ Idade do último commit > 30 dias (ie. anterior a 2026-04-09)
- ✅ Nenhuma com PR aberto
- ✅ Conteúdo obsoleto: o repo mudou drasticamente desde (Onda 1 da Faxina, remoção do Lovable Cloud, 18k commits do Lovable bot já catalogados como histórico)

**Reversibilidade:**
GitHub mantém commits acessíveis por ~90 dias após delete da ref. Pra recuperar:
```bash
git push origin <sha>:refs/heads/<branch-name>
```

---

## Lista detalhada (cada branch com SHA + commits únicos vs main + 5 títulos topo)

### `claude/configure-repo-settings-zD6gt`

- **SHA recuperação:** `32f9f3404699d694180f163703b715a3d0fffa01`
- **Último commit:** 2026-03-17
- **Commits únicos vs main:** 219
- **Top 5 commits únicos:**

  ```
  32f9f3404 fix: resolve final TypeScript errors - zero errors remaining
  22d535501 fix: resolve TypeScript errors in components and pages
  a36e4f683 fix: resolve TypeScript errors in pages and remaining hooks (in progress)
  ec710ce6d fix: resolve TypeScript errors in types, lib, and hooks files
  e27ead595 fix: add 35 missing Supabase table/view/function definitions to types.ts
  ```
- **Recuperar com:** `git push origin 32f9f3404699d694180f163703b715a3d0fffa01:refs/heads/claude/configure-repo-settings-zD6gt`

### `claude/integrate-react-frontend-uUoDT`

- **SHA recuperação:** `f4fab44e8c5230afd2cc6f81ff87b05feb84ac6e`
- **Último commit:** 2026-03-22
- **Commits únicos vs main:** 7
- **Top 5 commits únicos:**

  ```
  f4fab44e8 Fix catch typing in admin product components
  83153a8cb Complete CORS migration and more catch typing fixes
  67848a423 Continue audit fixes: CORS updates, catch typing, staleTime
  9543fa357 Apply audit fixes: security, performance, TypeScript, architecture
  2f23876c2 Add comprehensive audit report and fix critical issues
  ```
- **Recuperar com:** `git push origin f4fab44e8c5230afd2cc6f81ff87b05feb84ac6e:refs/heads/claude/integrate-react-frontend-uUoDT`

### `claude/continue-work-G4sya`

- **SHA recuperação:** `ff5af76e8fdd3d23f5889dc364048312514e9a30`
- **Último commit:** 2026-03-24
- **Commits únicos vs main:** 20
- **Top 5 commits únicos:**

  ```
  ff5af76e8 chore: add comprehensive backend audit report (2026-03-24)
  ca42cf1d9 Fix type safety, accessibility, and code quality across 80 files
  974878a7e Implement unfinished features: SW background sync + email notifications
  9e3560edd Fix audit issues: promises, contactId bug, staleTime, SEO, aria-labels
  23e67ccb4 Fix query timeouts: add limits, reduce duplicates, guard high offsets
  ```
- **Recuperar com:** `git push origin ff5af76e8fdd3d23f5889dc364048312514e9a30:refs/heads/claude/continue-work-G4sya`

### `claude/improve-ux-navigation-SBrCR`

- **SHA recuperação:** `a3ad3d1150ec1fe44c3b91d77d005c3a25be85dd`
- **Último commit:** 2026-04-03
- **Commits únicos vs main:** 60
- **PR(s):** PR #11 [CLOSED]
- **Top 5 commits únicos:**

  ```
  a3ad3d115 Add JSDoc to kit-builder and personalization lib functions
  dc2dd0997 Type Safety: Fix catch (fallbackErr: any) in external-db/products.ts
  b8b62716b Add 4 test suites: useCustomizationPrice, useKitAutoSave, useKitUndoRedo, useCartTemplates
  aeda57da9 Add JSDoc to 8 more hooks: stock, print areas, categories, quote builder
  f5d64451f Add JSDoc to 9 more hooks: cart templates, catalog, kit persistence, pricing
  ```
- **Recuperar com:** `git push origin a3ad3d1150ec1fe44c3b91d77d005c3a25be85dd:refs/heads/claude/improve-ux-navigation-SBrCR`

### `claude/remove-financial-dashboard-4vD3p`

- **SHA recuperação:** `d6e17259f3b31fcffde21b5d5c2fb028b8b4e62a`
- **Último commit:** 2026-04-04
- **Commits únicos vs main:** 5
- **Top 5 commits únicos:**

  ```
  d6e17259f Adicionar Docker Compose do GlitchTip para deploy na VPS
  019b181a5 Remover Google Analytics e Mixpanel do projeto
  2704b6fb8 Remover últimas referências residuais de pagamento/gateway
  d1ac3da8e Remover referências à integração de gateway de pagamento (Stripe/MercadoPago)
  c24c5d5cc Remover referências ao Dashboard Financeiro da documentação
  ```
- **Recuperar com:** `git push origin d6e17259f3b31fcffde21b5d5c2fb028b8b4e62a:refs/heads/claude/remove-financial-dashboard-4vD3p`

---

**Executor:** Claude Code (DevOps)
**Data:** 2026-05-09
**Total deletadas:** 5 branches

## Branches `claude/*` que FICAM (mais recentes, < 30 dias)

42 branches `claude/*` permanecem, todas com atividade nos últimos 30 dias. Continuam disponíveis pra retomada de trabalho ou referência.

A branch `claude/lovable-sync-config-docs` foi recuperada hoje (2026-05-09) após delete acidental durante operação de limpeza Lovable — mantida no remoto.
