# Auditoria Independente Pré-Produção — Promo_Gifts

Data: 2026-05-13  
Repositório: `adm01-debug/Promo_Gifts`  
Escopo: código versionado, pipelines GitHub, configuração Supabase no repo, testes locais e sinais de operação

---

## 1) Escopo, método e limitações reais

Esta auditoria foi executada com abordagem investigativa e independente, analisando camadas de frontend, edge functions, scripts de qualidade/segurança, banco (via artefatos SQL e configuração), e CI GitHub.

Limitações objetivas encontradas durante a auditoria:
- **Supabase (banco real)**: sem credenciais desta sessão para consultar dados/objetos live; análise de banco feita por código/migrations/docs/scripts.
- **VPS**: não há acesso shell/telemetria da VPS nesta sessão; avaliação de VPS ficou restrita a evidências no próprio repositório.
- **GitHub security APIs**: Code Scanning e Secret Scanning via MCP retornaram **403 Resource not accessible by integration**.

---

## 2) Missão dividida em 20 tarefas menores

1. Inventariar estrutura e camadas do repositório.  
2. Levantar comandos oficiais de build/lint/test.  
3. Instalar dependências limpas (`npm ci`).  
4. Executar build de produção.  
5. Executar gate de lint baseline.  
6. Executar gate de typecheck baseline.  
7. Executar typecheck completo.  
8. Executar smoke tests operacionais.  
9. Executar suíte cloud status.  
10. Executar suíte price freshness (alta volumetria).  
11. Executar fuzz test disponível no projeto.  
12. Executar gates estáticos de segurança (seller-scope/CORS).  
13. Executar gate de SECURITY DEFINER ACL.  
14. Auditar workflow CI e gates obrigatórios.  
15. Auditar runs recentes no GitHub Actions + logs de falhas.  
16. Auditar helpers compartilhados de edge (`authz`, `cors`, `logger`, `credentials`).  
17. Auditar trilha de secrets e padrões de exposição em arquivos versionados.  
18. Auditar riscos de performance de bundle.  
19. Auditar sinais de maturidade de testes E2E e integração.  
20. Consolidar achados por severidade + plano priorizado de correção.

---

## 3) Evidências de execução (testes e verificações)

### 3.1 Qualidade e build
- `npm ci`: **OK**.
- `npm run build`: **OK** (1m13s), com warnings de chunking e aviso PostCSS.
- `npm run lint:baseline`: **OK** (`1260` erros atuais vs `1280` baseline, drift positivo).
- `npm run lint` (gate tsc baseline): **FALHOU** por regressão TypeScript (`859` vs `811`, +26 pares file:rule novos).
- `npm run typecheck:full`: **FALHOU** com **859 erros em 257 arquivos**.

### 3.2 Testes
- `npm run smoke`: **OK com skips** (health/public route pulados por env ausente).
- `npm run test:cloud-status`: **OK** (15 testes passando).
- `npm run test:price-freshness`: **OK** (**461 testes** passando; coverage gate OK).
- `npm run test:fuzz`: **OK nominal**, porém **simulado** (sem envio real para endpoints).
- `npm run test:e2e:smoke`: **FALHOU** (`Timed out waiting 120000ms from config.webServer`).
- `npm run test` (suite completa Vitest): execução prolongada sem conclusão útil nesta sessão (processo interrompido).
- `npm run test:edge:integration`: **FALHOU** localmente (`supabase test db --file` flag inválida na CLI instalada).

### 3.3 Segurança e banco (estático)
- `npm run check:edge-cors`: **OK**.
- `npm run check:no-inline-cors`: **OK**.
- `npm run check:seller-scope`: **OK**.
- `npm run check:security-definer-acl`: **SKIP** por credenciais Supabase ausentes.
- `node scripts/check-no-db-push.mjs`: **FALHOU** (matches fora allowlist em `CONTRIBUTING.md` e `docs/adr/0006-migration-baseline.md`).
- `npm audit --json`: **5 vulnerabilidades** (3 low, 2 moderate).

---

## 4) Achados críticos e relevantes

## 🔴 Crítico

### C1) Estado de tipagem em nível de produção está quebrado
**Evidência:** `npm run typecheck:full` encontrou **859 erros / 257 arquivos**; `npm run lint` (tsc baseline gate) também falha por regressão.  
**Impacto:** alto risco de regressões funcionais em runtime e baixa confiabilidade para deploys seguros.  
**Prioridade:** imediata.

### C2) CI com quebra estrutural no guard de migrations
**Evidência:** run GitHub Actions `25772200969` falhou no job `Lint, Typecheck & Test` por `check-no-db-push` detectando ocorrências fora allowlist.  
**Impacto:** PRs podem ficar sistematicamente bloqueadas mesmo em mudanças legítimas de documentação.  
**Prioridade:** imediata.

## 🟠 Alto

### A1) Falso senso de robustez em fuzzing
**Evidência:** `scripts/fuzz-testing.mjs` apenas gera 5 payloads e registra logs; não executa chamadas reais (simulado).  
**Impacto:** cobertura de cenários maliciosos/edge cases fica superficial antes de produção.

### A2) E2E smoke quebrado por incompatibilidade de porta/base URL
**Evidência:** `vite.config.ts` usa porta `8080`; Playwright usa `http://localhost:5173` como default; `test:e2e:smoke` expirou no webServer.  
**Impacto:** pipeline de confiança de fluxos críticos perde efetividade local e potencialmente em ambientes mal parametrizados.

### A3) Observabilidade de frontend pode estar comprometida em produção
**Evidência:** `vite.config.ts` define `esbuild.drop = ['console','debugger']` em produção; isso tende a remover também `console.warn/error`, contrariando o comentário do próprio arquivo (“keep warn/error”).  
**Impacto:** perda de sinais diagnósticos em incidentes reais.

## 🟡 Médio

### M1) Segurança central do banco depende de credenciais CI indisponíveis localmente
**Evidência:** gate `check-security-definer-acl` faz skip sem `VITE_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.  
**Impacto:** validação local incompleta; risco de passar regressão até CI final.

### M2) Chaves `apikey` hardcoded em migrations de cron HTTP
**Evidência:** migrations com `net.http_post` contendo JWT de `apikey` em texto SQL.  
**Impacto:** acoplamento operacional (rotação pode quebrar jobs), risco de proliferação de credenciais em histórico.

### M3) Dependências com vulnerabilidades abertas
**Evidência:** `npm audit` reporta 5 vulnerabilidades (inclui Vite/esbuild).  
**Impacto:** superfície de risco moderada, especialmente em ferramentas de build/dev server.

### M4) Bundle grande em módulos críticos
**Evidência:** chunks entre ~400KB e ~680KB (não comprimidos) no build.  
**Impacto:** TTI/piora de experiência em redes móveis e dispositivos fracos.

### M5) APIs de segurança do GitHub sem acesso na integração MCP
**Evidência:** listagem de Code Scanning e Secret Scanning retornou 403.  
**Impacto:** auditoria automática externa incompleta nesta sessão.

## 🔵 Baixo

### L1) Dívida técnica explícita em comentários de manutenção
**Evidência:** ~65 ocorrências de TODO/FIXME/HACK/XXX em `src/`, `tests/`, `scripts/`, `supabase/functions/`.  
**Impacto:** aumenta custo de manutenção e risco de comportamento não finalizado.

### L2) Sem IaC de VPS no repositório
**Evidência:** ausência de `Dockerfile`, `docker-compose`, `nginx*.conf`, `Caddyfile`, `Procfile`.  
**Impacto:** baixa reprodutibilidade de infraestrutura e auditoria operacional limitada.

---

## 5) Análise por camada

### 5.1 Frontend
Pontos fortes:
- Arquitetura modular ampla; organização por rotas/feature.
- Gates específicos de qualidade no CI (route checks, ref-warning suite, etc.).

Gaps:
- Quantidade alta de erros TypeScript ativos.
- Estratégia de logs em produção potencialmente anulada por `drop: ['console']`.
- Chunking com módulos muito pesados em rotas administrativas/BI/export.

### 5.2 Edge Functions / Segurança
Pontos fortes:
- Manifesto de autorização (`edge-authz-manifest`) com gate dedicado.
- Padronização de CORS e structured logging em camada `_shared`.
- Verificações estáticas importantes aprovando (seller scope, CORS).

Gaps:
- Parte dos controles depende de credenciais externas para validação completa.
- Existem várias funções com `verify_jwt=false` por desenho; exige disciplina contínua de controles custom.

### 5.3 Banco (Supabase)
Pontos fortes:
- Projeto já reconhece formalmente que o banco é SSOT e bloqueia `db push`.
- Forte presença de RLS/policies e hardening documentado.

Gaps:
- Divergência histórica migrations vs banco real continua risco operacional.
- Uso de apikey hardcoded em SQL de jobs cron.
- Sem acesso live nesta sessão para confirmar estado real de `schema_migrations`, grants e jobs.

### 5.4 GitHub / CI
Pontos fortes:
- Pipeline rico, com múltiplos gates de segurança/qualidade.
- Cobertura de checks avançados além de lint/test convencionais.

Gaps:
- Falha concreta recente no guard de `db push` por inconsistência de allowlist.
- Dependência de permissões para varreduras de segurança (Code Scanning/Secret Scanning MCP bloqueados por 403).

### 5.5 VPS/Operação
Pontos fortes:
- Há documentação de operação/deploy e runbooks no repo.

Gaps:
- Sem acesso operacional direto nesta auditoria.
- Não há codificação de infraestrutura da VPS no repo para auditoria técnica reproduzível.

---

## 6) Priorização recomendada (pré-produção)

### Fase 0 — Bloqueadores de entrada em produção
1. Reduzir regressões TypeScript (meta: zerar erros novos e estabilizar baseline).  
2. Corrigir `check-no-db-push` (allowlist/documentação em sincronia).  
3. Corrigir `test:e2e:smoke` (baseURL/porta e precondições de ambiente).

### Fase 1 — Segurança e confiabilidade
4. Transformar fuzz em execução real contra ambiente de teste com asserts automáticos.  
5. Remover/acondicionar apikey hardcoded em jobs SQL para abordagem gerenciável por secret/config.  
6. Ajustar estratégia de logs de frontend para preservar `warn/error` em produção.

### Fase 2 — Performance e governança
7. Plano de redução de chunks pesados (split por feature crítica e imports sob demanda).  
8. Tratar 5 vulnerabilidades de dependência com plano de upgrade controlado.  
9. Consolidar observabilidade de VPS e banco com evidências operacionais auditáveis (dashboards + alertas + coleta de métricas).

---

## 7) Conclusão executiva

O projeto possui **boa base de governança e segurança por desenho**, mas **a prontidão para produção ainda está comprometida** por três fatores principais:  
1) **alto volume de erros TypeScript ativos**,  
2) **quebra prática em parte da malha de testes/gates (CI e E2E smoke)**,  
3) **lacunas operacionais em validação live de banco/VPS nesta sessão**.

Com as correções priorizadas acima, o risco de entrada em produção reduz de forma significativa.
