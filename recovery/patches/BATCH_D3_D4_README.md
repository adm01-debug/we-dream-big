# BATCH D.3 + D.4 — Lovable 100% Parity

## Objetivo
Aplicar 100% das tables, RPCs e RLS do dump Lovable que ainda não estavam no destino, após auditoria revelar que o trabalho anterior (D.1 + D.2 + Fase 2) tinha entregado apenas ~70% (P1 + P2 básico).

## Status: ✅ COMPLETO — 42 tables + 100 RPCs aplicadas em PROD

## Escopo aplicado

### D.3 — P3 Features (21 tables)
- **D.3.1 Magic Up** (6 tables + 9 RPCs): sistema gamificado de geração de assets
  - `magic_up_brand_kits`, `magic_up_campaigns`, `magic_up_comments`, `magic_up_generations`, `magic_up_public_shares`, `magic_up_reactions`
- **D.3.2 Expert Chat** (5 tables + 6 RPCs): chat com especialistas / WhatsApp
  - `expert_conversations`, `expert_messages`, `conversation_audit_logs`, `conversation_delivery_status`, `conversation_event_history`
  - Enum criado: `conversation_event_type`
- **D.3.3 Voice Commands** (1 table + 4 RPCs)
  - `voice_command_logs`
- **D.3.4 Role Migration** (2 tables): batches de migração de roles
  - `role_migration_batches`, `role_migration_items`
  - Enums criados: `role_migration_status`, `role_migration_item_status`
- **D.3.5 Analytics/UX** (7 tables): histórico, preferências, busca, agendamento
  - `recently_viewed_products`, `user_search_history`, `search_analytics`, `user_preferences`, `saved_trends_views`, `scheduled_reports`, `product_views`

### D.4 — P2 Complementar (21 tables + 75 RPCs)
- **D.4.1 Step-Up MFA Completo** (4 tables + 26 RPCs): autenticação multi-fator com challenges/tokens/auditoria
- **D.4.2 Quote Advanced** (1 table + 4 RPCs): rascunhos, comparação de snapshots/versões, webhook dispatch
  - ⚠️ Correção: URL hard-coded em `dispatch_quote_webhook_event` ajustada de Lovable → destino
- **D.4.3 Ownership Audit** (2 tables + 4 RPCs): auditoria de ownership e órfãos
- **D.4.4 Mockup Advanced** (3 tables): drafts, prompt configs, prompt history
- **D.4.5 Reactions** (3 tables): collections, favorites, comparisons reactions
- **D.4.6 Security/Auth + Rate Limit** (1 table + 16 RPCs): rate limiting, IP blocking, login attempts, geo, RLS matrix audit
- **D.4.7 MCP Advanced** (0 tables + 12 RPCs): grant/revoke MCP full, rotate keys, audit violations
- **D.4.8 Cart Workflow** (7 tables + 3 RPCs): carrinhos, templates, follow-ups, drafts, video links

## Shims criados como dependências universais
Funções de suporte criadas no PROD que não vieram no dump mas eram referenciadas:
- `is_manager_or_admin()` → alias para `is_admin_or_above()`
- `enforce_user_id_owner()` → trigger enforça `user_id = auth.uid()` no INSERT
- `enforce_seller_id_owner()` → idem para `seller_id`
- `set_magic_up_updated_at()` → trigger updated_at automático
- `limit_recently_viewed_items()` → mantém últimos 50 por usuário
- `limit_recently_viewed_products()` → no-op (safety stub)
- `cleanup_user_search_history()` → mantém últimos 100 searches por usuário (preserva `is_pinned`)
- `validate_scheduled_report_email()` → valida formato de email em scheduled_reports
- `log_mockup_prompt_change()` → registra mudanças em mockup_prompt_history automaticamente
- `can_view_all_sales()` → admin/manager/supervisor/dev podem ver todas as vendas

## Total aplicado em PROD (verificado por SQL)
- ✅ 42/42 tables (100%)
- ✅ 100/100 RPCs esperadas (100%)
- ✅ Indexes + RLS + triggers aplicados conforme dump Lovable
- ✅ Sem regressões: D.1, D.2 e Fase 2 (PR #143) preservados

## Próximos passos
- ✅ Merge desta PR
- ❌ **NÃO reaplicar** `kit-public-view` e `quote-public-view` — decisão definitiva de produto (Joaquim, 07/05/2026, commit `0bc97759b`). Rotas públicas com token não fazem parte do modelo de negócio do PromoGifts
- 🟦 Validar com frontend que features Magic Up, Expert Chat, Voice Commands estão funcionando
