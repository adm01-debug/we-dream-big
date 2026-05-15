# 🐛 ISSUES — Recovery Promo_Gifts

> **Última atualização:** 2026-05-11
> **Estado:** Recovery completo, issues remanescentes catalogadas

---

## ✅ Issues FECHADAS

### #1 — FK pendente entre `connection_test_history` e `external_connections`
- **Aberta em:** D.1.2 (Optimization Queue)
- **Fechada em:** D.2.4 (External Connections)
- **Resolução:** FK criada com CASCADE após external_connections existir

### #2 — Bug crítico de 18 dias: `get_connection_failure_window_minutes`
- **Detectada em:** D.2.4 mid-execução
- **Root cause:** Migration `20260423185624` usou `CREATE TABLE IF NOT EXISTS` mas schema antigo já existia
- **Fechada em:** Decision 007 (Plano A'' system_settings rename)
- **Impacto:** Card UI `FailureWindowCard` em `/admin/conexoes` nunca chegou a funcionar — agora funciona

### #3 — 12 secrets em local errado (system_settings_legacy)
- **Detectada em:** Auditoria de uso do legacy (follow-up Decision 007)
- **Fechada em:** Decision 008 (Fase 2 — migração para integration_credentials)

### #4 — Trigger sem prefixos CLOUDFLARE_/XBZ_
- **Detectada em:** Fase 2
- **Fechada em:** Trigger ampliado durante migração de secrets

---

## ⏳ Issues ABERTAS (não bloqueantes)

### #5 — types.ts não reflete schema atualizado
- **Severidade:** baixa (cosmético — DX)
- **Sintoma:** Frontend pode mostrar warnings de tipos faltando para `b2b_collections`, `b2b_collection_products`, novas tabelas D.2
- **Solução:**
  ```bash
  npx supabase gen types typescript --project-id doufsxqlfjyuvxuezpln \
    > src/integrations/supabase/types.ts
  ```
- **Quando fazer:** após merge do PR

### #6 — 12 secrets duplicados em system_settings_legacy
- **Severidade:** baixa (segurança via dual storage temporário)
- **Contexto:** Decision 008 manteve os 12 secrets em `system_settings_legacy` por 1-2 semanas para rollback fácil
- **Solução:**
  ```sql
  DELETE FROM public.system_settings_legacy
  WHERE setting_key LIKE 'CLOUDFLARE_%' OR setting_key LIKE 'XBZ_%';
  ```
- **Quando fazer:** após 1-2 semanas de validação em PROD

### #7 — Migration `20260423185624` é idempotência traiçoeira
- **Severidade:** preventiva
- **Contexto:** Se alguém rodar `supabase db reset` ou clonar do zero, vai cair no mesmo bug do system_settings
- **Solução proposta:**
  - (a) Adicionar comentário de alerta na migration original
  - (b) Criar nova migration `20260511_fix_system_settings_schema` que faz o rename + recreate (idempotente)
- **Quando fazer:** após merge do PR (ou já no PR como bonus)

### #8 — Cron de cleanup pendente
- **Severidade:** baixa
- **Contexto:** Algumas tabelas (collection_items_trash, optimization_queue_runs) crescem se não houver limpeza periódica
- **Solução:** Habilitar pg_cron e agendar jobs de cleanup
- **Quando fazer:** quando volume começar a impactar (não imediato)

### #9 — GlitchTip Auth Token (Frente A)
- **Severidade:** baixa (não relacionado ao banco)
- **Contexto:** Sponsor precisa criar token em https://erros.atomicabr.com.br/
- **Quando fazer:** quando quiser ativar GlitchTip para monitoramento de erros

---

## 📊 Resumo

```
Issues fechadas:    4 (todas críticas/bloqueantes)
Issues abertas:     5 (todas não-bloqueantes)
Issues bloqueantes: 0
```

**Conclusão:** o recovery está OK para merge. As 5 issues abertas são housekeeping pós-merge.

---

## ✅ Issue #10 — FECHADA pós-merge

### #10 — `auth_login_attempts` sem policies (RLS habilitado)
- **Detectada em:** Validação pós-merge (Supabase Advisor `rls_enabled_no_policy`)
- **Root cause:** Patch D.2.1 não extraiu policies dessa tabela do dump Lovable (extrator regex falhou para essa específica)
- **Fix aplicado:** 2 policies criadas (Admins SELECT + Service role INSERT)
- **Documentação:** `POST_MERGE_FIX_AUTH_LOGIN_ATTEMPTS.md`
