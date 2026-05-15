# Incident: Exposição acidental de `.env` (2026-04)

**Severidade:** P0
**Status:** Mitigado parcialmente — **rotação de credenciais ainda em andamento (issue #76)**
**Owner:** sponsor + adm01-debug

## TL;DR

Em algum momento durante 2026-04, o arquivo `.env` do projeto Promo_Gifts foi commitado / exposto. A issue #76 ("🚨 P0: Rotacionar credenciais expostas") rastreia a rotação dos 5 sistemas afetados. Este documento é o registro permanente do incidente.

> ⚠️ **Este documento é um stub criado durante a Fase 1 do redeploy 2026-05.** O timeline real precisa ser preenchido pelo operador após cada etapa da rotação. As seções abaixo são template — substituir `__PENDING__` pelos dados reais.

## Timeline (preencher durante/após rotação)

| Quando (UTC) | Evento | Operador |
|---|---|---|
| `__PENDING__` | Detecção da exposição (commit / log / scan) | `__PENDING__` |
| `__PENDING__` | `.env` removido / sanitizado / força-push? | `__PENDING__` |
| `__PENDING__` | `.gitignore` confirmado cobrindo `.env*` | `__PENDING__` |
| 2026-04-30 | Issue #76 aberta | adm01-debug |
| 2026-04-30 | Issue #76 fechada (prematuro) | adm01-debug |
| 2026-05-12 | Issue #76 **reaberta** ao descobrir consumidor adicional na auditoria Decision 012 (Bitrix24) | adm01-debug |
| `__PENDING__` | Rotação Supabase `service_role` (projeto `doufsxqlfjyuvxuezpln`) | `__PENDING__` |
| `__PENDING__` | Rotação n8n credentials | `__PENDING__` |
| `__PENDING__` | Rotação webhook Bitrix24 (revogação do antigo `ipkwbb32nhewia33`) | `__PENDING__` |
| `__PENDING__` | Rotação Evolution API keys (por instância) | `__PENDING__` |
| `__PENDING__` | Vercel envs atualizados | `__PENDING__` |
| `__PENDING__` | `.env` local atualizado em todas as 3 máquinas de dev | `__PENDING__` |
| `__PENDING__` | Smoke tests pós-rotação (5 sistemas × 1 chamada cada) | `__PENDING__` |
| `__PENDING__` | `gitleaks detect --source . --no-git` → exit code 0 | `__PENDING__` |
| `__PENDING__` | Comentário final em #76 + close | `__PENDING__` |

## Conteúdo exposto (preencher)

A enumerar pelo operador no momento da rotação. Para cada credencial, registrar:
- Nome / chave (sem o valor)
- Sistema origem
- Quem teve acesso enquanto exposta
- Foi usada por terceiro? (sinais: logs anômalos, custo anômalo, alertas)

| Credencial | Sistema | Janela de exposição | Sinal de abuso? |
|---|---|---|---|
| `__PENDING__` | Supabase service_role (projeto `doufsxqlfjyuvxuezpln`) | `__PENDING__` | `__PENDING__` |
| `__PENDING__` | Bitrix24 webhook `ipkwbb32nhewia33` | `__PENDING__` | `__PENDING__` |
| `__PENDING__` | Bitrix24 OAuth `oEUYsInMBZbNlMoI` | `__PENDING__` | `__PENDING__` |
| `__PENDING__` | n8n internal (variables + credentials) | `__PENDING__` | `__PENDING__` |
| `__PENDING__` | Evolution API (key + instâncias) | `__PENDING__` | `__PENDING__` |

## Rotação por sistema (5×)

Detalhar comandos e validação por sistema. Templates abaixo.

### 1. Supabase — projeto `doufsxqlfjyuvxuezpln`

- [ ] `__PENDING__`: Reset `service_role` no dashboard
- [ ] `__PENDING__`: Nova key copiada para gerenciador de secrets
- [ ] `__PENDING__`: Edge Functions atualizadas
- [ ] `__PENDING__`: CF Workers atualizados
- [ ] `__PENDING__`: n8n credentials atualizadas
- [ ] `__PENDING__`: Smoke: `curl -H "apikey: $NEW_KEY" $URL/rest/v1/products?limit=1` → 200

### 2. n8n

- [ ] `__PENDING__`: Variáveis Supabase atualizadas
- [ ] `__PENDING__`: Credentials regeneradas
- [ ] `__PENDING__`: Smoke: workflow "list contatos Bitrix" → success

### 3. Bitrix24

- [ ] `__PENDING__`: Webhook antigo `ipkwbb32nhewia33` confirmado revogado
- [ ] `__PENDING__`: OAuth `oEUYsInMBZbNlMoI` revogado e regenerado
- [ ] `__PENDING__`: `BITRIX24_WEBHOOK_URL` no Edge Function vault aponta para webhook NOVO

### 4. Evolution API

- [ ] `__PENDING__`: API key regenerada por instância
- [ ] `__PENDING__`: n8n atualizado
- [ ] `__PENDING__`: Promo_Gifts (`EVOLUTION_API_KEY` no env) atualizado
- [ ] `__PENDING__`: Smoke: envio de mensagem teste → success

### 5. Vercel

- [ ] `__PENDING__`: Envs do projeto Promo_Gifts atualizados (production + preview)
- [ ] `__PENDING__`: Redeploy do projeto

## Lições aprendidas (preencher após fechamento)

A enumerar pelo operador após conclusão:

1. **Como foi exposto** — `__PENDING__` (commit, log público, painel mal configurado, etc.)
2. **Por que não foi detectado antes** — `__PENDING__` (gitleaks pré-commit não configurado? hook desligado?)
3. **Mudança preventiva implantada** — `__PENDING__` (sugestões: pre-commit gitleaks, scan no CI já habilitado em #76, secret manager centralizado, etc.)

## Verificação automatizada (status)

| Check | Status | Quando |
|---|---|---|
| `.env` no `.gitignore` | ✅ confirmado (entradas `.env`, `.env.*.local`, `.env.local`) | 2026-05-12 (PR #164) |
| `integration_credentials` tem secrets Bitrix/n8n/CRM/Evolution? | ❌ não — confirma que vivem no Edge Function vault | 2026-05-12 |
| Advisor `auth_users_exposed` zerado | ✅ T15 (PR #162 + #164) | 2026-05-12 |
| Advisor `rls_disabled_in_public` zerado para `_backup_*` | ✅ T16 (PR #162 + #164) | 2026-05-12 |
| CI check Gitleaks — Secret Scan no último PR | ✅ verde (Gitleaks no PR #162 passou em 7s) | 2026-05-12 |
| Pre-commit gitleaks hook local | ❓ não verificado — sugestão: validar `.husky/pre-commit` chama gitleaks | — |

## Referências

- Issue #76 — rastreamento da rotação
- Decision 012 — Bitrix24 como fonte da verdade comercial (acrescenta consumidor de credenciais)
- PR #154 — auditoria que descobriu o desync repo↔DB
- PR #162 — fix dos bloqueadores T12/T13/T14 da Fase 1
- PR #164 — sync das 6 migrations órfãs (esta PR)
