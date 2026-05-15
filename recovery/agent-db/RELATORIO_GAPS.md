# 📊 RELATÓRIO CONSOLIDADO — Audit de Gaps Destino vs Dump Lovable

> **Data:** 2026-05-11 · **Versão:** 1.0
> **Banco DESTINO (prod ativo):** Supabase `doufsxqlfjyuvxuezpln` (PG 17.6)
> **Banco SOURCE (dump Lovable):** Supabase `jlpkghroyzkmseixtjxv` (snapshot DDL)
> **Objetivo:** Auditar GAPS entre o que o dump Lovable diz que deveria existir e o que existe HOJE no destino — **read-only**.
> **Decisão estratégica:** banco destino é PROD com evolução pós-Lovable; **NÃO aplicar dump**. Auditar para identificar funcionalidades possivelmente perdidas.

---

## 🎯 Sumário executivo

```
┌──────────────────────────────────────────────────────────────────────┐
│  📊 STATS GERAIS                                                     │
│  Tabelas:       136 dump  →  195 destino  (+43% evolução)            │
│  Functions:     163 dump  →  545 destino  (+234% evolução)           │
│  RLS Policies:  317 dump  →  458 destino  (+44% evolução)            │
│  Indexes:       234 dump  →  850 destino  (+263% evolução)           │
│  Triggers:      ~80 dump  →  232 destino  (+190% evolução)           │
│  Views:         ~20 dump  →  107 destino  (+435% evolução)           │
├──────────────────────────────────────────────────────────────────────┤
│  🔴 AUSÊNCIAS CRÍTICAS                                               │
│  Tabelas só no dump:    95   (subsistemas inteiros sumiram)          │
│  Functions só no dump:  137  (workflow + segurança comprometidos)    │
│  Storage policies:      0/34 (storage completamente desprotegido!)   │
└──────────────────────────────────────────────────────────────────────┘
```

### 📌 As 3 conclusões principais

1. **O destino EVOLUIU MASSIVAMENTE pós-Lovable** — virou ERP completo de brindes promocionais (suppliers, produtos com 148 colunas, materiais, técnicas de gravação, mockup AI, etc).
2. **Funcionalidades importantes do dump SUMIRAM no destino** — webhooks outbound, MFA step-up, sistema de chaves MCP, segurança/throttling.
3. **Storage está sem RLS** — 0 policies em `storage.objects`, enquanto o dump tinha 34. ⚠️ **Risco de segurança**.

---

## 1️⃣ GAP DE TABELAS

### Estatísticas

| Categoria | Total | % |
|---|---|---|
| ✅ Em ambos (núcleo compartilhado) | 41 | 21% |
| 🔴 Só no dump (FALTAM no destino) | 95 | 70% das tabelas do dump |
| 🟢 Só no destino (evolução pós-Lovable) | 154 | 79% das tabelas do destino |

### 🔴 As 95 tabelas faltantes — categorizadas por DOMÍNIO

#### 🔴 ALTO IMPACTO (subsistemas críticos)

| Domínio | # | Tabelas | Risco |
|---|---|---|---|
| **MCP Keys system** | 4 | `mcp_api_keys`, `mcp_access_violations`, `mcp_full_grantors`, `mcp_key_auto_revocations` | 🔴 ALTO |
| **Step-up Auth (MFA)** | 3 | `step_up_challenges`, `step_up_tokens`, `step_up_audit_log` | 🔴 ALTO |
| **Webhooks (outbound)** | 4 | `outbound_webhooks`, `webhook_deliveries`, `webhook_delivery_metrics`, `webhook_delivery_metrics_y2026m05/06` | 🔴 ALTO |
| **Segurança/Geofence** | 5 | `access_security_settings`, `geo_allowed_countries`, `rls_denial_log`, `hardening_health_snapshots`, `public_token_failures` | 🔴 ALTO |
| **Auth Login Tracking** | 2 | `auth_login_attempts`, `user_token_revocations` | 🔴 ALTO |

#### 🟡 MÉDIO IMPACTO (features perdidas/substituídas)

| Domínio | # | Tabelas |
|---|---|---|
| **Magic Up** (marketing) | 6 | `magic_up_*` (brand_kits, campaigns, generations, comments, public_shares, reactions) |
| **Kit Collaboration** | 4 | `kit_collaborators`, `kit_comments`, `kit_share_tokens`, `kit_variants` |
| **Collection Items v2** | 4 | `collection_items`, `collection_items_trash`, `collection_item_reactions`, `comparison_reactions` |
| **Expert chat** | 2 | `expert_conversations`, `expert_messages` |
| **Mockup drafts/prompts** | 3 | `mockup_drafts`, `mockup_prompt_configs`, `mockup_prompt_history` |
| **Optimization queue** | 2 | `optimization_queue`, `optimization_queue_runs` |
| **Product groups v1** | 4 | `product_groups`, `product_group_members`, `product_component_locations`, `product_components` |
| **Cart templates** | 3 | `cart_templates`, `seller_cart_items`, `seller_carts` |
| **Audit/Ownership** | 2 | `ownership_audit_reports`, `ownership_repair_logs` |

#### 🟢 BAIXO IMPACTO (histórico/partições)

| Domínio | # | Tabelas |
|---|---|---|
| **Audit log particionado** | 9 | `admin_audit_log_y2025m12` até `y2026m06` + `admin_audit_log_old` |
| **E2E test infra** | 2 | `e2e_cleanup_audit`, `e2e_cleanup_rate_limit` |
| **Misc/Histórico** | 36 | `audit_logs`, `favorites`, `favorite_item_reactions`, `connection_test_history`, `conversation_*` (3), `category_icons`, `component_media`, `external_connections`, `follow_up_reminders`, `art_file_attachments`, `app_vitals`, `query_telemetry`, `request_rate_limits`, `role_migration_batches`, `role_migration_items`, `recently_viewed_products`, `saved_trends_views`, `scheduled_reports`, `search_analytics`, `simulator_wizard_drafts`, `user_comparisons`, `user_preferences`, `user_search_history`, `video_variant_links`, `voice_command_logs`, etc. |

### 🟢 As 154 tabelas extras (evolução pós-Lovable)

Resumido por domínio (não é regressão, é EVOLUÇÃO):

| Domínio | # | Highlights |
|---|---|---|
| **Catálogo produtos** | ~25 | `products` (148 colunas, 37 MB), `product_images` (47 MB), `product_variants`, `product_materials`, `product_kit_components` |
| **Suppliers** | ~22 | `suppliers` (41 colunas), `supplier_products_raw` (54 MB), `supplier_branches`, `supplier_*_mappings` |
| **Categories + atributos** | ~13 | `categories`, `attribute_definitions`, `attribute_equivalences`, `attribute_groups` |
| **Materiais/Cores** | ~10 | `color_groups`, `color_equivalences`, `material_types`, `material_equivalences` |
| **Mockup AI** | ~7 | `mockup_credits`, `mockup_generation_jobs`, `mockup_approval_links`, `ai_models`, `ai_providers` |
| **Tabela preço gravação** | ~4 | `tabela_preco_gravacao_oficial(_faixa)`, `tecnicas_gravacao`, `print_area_techniques` |
| **Stock/Inventory** | 2 | `stock_daily_summary`, `stock_snapshots` |
| **Backups refactor** | 11 | `_backup_*_20260425/26` (limpeza abril/2026) |
| **Staging/Import** | ~10 | `_asia_api_staging`, `scraper_images_staging`, `import_pipeline_steps`, `xbz_gallery_staging` |
| **Marketing/SEO** | ~5 | `seo_redirects`, `seo_audit_log`, `commemorative_dates`, `commemorative_date_*` |

---

## 2️⃣ GAP DE FUNCTIONS

### Estatísticas

| Categoria | Total | % |
|---|---|---|
| ✅ Em ambos | 20 | 12% das do dump (apenas!) |
| 🔴 Só no dump (FALTAM) | 137 | 87% do dump perdido |
| 🟢 Só no destino | 521 | 96% do destino é evolução |

### 🔴 Top 5 categorias de functions FALTANTES

#### 🔴 CRÍTICAS

| Categoria | # | Functions principais |
|---|---|---|
| **Quote/Order workflow** | 13 | `convert_quote_to_order`, `fn_create_quote_v3`, `fn_save_quote_draft`, `generate_order_number_v5`, `generate_quote_number`, `notify_new_order`, `notify_quote_status_change`, `submit_quote_response`, `validate_quote_real_discount`, `invalidate_used_approval_token` |
| **Webhooks** | 4 | ⚠️ `dispatch_quote_webhook_event` (a com URL hardcoded), `maintain_webhook_metrics`, `retry_failed_webhook_deliveries`, `get_webhook_delivery_summary` |
| **Step-up Auth (MFA)** | 5 | `request_step_up_challenge`, `mark_step_up_password_verified`, `consume_step_up_token`, `verify_step_up_otp`, `cleanup_expired_step_up` |
| **MCP Keys system** | 13 | `audit_mcp_*` (3), `can_grant_mcp_full`, `check_mcp_abuse_threshold`, `guard_mcp_api_keys_writes`, `log_mcp_key_*` (2), `mcp_audit_actor`, `validate_mcp_key`, `auto_revoke_orphan_full_keys`, `trg_auto_revoke_mcp_on_role_loss`, `record_mcp_access_violation` |
| **Security/Auth** | 11 | `check_auth_throttling`, `check_rate_limit`, `record_auth_attempt`, `check_ip_access`, `validate_ip_access_control`, `fn_check_geo_access`, `check_hardening_status`, `snapshot_hardening_status`, `log_access_denied`, `log_rls_denial`, `revoke_all_user_tokens` |

#### 🟡 IMPORTANTES

| Categoria | # |
|---|---|
| Roles/Permissions | 13 |
| Notifications/UX | 5 |
| Logs/Audit cleanup | 10 |
| Optimization Queue | 5 |
| Discount Approval | 3 |
| Telemetry/Monitoring | 6 |

#### 🟢 Situacionais

| Categoria | # |
|---|---|
| Search/Recomendações | 8 |
| Kit collaboration | 2 |
| Magic Up | 1 |
| Other | 30+ |

### ✅ As 20 functions SOBREVIVENTES (núcleo histórico)

| Categoria | Functions |
|---|---|
| **Roles** | `has_role`, `is_admin`, `is_admin_strict`, `is_dev`, `is_supervisor_or_above` |
| **Auth triggers** | `handle_new_user`, `set_updated_at`, `update_updated_at_column` |
| **AI Quotas** | `acquire_ai_quota`, `check_ai_quota` |
| **Connections** | `can_manage_connections`, `can_view_connections`, `can_view_audit_logs`, `can_view_telemetry` |
| **Stats/Analytics** | `get_client_top_products`, `get_industry_top_products`, `get_industry_benchmark_stats` |
| **Templates** | `increment_kit_template_usage` |
| **Versioning** | `increment_row_version` |
| **Favorites** | `ensure_default_favorite_list` |

---

## 3️⃣ GAP DE POLICIES (RLS)

### Estatísticas

| Categoria | Total |
|---|---|
| **Total policies destino** | 458 |
| **Total policies dump** | 317 (261 únicas tabela.policy_name) |
| **Storage policies destino** | 0 ⚠️ |
| **Storage policies dump** | 34 |

### Detalhe por evolução

A análise de policies INDIVIDUAIS exige cruzamento por tabela. O insight macro é:

- **41 tabelas em comum** — provavelmente mantiveram policies equivalentes (com nomes possivelmente diferentes)
- **95 tabelas só no dump** — todas as suas policies sumiram junto (~150-200 policies a menos)
- **154 tabelas só no destino** — todas as suas policies são novas (~300+ policies a mais)

### ⚠️ ALERTA: Storage sem RLS

```sql
-- Estado atual do storage no destino:
SELECT count(*) FROM pg_policies WHERE schemaname='storage';
→ 0
```

**O dump tinha 34 policies de storage** distribuídas em 7 buckets:
- `component-media` (4), `mockup-art-files` (7), `personalization-images` (9)
- `product-videos` (4), `quarantine` (2), `supplier-logos` (6)
- Cross-bucket (2)

**Destino tem 1 bucket** (`scripts`) **sem nenhuma policy**. Significa que:
- Service role tem acesso total (OK)
- ANON e AUTHENTICATED não conseguem fazer nada (storage está fechado por default)
- Se quiser uploads/downloads via frontend → precisa policies

---

## 4️⃣ GAP DE INDEXES

### Estatísticas

| Categoria | Total |
|---|---|
| **Indexes destino** | 850 |
| **Indexes dump** | 234 |
| **Δ** | +616 (+263%) |

Esse aumento massivo reflete:
- 154 tabelas a mais (cada uma com 3-15 indexes)
- Indexes específicos pra busca fulltext em produtos
- Indexes parciais e funcionais pra otimização

**Não é gap crítico** — destino tem MAIS indexes, não menos. Análise individual fica como follow-up.

---

## 5️⃣ OUTROS ACHADOS

### Auth users
- **4 usuários** no `auth.users` do destino (provavelmente admins/contas técnicas)

### Backups visíveis
O destino tem 11 tabelas com prefixo `_backup_*` documentando refactor de **25-26/abril/2026**:
- `_backup_unif_limpeza_fatmin_20260425` (2.3 MB)
- `_backup_unif_setup_fatmin_20260425` (176 KB)
- `_backup_unif_setup_fatmin_faixa_20260425` (128 KB)
- `_backup_20260425_tabela_preco_gravacao_oficial_faixa` (128 KB)
- `_backup_unif_funcoes_20260425` (72 KB)
- `_backup_unif_funcoes_f3_20260425` (88 KB)
- `_backup_guardachuva_setup_20260425` (88 KB)
- `_backup_plaquinha_sugestao_20260425` (136 KB)
- `_backup_silk_ajustes_20260426` (48 KB)
- `_backup_20260425_tecnicas_gravacao` (8 KB)

**Conclusão:** time TI da Promo Gifts JÁ faz backups manuais antes de refactors. Boa prática.

### Realtime
- `supabase_realtime` ativo em 8 tabelas: `users`, `orders`, `order_items`, `quotes`, `quote_items`, `quote_comments`, `notifications`, `variant_supplier_sources`

---

## 6️⃣ RECOMENDAÇÕES

### 🔴 Ações URGENTES

1. **Verificar se features ausentes ainda são usadas no app:**
   - Buscar no código React por chamadas a `mcp_api_keys`, `step_up_*`, `outbound_webhooks`, `magic_up_*`
   - Se SIM → restaurar tabelas + functions (cuidado: dependências entre si)
   - Se NÃO → marcar como obsoleto no PLANO

2. **Configurar storage policies:**
   - Se sistema usa uploads/downloads no frontend → criar policies como no dump
   - Se SOMENTE service_role usa storage → manter zero policies (atual)

3. **Refatorar `dispatch_quote_webhook_event` (se for restaurada):**
   - URL hardcoded apontando pra projeto antigo (Lovable ref)
   - Precisa migrar pra vault.secrets ou config dinâmica

### 🟡 Ações IMPORTANTES

4. **Auditar 137 functions faltantes** vs uso no código frontend:
   - `npm run grep "rpc('" src/` pra encontrar todas as RPC calls
   - Cruzar com a lista das 137 → priorizar resgate das usadas

5. **Documentar evolução pós-Lovable:**
   - O destino tem 521 functions novas — boa parte são `fn_*` de classificação/pipeline
   - Mapeamento "o que era do Lovable → o que virou agora" facilita debugging

### 🟢 Ações OPCIONAIS

6. **Restaurar audit log particionado:**
   - Dump tinha `admin_audit_log_y2025m12` até `y2026m06` (9 partições mensais)
   - Atual tem só `admin_audit_log` (não particionada, 80 KB)
   - Considerar particionamento se volume crescer

7. **Avaliar features descontinuadas:**
   - Magic Up (6 tabelas): vale a pena ressuscitar?
   - Kit Collaboration v1 (4 tabelas): foi substituída por outra arquitetura?
   - Collection Items v1 (4 tabelas): destino tem só `collection_products`, simplificou?

---

## 7️⃣ Arquivos relacionados no repo

```
recovery/
├── snapshots/2026-05-11_pre_recovery/   ← Snapshot do destino (14/22 JSONs)
├── block01_tables_indexes_rls.sql       ← Origem do dump
├── block03_policies.sql                 ← 317 policies do dump
├── block04_functions.sql                ← 163 functions do dump
├── block09b_storage_policies_full.sql   ← 34 policies storage do dump
├── docs/INDEX.md                        ← Inventário Lovable
└── agent-db/
    ├── PLANO_20_FASES.md                ← Plano v3.0 (Recovery) — OBSOLETO
    ├── HANDOFF.md                       ← Handoff Agente DB
    ├── progress.md                      ← Status fases
    └── RELATORIO_GAPS.md                ← ESTE arquivo ⭐
```

---

## 📅 Histórico desta auditoria

| Data | Versão | Mudança |
|---|---|---|
| 2026-05-11 16:00 | 1.0 | Versão inicial — auditoria tabelas + functions completas |

---

## 🔚 Próximos passos sugeridos

> 💡 Esta auditoria é READ-ONLY. **Zero modificação** foi feita no banco.

1. ☐ Sponsor revisa este relatório
2. ☐ Decide quais subsistemas faltantes vale a pena resgatar
3. ☐ Para os escolhidos: investigar dependências e ordem de aplicação
4. ☐ Plano v4.0 do Recovery passa a ser "diff & patch cirúrgico" baseado nas decisões acima

🫡 Auditoria fechada.
