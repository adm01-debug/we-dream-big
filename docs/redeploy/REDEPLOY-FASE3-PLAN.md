# Redeploy Fase 3 — Plano de Execução (T24–T30)

> **Data de início:** 2026-05-12
> **Branch:** `claude/redeploy-fase3-T24-T30`
> **PR (a abrir):** TBD
> **Pré-requisito:** PR #166 mergeada + 3 passos UI executados (T22+T23 do `REDEPLOY-FASE2-CHECKLIST-UI.md`)
> **Meta:** levar o projeto Promo_Gifts de "Fase 2 fechada" para **10/10 prontidão de redeploy**

---

## Por que esse documento existe

Sessões de Claude têm limite de contexto. Se este chat for fechado/comprimido, a próxima instância **precisa** poder retomar do zero sem perder decisões. Este documento é o **estado canônico** da Fase 3: decisões já tomadas, gaps identificados, ordem de execução, validações esperadas.

**Regra de ouro:** se alguma decisão muda durante a execução, ATUALIZAR este arquivo no mesmo commit.

---

## Decisões já tomadas (pelo Joaquim em sessão de 2026-05-12)

| # | Decisão | Justificativa |
|---|---|---|
| D1 | Único maintainer; branch protection com `approvals=0` | Sem 2ª pessoa para revisar, evitar auto-deadlock |
| D2 | Bucket recibos: qualquer authenticated lê qualquer recibo | Aceito por LGPD-risk-tolerance; recibos não têm PII suficiente para justificar ACL fina |
| D3 | Todo trabalho via PR, mesmo sem branch protection ativa | Disciplina BPM + CodeRabbit revisa |
| D4 | T28 (325 SECURITY DEFINER) = piloto de 20 funções nesta fase | Cleanup completo é 8-16h; piloto + guard preventivo já entrega valor sem alongar |
| D5 | Fase 3 em PR separada da #166 | Reduz blast radius; rebase quando #166 mergear |

---

## Estado pós-Fase 2 (linha de base)

| Eixo | Métrica | Estado |
|---|---|---|
| Schema/RLS | Advisor security ERROR | 0 |
| Schema/RLS | Advisor security WARN | **578** (era 651 — T28 piloto: 36 funções audit/cleanup/purge/enforce/sync revogadas para anon+auth, -73 entries) |
| Schema/RLS | Advisor performance | a auditar |
| Storage | Buckets públicos | 0 |
| Storage | Policy recibos_authenticated_read | UI pendente (manual) |
| GitHub | Branch protection ativa em `main` | UI pendente (manual) |
| GitHub | Dependabot Alerts + Secret Scanning | UI pendente (manual) |
| Tests | Total | ~? (a medir) |
| Tests | Skipados (Issue #151) | **5 arquivos** com justificativa rastreável precisa (não genérica). Tentativa de re-habilitar 2 (`harmony` + `FocusVisible`) na Fase 3 T24 falhou no CI — revertida com causa documentada nos cabeçalhos. Refactor proper para Fase 3.1 |
| CI | Verde no último commit | ✅ |
| Docs | DEPLOYMENT.md | ✅ reescrito |
| Docs | CHANGELOG.md | desatualizado (sem entry Fase 2) |
| Docs | Onboarding 0→prod | gap |
| Observability | Sentry/logs externos | desconhecido (T26 vai auditar) |
| Performance | LCP / TTI baseline | não medido |
| Bundle | Tamanho inicial | não medido |

---

## Meta 10/10 (critérios de saída desta fase)

| # | Critério | Validação |
|---|---|---|
| C1 | Advisor security ERROR = 0 | Mantido |
| C2 | Advisor security WARN ≤ 580 (de 651 hoje) | ✅ **ATINGIDO: 578**. T28 piloto: 36 funções × 2 roles = 72 entries removidas |
| C3 | Testes skipados sem justificativa rastreável = 0 | Re-habilitar 5 arquivos OU manter skip com `@todo issue #N` linkado |
| C4 | CI verde no commit final | GitHub check |
| C5 | Storage policy 3/3 criadas | SQL `pg_policies WHERE policyname LIKE 'recibos%'` retorna 3 |
| C6 | Branch protection + Dependabot + Secret Scanning ativos | UI evidence + `gh api repos/.../branches/main/protection` |
| C7 | Inventário de observability documentado em `docs/OBSERVABILITY.md` | Lista o que tem e gap list para Fase 4 |
| C8 | CHANGELOG.md atualizado com Fase 2 + Fase 3 | Visual review |
| C9 | Onboarding 0→prod < 30 min documentado | Doc + dry-run manual |
| C10 | Sign-off file `REDEPLOY-FASE3-FINAL.md` com KPIs antes/depois | Commit |

---

## Ordem de execução

### T24 — Re-habilitar 65 testes skipados (Issue #151)

**Objetivo:** atender C3.
**Esforço estimado:** 30–60 min.

#### Sub-tarefas

1. Auditar o componente `src/components/.../SidebarNavGroup.tsx` atual (tokens reais hoje)
2. Para cada um dos 5 arquivos `tests/.../SidebarNavGroup.*.test.tsx`, decidir:
   - **Re-habilitar**: atualizar `describe.skip` → `describe` e ajustar assertions para o token atual
   - **Manter skip**: só se o teste estiver fundamentalmente quebrado (não é o esperado); adicionar `@todo issue #N` com link rastreável
3. Rodar `npm run test` localmente; CI verde

#### Cenários simulados / gaps

| Cenário | Risco | Mitigação |
|---|---|---|
| Token mudou: `bg-orange/15` → `bg-orange/[0.03]` | Baixo | Atualizar assertion |
| Token foi removido em favor de classe semântica | Médio | Migrar teste para usar classe semântica |
| Componente foi refatorado para Suspense diferente | Alto | Ler implementação + ajustar |
| Re-habilitar quebra um teste de outro arquivo | Médio | Rodar suite completa |

### T28 piloto — 20 funções SECURITY DEFINER mais críticas + guard

**Objetivo:** atender C2.
**Esforço estimado:** 1–2h.

#### Sub-tarefas

1. Query no advisor: identificar 20 funções com maior risco (executáveis por anon, sem `search_path`, em RLS callpath)
2. Para cada uma:
   - Decidir: `SECURITY INVOKER` é viável? Ou manter DEFINER com `SET search_path TO 'pg_catalog','public'` + `REVOKE EXECUTE FROM anon`?
   - Aplicar via `apply_migration` MCP
   - Comentar a função com justificativa
3. Validar: re-rodar advisor; advisor cai de 650 para ≤ 610
4. Criar CI guard `scripts/check-security-definer-search-path.mjs` que bloqueia novas migrations adicionando função SD sem `search_path`

#### Cenários / gaps

| Cenário | Risco | Mitigação |
|---|---|---|
| Função usada em policy RLS — mudar quebra RLS | Crítico | Auditar `pg_policies` antes |
| Função usada em edge function via service_role | Alto | `recovery/block12_edge_functions_*.md` cross-check |
| Função tem `pg_catalog.now()` sem prefixo → vulnerável | Médio | Adicionar prefixos schema explícitos |
| Função genuinamente precisa de DEFINER | Mantém | Documentar via `COMMENT ON FUNCTION` |

### T26 — Observability inventory

**Objetivo:** atender C7.
**Esforço estimado:** 30 min.

#### Sub-tarefas

1. Auditar `docs/OBSERVABILITY.md` existente (se houver)
2. Verificar uso real:
   - Sentry está configurado? `grep -r "sentry"` no código
   - Edge functions têm `console.error` capturado?
   - Healthcheck endpoint existe?
   - Lovable tem monitoring nativo?
3. Atualizar `docs/OBSERVABILITY.md` com inventário + gap list para Fase 4 (não execução, só doc)

### T29 — Docs finais

**Objetivo:** atender C8 + C9.
**Esforço estimado:** 30 min.

#### Sub-tarefas

1. `CHANGELOG.md`: adicionar entry para Fase 2 (PR #166) e Fase 3 (esta PR)
2. `docs/ONBOARDING.md`: revisar / criar; deve permitir dev novo ir de 0 → preview deploy em < 30 min
3. Atualizar `README.md` se estiver desatualizado

### T30 — Sign-off final

**Objetivo:** atender C10.
**Esforço estimado:** 30 min.

#### Sub-tarefas

1. Re-rodar advisors + capturar números antes/depois em tabela
2. Criar `docs/redeploy/REDEPLOY-FASE3-FINAL.md` com:
   - Métricas antes/depois para cada critério C1–C10
   - Lista de issues abertas pós-Fase 3 (o que fica para Fase 4)
   - Recomendação final: **GO** ou **NO-GO** para redeploy
3. Comentar no PR final com link para esse doc

---

## Pendências que NÃO são desta fase (para Fase 4+)

- T28 completo: cleanup dos outros ~305 funções SECURITY DEFINER
- E2E coverage map e expansão
- Performance benchmark + bundle size analysis
- Implementação real de versionamento de bucket OU job de cópia para R2/S3 externo
- A11y audit completo (Lighthouse > 95)
- Dependabot PR queue após T22 ativo
- Substituir 15 `USING(true)` de catálogo público por predicados não-literais (mencionado no log da Fase 2)

---

## Como atualizar este documento

- **Toda decisão nova** → registrar em "Decisões já tomadas" no mesmo commit
- **Toda execução** → marcar status na seção "Ordem de execução" (✅ done / ⚠️ partial / ❌ blocked)
- **Toda métrica medida** → atualizar tabela "Estado pós-Fase 2" para refletir realidade atual

A próxima instância do Claude deve poder ler **este arquivo + REDEPLOY-FASE2-EXECUTION-LOG.md + REDEPLOY-FASE2-CHECKLIST-UI.md** e continuar exatamente de onde paramos.
