# Redeploy T7 — Triagem de PRs Dependabot

**Data**: 2026-05-12  
**Autor**: Tarefa 7 do plano de redeploy Promo_Gifts  
**Status**: ✅ Concluída — 4 mergeadas, 3 fechadas com follow-up

---

## TL;DR

7 PRs Dependabot estavam abertas há semanas. Triagei cada uma por risco real (não por minor/major):

| PR | Pacote | Tipo | Risco | Resultado |
|---|---|---|---|---|
| #138 | prettier-plugin-tailwindcss 0.7.4→0.8.0 | MINOR (dev) | 🟢 Mínimo | ✅ Mergeada |
| #139 | lint-staged 16.4.0→17.0.4 | MAJOR (dev) | 🟢 Baixo | ✅ Mergeada |
| #145 | actions/checkout 4→6 | MAJOR (CI action) | 🟢 Baixo | ✅ Mergeada |
| #144 | supabase/setup-cli 1→2 | MAJOR (CI action) | 🟡 Médio | ✅ Mergeada |
| #140 | react-day-picker 8.10.2→10.0.0 | MAJOR (runtime) | 🔴 Alto | ❌ Fechada → Issue #155 |
| #141 | recharts 2.15.4→3.8.1 | MAJOR (runtime) | 🔴 Alto | ❌ Fechada → Issue #155 |
| #142 | zustand 4.5.7→5.0.13 | MAJOR (runtime) | 🔴 Alto | ❌ Fechada → Issue #155 |

---

## Critérios usados na triagem

### 🟢 Mergear (risk < impacto positivo)

- **Devtools**: lint-staged, prettier-plugin-tailwindcss — afetam só workflow do dev local, zero impacto em runtime
- **CI actions**: actions/checkout, supabase/setup-cli — rodam só no GitHub Actions, sem efeito no bundle
- Mesmo majors aqui são seguros porque o "blast radius" é o pipeline, não a aplicação

### 🔴 Fechar e abrir issue de tracking

Quando o CI revelava **erros TS reais** no projeto (não falsos-positivos por timeout):

- **recharts 3.x** → 17 erros TS em 6 arquivos (`ui/chart.tsx` base + 5 callsites)
- **react-day-picker 10.x** → 9 erros TS em 5 arquivos (`ui/calendar.tsx` base + 4 callsites)
- **zustand 5.x** → API de selectors mudou, exige auditoria manual

Esses são upgrades que **NÃO podem ser feitos pelo dependabot** — exigem refactor humano. Cada um vai virar uma PR dedicada futuramente.

---

## Achados durante a triagem

### Falsos-positivos identificados

**PR #144 (supabase/setup-cli)** tinha "Edge Functions Deno typecheck FAIL". Investiguei o log e era:
```
error: Import 'https://esm.sh/@supabase/supabase-js@2.95.0' failed: 522 <unknown status code>
```

**Falha transitória do CDN externo `esm.sh`**, não relacionada com o upgrade da CLI. Após `@dependabot rebase`, passou.

**Lição aprendida**: nunca rejeitar PR por "CI vermelho" sem ler o log. Erros 522/503/504 em CDN externo são quase sempre transitórios.

### CI gate "Lint, Typecheck & Test" estava cancelled em TODAS as PRs

Mesmo problema da PR #146-#150: o gate ficava em timeout porque os 34 testes do `SidebarNavGroup` quebravam, e o CI cancelava em 25min. A PR #152 (T2.5) corrigiu isso. Por isso após rebase, as PRs passaram.

---

## Mudanças aplicadas em main

### #145 — actions/checkout v4 → v6
Diff: 2 linhas em workflows YAML
Impacto: nenhum (mesma API, ações do GitHub Actions evoluíram independentemente)

### #144 — supabase/setup-cli v1 → v2
Diff: 2 linhas em workflows YAML (delete-orphan-edges.yml, deploy-edge-functions.yml)
Impacto: nenhum (mesma API CLI Supabase)

### #139 — lint-staged 16.4.0 → 17.0.4
Diff: package.json + lock
Impacto: dev local (Husky hook). Sem efeito em CI ou runtime.

### #138 — prettier-plugin-tailwindcss 0.7.4 → 0.8.0
Diff: package.json + lock
Impacto: dev local (formatação). Sem efeito em CI ou runtime.

---

## Decisões persistidas

| Decisão | Onde está registrada |
|---|---|
| Critério de triagem dependabot | Este doc |
| Major runtime → issue dedicada | Issue #155 |
| Devtools/CI actions → merge direto | Este doc + commits #138, #139, #144, #145 |
| Falsos-positivos de CDN externo | Este doc, seção "Falsos-positivos" |

---

## Recomendações futuras

### Configurar `dependabot.yml` para reduzir ruído

Sugestão para o arquivo `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    groups:
      # Agrupa devtools em PR única
      devtools:
        patterns:
          - "prettier*"
          - "eslint*"
          - "lint-staged"
          - "husky"
          - "@types/*"
    ignore:
      # Major bumps das runtime libs ficam sob controle manual via Issue #155
      - dependency-name: "recharts"
        update-types: ["version-update:semver-major"]
      - dependency-name: "react-day-picker"
        update-types: ["version-update:semver-major"]
      - dependency-name: "zustand"
        update-types: ["version-update:semver-major"]
  
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "monthly"
```

Isso reduziria o ruído de PRs individuais e impediria dependabot de reabrir as 3 PRs runtime majors fechadas.

### Pre-commit hook validando types antes do push

O ESLint baseline já existe. Adicionar `tsc --noEmit` no pre-push (não pre-commit, pra não tornar lento) reduziria muito a quantidade de PRs com TypeScript fail.

---

## Para a próxima Claude / próximo dev

Se você está vendo PR dependabot pendente:

1. **Leia o diff primeiro** — diff trivial (só package.json) = baixo risco
2. **Veja se afeta runtime** — devtools/CI actions = pode mergear, runtime lib = ler changelog
3. **Veja o CI** — `cancelled`/`522` = transitório, peça `@dependabot rebase`. `FAIL` real = ler logs, pode ser breaking change
4. **Major em runtime lib** = NÃO mergeie. Feche com link para uma issue de tracking dedicada

---

## Status do plano de Redeploy pós-T7

| Tarefa | Status |
|---|---|
| T1 (frontend dest) | ✅ Concluída |
| T2 (project_id + favorites) | ✅ Mergeada (#150) |
| T2.5 (CI broken + Vercel) | ✅ Mergeada (#152) |
| T3 (migrations audit) | ✅ Mergeada (#154) |
| **T7 (dependabot triagem)** | ✅ **Concluída** — 4 mergeadas, 3 fechadas com issue #155 |
| T4 (VPS load 26) | ⏳ Pendente |
| T5 (tabelas _backup_) | ⏳ Pendente |
| T6 (edge functions audit) | ⏳ Pendente |
| T8 (secrets) | ⏳ Pendente |
| T9 (validação) | ⏳ Pendente |
| T11 (aplicar migration drop) | ⏳ Pendente (aguarda autorização) |
| T12 (deploy edges doc) | ⏳ Pendente |
| T13 (deploy frontend) | ⏳ Pendente |
| T14 (smoke test) | ⏳ Pendente |
| T15 (POP final) | ⏳ Pendente |

Próxima tarefa: **T4 — auditar load alto na VPS**.
