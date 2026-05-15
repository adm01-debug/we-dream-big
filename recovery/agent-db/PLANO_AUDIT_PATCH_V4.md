# 🛠️ Audit & Patch Cirúrgico — Plano v4.0 (atualizado)

> **Versão:** 4.1 (2026-05-11 17:00) — incorpora Decisão 003
> **Estratégia:** Audit de gaps + Patches cirúrgicos
> **Escopo:** RESGATAR 100% do Lovable (P1 + P2 + P3 sem exceção)
> **Banco DESTINO:** Supabase `doufsxqlfjyuvxuezpln` (PROD ATIVO)
> **Mantra:** menos é mais. Cada mudança pequena, justificada, reversível.

---

## 🗺️ Fases

### ✅ FASE A — Auditoria de Gaps (CONCLUÍDA)
- Diff tabelas, functions, policies, indexes
- Relatório: [`RELATORIO_GAPS.md`](./RELATORIO_GAPS.md)

### ✅ FASE B — Investigação de Uso (CONCLUÍDA)
- Grep RPCs/tables no código React
- Validação SQL individual + busca por renames
- Resultado: 30 RPCs + 54 tables críticas confirmadas como gaps reais
- Relatório: [`../audit/GAP_CLASSIFICATION.md`](../audit/GAP_CLASSIFICATION.md)

### ✅ FASE C — Decisão por Subsistema (CONCLUÍDA)
- Sponsor classificou: **RESGATAR TUDO**
- Decisões: [`DECISIONS.md`](./DECISIONS.md)

### 🔄 FASE D — Patches Cirúrgicos (EM PREPARAÇÃO)

#### D.0 — Preparação
- [ ] Sponsor reenvia `block01, 03, 04, 12` (~988 KB)
- [ ] Extrair definições EXATAS do dump
- [ ] Backup snapshot pré-patches
- [ ] Mapear dependências entre objetos

#### D.1 — P1 CRÍTICOS (impacto user-facing direto)
| Patch | Objetos | Origem |
|---|---|---|
| D.1.1 | Storage policies (34 policies) | `block09b_storage_policies_full.sql` ✅ |
| D.1.2 | Optimization Queue (1 table + 5 RPCs) | block01 + block03 + block04 |
| D.1.3 | Collection Items v2 (2 tables) | block01 + block03 |
| D.1.4 | Kit Collaboration (4 tables) | block01 + block03 |
| D.1.5 | Dashboard widgets RPCs (6 functions) | block04 |
| D.1.6 | Smoke test P1 | — |

#### D.2 — P2 IMPORTANTES (operacionais/compliance)
| Patch | Objetos |
|---|---|
| D.2.1 | Security/Audit logs (5 tables + 4 RPCs) |
| D.2.2 | Outbound Webhooks (2 tables) |
| D.2.3 | MCP Keys system (2 tables + 1 RPC) |
| D.2.4 | Connections config (4 RPCs) |
| D.2.5 | Telemetry/Monitoring (5 RPCs) |
| D.2.6 | Smoke test P2 |

#### D.3 — P3 RESGATE COMPLETO (Decisão 003)
| Patch | Objetos |
|---|---|
| D.3.1 | Magic Up (3 tables) |
| D.3.2 | Expert chat (2 tables) |
| D.3.3 | Voice commands (1 table) |
| D.3.4 | Role migration (1 RPC + 2 tables) |
| D.3.5 | Demais subsistemas não-críticos |
| D.3.6 | Smoke test P3 |

#### D.4 — Completude (não-críticas, decisão 003)
| Patch | Objetos |
|---|---|
| D.4.1 | 107 RPCs não chamadas pelo app (mas existem no dump) |
| D.4.2 | 41 tables não usadas pelo app |
| D.4.3 | Triggers + sequences faltantes |
| D.4.4 | Cron jobs do dump |

#### D.5 — Validação Final
- [ ] Smoke test full app
- [ ] CI tests
- [ ] Validar advisors (RLS, índices)
- [ ] Verificar GlitchTip: ZERO erros novos
- [ ] Aprovação sponsor pra deploy frontend

### 🟦 FASE E — Documentação e Fechamento

---

## 🛡️ Princípios não-negociáveis

1. **Backup ANTES de cada D.X**
2. **1 patch = 1 transação atômica** (`BEGIN; ... COMMIT;`)
3. **Rollback documentado** ANTES de aplicar
4. **Smoke test obrigatório** após cada patch
5. **Idempotente** (`CREATE IF NOT EXISTS` em tudo)
6. **NUNCA** mais de 1 patch por vez
7. **Validação por advisor** após cada patch (RLS, performance)

---

## 📅 Próxima ação

⏳ **AGUARDANDO sponsor reenviar 4 arquivos:**
- `block01_tables_indexes_rls.sql` (~200 KB)
- `block03_policies.sql` (~91 KB)
- `block04_functions.sql` (~203 KB)
- `block12_edge_functions_batch*.md` (~494 KB)

Com esses 4, Fase D.0 destrava e podemos iniciar D.1.1 (storage policies) em paralelo (já temos).

---

📅 **Última atualização:** 2026-05-11 17:00 UTC
👤 **Autor:** Claude (Gerente, claude.ai web)
