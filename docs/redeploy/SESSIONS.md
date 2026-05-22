# Sessões do Redeploy — promo-gifts-v4

> Dashboard executivo das sessões do redeploy hardening. Cada entrada lista a data, foco, commits e estado entregue. Permite que sponsor (ou um agente novo) se localize em 30 segundos sem reler histórico de chat.

**Repo**: `adm01-debug/promo-gifts-v4`
**Sponsor**: Joaquim (`adm01@promobrindes.com.br`)
**Atualizado em**: 2026-05-22

---

## 📊 Dashboard executivo

| Data | Sessão | Commits | Estado | Checklist |
|------|--------|---------|--------|-----------|
| 2026-05-22 | **T-FIX-5** — Lint guard-rail contra `forEach()` em tests | 5 | 🟡 code complete + 3 passos manuais | `T-FIX-5-CHECKLIST.md` |
| 2026-05-22 | **T-FIX-4** — Refactor `forEach()` → `it.each` em 5 arquivos | 5 | ✅ fechado | — |
| 2026-05-22 | **Bugs #1 e #2** do plano "10/10" (migrations sync + parseContract generics) | 2 (squash) | ✅ mergeados | — |
| 2026-05-22 | **Redeploy de schemas** — Fases 2+3+3.5+4+1.1 (Lovable Cloud sync) | 10 | ✅ fechado | — |
| 2026-05-22 | **Manual reutilizável** Lovable → Supabase Oficial | 4 (~95 KB) | ✅ publicado | — |
| < 2026-05-22 | _Sessões anteriores — preencher conforme histórico_ | — | — | — |

**Legenda**: ✅ fechado · 🟡 entregue com pendências manuais · 🔴 bloqueado · 🗓️ planejado

---

## 🗂️ Sessões detalhadas (mais recente primeiro)

### 2026-05-22 — T-FIX-5: Lint guard-rail contra `forEach()` em testes

**Foco**: codificar em automação o aprendizado do T-FIX-4 — adicionar regra ESLint que detecte e bloqueie o anti-padrão `forEach() ... it()` em PR check.

**Origem**: bug "Rose Quartz visível, 3 idênticos escondidos" no CI run [26303752735](https://github.com/adm01-debug/promo-gifts-v4/actions/runs/26303752735).

**Commits**:

| SHA | Path | Funcionalidade |
|-----|------|----------------|
| `c129d54` | `docs/redeploy/T-FIX-5-LINT-GUARDRAIL.md` | Documentação do guard-rail (8.2 KB) |
| `57d9f8f` | `eslint.config.t-fix-5.proposed.js` | Config nova pronta para apply (14.4 KB) |
| `c033e71` | `scripts/check-eslint-config-current.mjs` | Script anti-órfão (4.1 KB) |
| `bdaae3d` | `scripts/__tests__/check-eslint-config-current.test.ts` | Suite vitest, 22 testes (8.6 KB) |
| `307ab7e` | `docs/redeploy/T-FIX-5-CHECKLIST.md` | Checklist BPM de ativação (6.1 KB) |

**Estado entregue**:
- Regra ESLint pronta no arquivo `.proposed.js` (não no `eslint.config.js` real — MCP sem acesso ao blob SHA)
- 3 passos manuais pendentes (ver `docs/redeploy/T-FIX-5-CHECKLIST.md`)
- Defesa em profundidade: regra ESLint + script anti-órfão + 22 testes do script + checklist BPM

**Próximas ações** (Joaquim):
1. `mv eslint.config.t-fix-5.proposed.js eslint.config.js` + commit
2. `npm pkg set scripts.check:proposed-configs="..."` + integrar no quality gate
3. Validar suite vitest (`scripts/__tests__/**`)

---

### 2026-05-22 — T-FIX-4: Refactor `forEach()` → `it.each` em 5 arquivos

**Foco**: eliminar o anti-padrão `forEach()` paramétrico em testes que mascarava falhas idênticas no CI.

**Origem**: bug do "Rose Quartz visível" — `forEach(... expect(...))` dentro de um único `it()` abortou na primeira falha (Rose Quartz primary contrast 2.90:1) e escondeu 3 bugs idênticos em gx-hackerman (2.38), gx-frutti-di-mare (2.13) e gx-razer (1.87).

**Commits**:

| SHA | Arquivo refatorado | Padrão eliminado |
|-----|---------------------|-------------------|
| `b9a51be` | `theme-presets.test.ts` | B — masking real (5 → 238 tests) |
| `5b2a7ca` | `auth-utils.test.ts` | B — masking FLOW_GREETINGS (17 → 21 tests) |
| `21bb9b8` | `AdminStandardRules.test.tsx` | A — idiomática (`describe.each`) |
| `6dc8604` | `PriceFreshnessBadge.snapshots.test.tsx` | A — matriz (variants × statuses, tuple + `%s`) |
| `a2c3fa2` | `SidebarMobileRegression.test.ts` | A — idiomática (1669 tests) |

**Estado entregue**:
- 2.014 testes granulares pós-refator nos 5 arquivos (vs ~57 antes)
- Zero erros TypeScript, zero regressões funcionais
- Validação dupla simulada: reintrodução de bugs em Rose Quartz + Hackerman → ambos aparecem na mesma execução (zero masking)

**Falsos positivos descartados** (com justificativa para auditoria):
- `AuthBranding.visual.test.tsx:62`, `QuoteBuilderStepper.test.tsx:44/68`, `SidebarNavGroup.shortcut-carrinhos.test.tsx:51` — custo-benefício ou tipo de loop diferente

---

### 2026-05-22 — Bugs #1 e #2 do plano "10/10"

**Foco**: dois bugs do plano de hardening "10/10" mergeados em paralelo via squash PR.

**Commits**:

| Bug | PR | SHA squash | Conteúdo |
|-----|----|----|----------|
| #1 — Migrations sync guard | [#111](https://github.com/adm01-debug/promo-gifts-v4/pull/111) | `5f3ec9d` | CI allowlist + verificação |
| #2 — `parseContract` generics refactor | [#115](https://github.com/adm01-debug/promo-gifts-v4/pull/115) | `0c650ca` | Inferir `V` de `keyof S & string` em `parse.ts` (+9/-6 linhas) |

**Lição registrada na memória do projeto**:
> Outra instância Claude paralela abriu PR #115 com diff byte-identical 5min antes do meu PR #116; #115 mergeou, #116 fechado como duplicate. **Lição**: ANTES de criar branch+PR, sempre listar PRs abertos (`github_list_pull_requests state=open`) para detectar trabalho paralelo de outras instâncias Claude no mesmo repo.

**Bugs pendentes do plano "10/10"**:
- #3 — Test Coverage
- #4 — quality "Run tests"
- #5 — ESLint baseline gate (3 warnings em `AdminStandardRules.test.tsx` por T-FIX-4 PascalCase params)

---

### 2026-05-22 — Redeploy de schemas: Fases 2+3+3.5+4+1.1

**Foco**: alinhar schemas entre Supabase Oficial (SSOT `doufsxqlfjyuvxuezpln`) e Lovable Cloud interno (`pqpdolkaeqlyzpdpbizo`), criar Gate CI cron diário, dropar tabelas legacy.

**Estado entregue**:
- 8 tabelas com drift alinhadas
- 15-entry allowlist criada
- 3 legacy dropadas no Lovable
- Gate CI cron diário 02:00 UTC operacional (`pg_cron jobid 25`, `has_drift=false`)
- 10 arquivos commitados em `supabase/migrations/` + `docs/redeploy/`
- RPC `get_public_schema_signatures()` em ambos os bancos
- Tabela `schema_drift_log` audita execuções
- anon key do Lovable interno descoberta via `lovable_get_integrations`

**Bloqueio remanescente**:
> PR no app para desacoplar do Lovable Cloud — `client.ts` é override de build via `is_managed_by_lovable`. Lovable Cloud injeta config própria no build, ignorando `client.ts` do repo. Isso é tarefa de app, não de schema.

---

### 2026-05-22 — Manual reutilizável Lovable → Supabase Oficial

**Foco**: documentar o processo de migração para que possa ser aplicado em outros projetos Lovable.

**Commits**: 4 arquivos publicados em `docs/redeploy/`:
1. README
2. Parte 1
3. Parte 2
4. Apêndice D — migração de dados (chunks + ON CONFLICT + checkpoint + validação)

**Tamanho total**: ~95 KB.

**Como usar em outros projetos**: passar os 3 URLs ao Claude novo + IDs do Lovable/Oficial/repo.

---

### Sessões anteriores a 2026-05-22

> Joaquim — preencher conforme arquivo as primeiras sessões do redeploy (criação do V4, decisão Bank-as-source-of-truth, etc). Sugestão: 1 entrada por dia ou por marco. Use o template no final deste arquivo.

---

## 📋 Backlog ativo (sessões futuras priorizadas)

| Prioridade | Item | Origem | Cutoff |
|------------|------|--------|--------|
| 🟡 Média | **T-FIX-3** — bump GitHub Actions (`checkout@v4→v5`, `setup-node@v4→v6`, `upload-artifact@v4→v5`) | Backlog herdado | **2026-06-02** (11 dias) |
| 🟡 Média | **Plano "10/10" #3, #4, #5** — coverage, quality runner, ESLint baseline | Bugs anteriores | Sem cutoff |
| 🟢 Baixa | **T-FIX-5b** — anti-padrão B (`expect` em `forEach` em `it`) | T-FIX-4 audit | Sem cutoff |
| 🟢 Baixa | `QuoteBuilderStepper.test.tsx:68` forEach vazio | T-FIX-4 audit | Sem cutoff |
| 🟢 Baixa | `ScenarioSimulation.test.ts` 1 fail Scenario 2 CIF/FOB | Sessão anterior | Sem cutoff |
| 🟢 Baixa | Flakiness teardown async Helmet/Event listener | Sessão anterior | Sem cutoff |

---

## 📐 Template para nova sessão

Ao iniciar uma sessão nova, copie este bloco no topo de "Sessões detalhadas" e preencha:

```markdown
### YYYY-MM-DD — [Identificador-da-tarefa]: [Foco em uma frase]

**Foco**: [o que essa sessão se propõe a entregar].

**Origem**: [link para issue, PR, CI run, ou descrição do gatilho].

**Commits**:

| SHA | Path | Funcionalidade |
|-----|------|----------------|
| `xxxxxxx` | `path/to/file` | Descrição |

**Estado entregue**:
- Item 1
- Item 2

**Próximas ações** (responsável):
1. Ação 1
2. Ação 2

**Lições aprendidas** (opcional, mas valioso para próximas instâncias):
- Lição 1
```

E também adicione a linha correspondente no **Dashboard executivo** no topo do arquivo.

---

## 🔄 Política de manutenção

- **Quem atualiza**: o agente (ou Joaquim) que fechou a sessão deve adicionar a entrada antes do último commit
- **Quando arquivar**: sessões com mais de 90 dias podem ser movidas para `docs/redeploy/archive/SESSIONS-YYYY-Q[1-4].md` (split por trimestre)
- **Quando deletar checklists individuais**: após todos os ✅ marcados, o checklist específico (ex: `T-FIX-5-CHECKLIST.md`) pode ser removido — o histórico fica neste `SESSIONS.md` permanentemente
