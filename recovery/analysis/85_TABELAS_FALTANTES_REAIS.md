# 📊 Análise: faltam 85 tabelas (não 64)

## Re-contagem com o dump real

| Categoria | Qtd |
|---|---|
| Tabelas no banco atual | 195 |
| Tabelas no Lovable (limpas) | 126 |
| Em comum | 41 |
| **Faltam recuperar** | **85** |

## 30 tabelas adicionais (não detectadas pela Fase 1)

São tabelas de **backend puro** — zero referências no frontend.
Provavelmente alimentadas por edge functions, triggers e cron jobs.

### Categorias
- 🔐 **Auditoria/Step-up Auth (4):** step_up_audit_log, step_up_challenges, step_up_tokens, audit_logs
- 📊 **Telemetria/Métricas (6):** app_vitals, webhook_delivery_metrics, follow_up_reminders, optimization_queue_runs, e2e_cleanup_audit, e2e_cleanup_rate_limit
- 💬 **Conversation (4):** conversation_audit_logs, conversation_delivery_status, conversation_event_history, auth_login_attempts
- ✨ **Magic Up social (4):** magic_up_comments, magic_up_public_shares, magic_up_reactions, comparison_reactions
- ❤️ **Favoritos/UX (4):** favorites, collection_item_reactions, recently_viewed_products, user_search_history
- 📦 **Produtos/Pedidos (3):** product_groups, product_group_members, order_item_personalizations
- 📝 **Quote (1):** quote_drafts
- 🔑 **MCP/Acesso (3):** mcp_access_violations, mcp_full_grantors, ownership_repair_logs
- 🚫 **Segurança (1):** user_token_revocations

## Impacto
- ⚠️ Triggers e functions chamando essas tabelas falham silenciosamente
- ⚠️ Auditoria (step-up auth, audit_logs) NÃO está sendo gravada hoje
- ⚠️ Features sociais do Magic Up inativas
