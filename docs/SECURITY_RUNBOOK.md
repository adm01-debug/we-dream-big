# Security Runbook — Promo Gifts

Documentação operacional do Security Center (`/admin/seguranca-acesso`). Para arquitetura completa veja `mem://security/production-hardening-baseline`.

## 1. Como usar o Security Center

Acesse `/admin/seguranca-acesso` (somente admins). Painel auto-atualiza a cada 30s. Abas:

- **Anomalias 24h** — visão executiva: falhas de login, bots bloqueados, falhas de token, IPs distintos. Limiar visual: cinza (low) → amarelo (medium) → vermelho (high).
- **Auditoria recente** — últimas 50 ações de `admin_audit_log` com filtro por ação/admin e drill-down JSON.
- **Tokens suspeitos** — quotes/kits com >3 falhas/24h, agrupados; botão **Revogar** força `status='expired'`.
- **Analytics** — gráficos históricos de bot detection.
- **Bot Detection / Rate Limits / Allow-Block IPs** — gestão tática.

## 2. Quando acionar "Forçar logout global"

Botão `FORCE_LOGOUT_ALL` (header da página). **APENAS** em incidentes confirmados:

- Vazamento de credenciais administrativas
- Comprometimento confirmado de sessão (token roubado)
- Pós-rotação de chaves do Supabase
- Incidente de segurança crítico em produção

⚠️ **Impacto**: toda a equipe precisa re-autenticar. Admins precisam refazer MFA. **Avise o time antes**.

Auditoria automática registrada em `admin_audit_log` com IP, UA, e contagem de usuários.

## 3. Como interpretar Anomalias 24h

| Indicador | Verde | Amarelo | Vermelho | Ação |
|---|---|---|---|---|
| Falhas login | <10 | 10-50 | >50 | Verifique padrão de IP → blocklist |
| Bots bloqueados | <20 | 20-100 | >100 | Confirme scraping → blocklist em massa |
| Falhas de token | <5 | 5-20 | >20 | Auto-expira após 5/h; revogue manual se distribuído |
| IPs distintos token | <10 | 10-30 | >30 | Possível link vazado → revogar token do recurso |

## 4. Resposta rápida a incidente (IP suspeito)

1. Identifique o IP nos cards de anomalia ou tabela de bot detection.
2. Clique **Bloquear IP** → define duração (padrão 24h) e motivo.
3. Sistema insere em `ip_access_control` com `expires_at` e registra auditoria.
4. Para bloqueio permanente, use a aba **Allow/Block IPs**.

## 5. Escalation path

1. **Operador (admin)** detecta anomalia → bloqueio temporário de IP / revogação de token.
2. **Engenharia** se anomalia persiste >1h ou afeta múltiplos recursos → análise de logs em Supabase + edge function logs.
3. **Liderança** se há suspeita de comprometimento → acionar **Forçar logout global**, rotacionar chaves do Supabase, comunicar clientes afetados.

## 6. Checklist pós-incidente

- [ ] Auditoria revisada (`/admin/seguranca-acesso` → Auditoria recente)
- [ ] IPs hostis em blocklist permanente
- [ ] Tokens dos recursos afetados revogados
- [ ] Chaves de API rotacionadas (se aplicável)
- [ ] Force-global-logout executado (se aplicável)
- [ ] Comunicação interna realizada
- [ ] Memória/runbook atualizada com lições aprendidas

## 7. Referências internas

- Hardening baseline: `mem://security/production-hardening-baseline`
- Anti-scraping: `mem://security/anti-scraping-protection`
- MFA admin: `mem://security/system-auth-and-access-governance-v2`
- Disaster recovery: `mem://architecture/operational-resilience-and-disaster-recovery`
