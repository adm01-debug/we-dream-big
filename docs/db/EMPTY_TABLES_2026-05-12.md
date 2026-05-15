# Auditoria de Tabelas Vazias — 2026-05-12

Gerado durante T27 do Plano de Saneamento (Fase 3).  
Total auditado: **130 tabelas** com `n_live_tup = 0` em `pg_stat_user_tables`.

**Critérios de classificação:**
- `DROP` — tabela descartável: funcionalidade removida, staging sem uso, duplicata
- `KEEP_FEATURE` — tabela de feature em desenvolvimento; vazia é esperado
- `KEEP_INFRA` — tabela de infraestrutura/log/audit que cresce em produção
- `TODO` — requer decisão de produto antes de dropar

---

## 🔴 DROP — Remover (funcionalidade removida ou staging)

| Tabela | Motivo |
|--------|--------|
| `_asia_api_staging` | Staging de integração Asia removida; sem referências no código |
| `collection_item_reactions` | Reactions removidas da feature de coleções (sem PK, sem dados) |
| `comparison_reactions` | Reactions removidas da feature de comparações |
| `color_analysis_staging` | Staging de análise de cor nunca populada |
| `import_staging_images` | Substituída por `scraper_images_staging` e `sm_images_staging` |
| `sm_images_staging` | Staging de imagens Shopee/Mercado — pipeline desativado |
| `xbz_gallery_staging` | Staging XBZ sem uso confirmado |
| `media_sync_log` | Log de sync de mídia — pipeline substituído |
| `product_included_packagings` | Embalagem incluída — feature descartada (ver `packagings`) |
| `product_packagings` | Duplicata de `product_included_packagings` + `packagings` |
| `packagings` | Feature de embalagem não implementada; sem FK ativa |
| `supplier_packagings` | Idem — sem uso |
| `product_search_logs` | Substituída por `search_analytics` e `search_queries` |
| `video_validation_log` | Log de validação de vídeo — pipeline removido |
| `seo_audit_log` | Log de auditoria SEO — feature nunca lançada |
| `role_migration_batches` | Migration de roles concluída; tabela de controle descartável |
| `role_migration_items` | Idem |
| `commemorative_date_exclusions` | Exclusões de datas comemorativas — feature simplificada |
| `expert_conversations` | Feature Expert removida do roadmap |
| `expert_messages` | Idem |
| `conversation_audit_logs` | Log de conversa — feature WhatsApp não ativada |
| `conversation_delivery_status` | Idem |
| `conversation_event_history` | Idem |

**Total DROP: 23 tabelas**

---

## 🟡 TODO — Decisão de produto necessária

| Tabela | Questão em aberto |
|--------|-------------------|
| `cart_templates` | Templates de carrinho: feature planejada? Ver roadmap |
| `custom_kits` | Kits customizados: MVP adiado? |
| `kit_collaborators` | Colaboração em kits: parte do custom_kits adiado? |
| `kit_comments` | Idem |
| `kit_templates` | Templates de kit: ativo ou descartado? |
| `kit_variants` | Variantes de kit: ativo? |
| `seller_cart_items` | Carrinho de vendedor: feature ativa mas vazia |
| `seller_carts` | Idem |
| `quote_drafts` | Rascunhos de orçamento: feature em dev? |
| `quote_templates` | Templates de orçamento: planejados? |
| `quote_versions` | Versionamento de orçamento: ativo? |
| `scheduled_reports` | Relatórios agendados: feature em dev? |
| `follow_up_reminders` | Lembretes de follow-up: CRM feature? |
| `simulator_wizard_drafts` | Wizard do simulador: feature em dev? |
| `user_comparisons` | Comparações de usuário: feature ativa mas vazia |
| `saved_trends_views` | Views de tendências salvas: analytics? |
| `magic_up_brand_kits` | Magic Up: brand kits — feature ativa? |
| `magic_up_campaigns` | Magic Up: campanhas |
| `magic_up_comments` | Magic Up: comentários |
| `magic_up_generations` | Magic Up: gerações |
| `magic_up_public_shares` | Magic Up: compartilhamentos |
| `magic_up_reactions` | Magic Up: reactions |
| `generated_mockups` | Mockups gerados: tabela ativa mas vazia |
| `mockup_approval_links` | Links de aprovação de mockup |
| `mockup_drafts` | Rascunhos de mockup |
| `mockup_generation_jobs` | Jobs de geração de mockup |
| `mockup_prompt_configs` | Configs de prompt de mockup |
| `mockup_prompt_history` | Histórico de prompts |
| `mockup_templates` | Templates de mockup |
| `optimization_queue` | Fila de otimização: ativo? |
| `optimization_queue_runs` | Idem |
| `discount_approval_requests` | Aprovação de desconto: feature ativa? |
| `seller_discount_limits` | Limites de desconto por vendedor: ativo? |
| `outbound_webhooks` | Webhooks de saída: feature em dev? |
| `inbound_webhook_endpoints` | Webhooks de entrada: configurado? |
| `inbound_webhook_events` | Idem |
| `webhook_deliveries` | Entregas de webhook |
| `webhook_delivery_metrics` | Métricas de entrega |

**Total TODO: 37 tabelas**

---

## 🟢 KEEP_INFRA — Manter (infra/log/audit que crescerá em produção)

| Tabela | Motivo |
|--------|--------|
| `audit_logs` | Log de auditoria genérico — crescerá com uso |
| `audit_log` | Log de auditoria admin — crescerá com uso |
| `admin_audit_log` | Idem, específico para admins |
| `api_usage` | Métricas de uso de API |
| `app_vitals` | Vitals de performance |
| `auth_login_attempts` | Log de tentativas de login (segurança) |
| `login_attempts` | Idem (versão antiga) — candidata a unificação com `auth_login_attempts` |
| `bot_detection_log` | Log de detecção de bot |
| `connection_test_history` | Histórico de testes de conexão |
| `e2e_cleanup_rate_limit` | Rate limit de limpeza E2E |
| `edge_function_invocations` | Log de invocações de edge functions |
| `enrichment_log` | Log de enriquecimento de dados |
| `file_scan_logs` | Log de varredura de arquivos |
| `geo_allowed_countries` | Lista de países permitidos (GEO) |
| `hardening_health_snapshots` | Snapshots de hardening |
| `ip_access_control` | Controle de acesso por IP |
| `mcp_access_violations` | Violações de acesso MCP |
| `mcp_api_keys` | Chaves API do MCP |
| `mcp_full_grantors` | Grantors MCP |
| `mcp_key_auto_revocations` | Revogações automáticas MCP |
| `notification_preferences` | Preferências de notificação |
| `notifications` | Notificações |
| `ownership_audit_reports` | Relatórios de auditoria de ownership |
| `ownership_repair_logs` | Logs de reparo de ownership |
| `product_views` | Views de produto (analytics) |
| `public_token_failures` | Falhas de token público |
| `push_subscriptions` | Subscriptions de push notification |
| `query_telemetry` | Telemetria de queries |
| `rls_denial_log` | Log de denials RLS (segurança) |
| `search_analytics` | Analytics de busca |
| `secret_rotation_log` | Log de rotação de secrets |
| `security_settings` | Configurações de segurança |
| `step_up_audit_log` | Log de step-up authentication |
| `step_up_challenges` | Challenges de step-up |
| `step_up_tokens` | Tokens de step-up |
| `system_settings` | Configurações do sistema |
| `user_filter_presets` | Presets de filtro do usuário |
| `user_favorites` | Favoritos do usuário |
| `user_preferences` | Preferências do usuário |
| `user_search_history` | Histórico de busca |
| `user_token_revocations` | Revogações de token |
| `workspace_notifications` | Notificações de workspace |

**Total KEEP_INFRA: 42 tabelas**

---

## 🔵 KEEP_FEATURE — Manter (feature ativa, vazia por ser início de vida)

| Tabela | Feature |
|--------|---------|
| `access_security_settings` | Configurações de segurança de acesso |
| `variant_commemorative_dates` | Datas comemorativas por variante |
| `product_target_audiences` | Públicos-alvo por produto |
| `recently_viewed_products` | Produtos recentemente vistos |
| `request_rate_limits` | Rate limiting de requests |
| `saved_filters` | Filtros salvos |
| `scraper_images_staging` | Staging de imagens do scraper (ativo) |
| `stock_daily_summary` | Resumo diário de estoque |
| `stock_snapshots` | Snapshots de estoque |
| `search_queries` | Queries de busca (analytics) |

**Total KEEP_FEATURE: 10 tabelas**

---

## Resumo

| Status | Qtd |
|--------|-----|
| 🔴 DROP | 23 |
| 🟡 TODO | 37 |
| 🟢 KEEP_INFRA | 42 |
| 🔵 KEEP_FEATURE | 10 |
| **Total auditado** | **112** |

> Nota: 18 tabelas restantes requerem verificação manual de colunas antes de classificar.  
> Ação imediata: executar DROPs das 23 tabelas classificadas como DROP.  
> Próximo passo: levar as 37 tabelas TODO para review de produto.

## Próximas ações

1. **Criar migration `20260512000004_t27_drop_empty_tables.sql`** com os 23 DROPs (requer confirmação do Sponsor)
2. **Abrir issue de produto** para as 37 tabelas TODO com decisão de roadmap
3. **Reclassificar** as 18 tabelas não auditadas

---
*Gerado em: 2026-05-12 | Responsável: Joaquim | Refs: T27, Fase 3 Saneamento*
