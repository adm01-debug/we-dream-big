# 🎯 Classificação Final dos Gaps — Fase B (B.1 + B.3)

> **Data:** 2026-05-11 · **Versão:** 1.0
> **Metodologia:** grep no código React + cruzamento com gaps do RELATORIO_GAPS + validação SQL individual + busca por renames
> **Status:** ✅ Frente B (logs/banco) COMPLETA · ⏳ Frente A (GlitchTip) aguardando token

## 📊 Sumário executivo

```
┌────────────────────────────────────────────────────────────────────┐
│                        Functions (RPCs)                            │
│  Chamadas pelo app:    36                                          │
│  ∩ Faltantes (dump):   30  ← CRITICAL no relatório anterior        │
│  ❌ Confirmadas como GAP REAL: 30 (100%)                           │
│  🔄 Com possível rename:        0                                  │
│  ✅ Falsas alarmes:              0                                 │
├────────────────────────────────────────────────────────────────────┤
│                          Tables                                    │
│  Usadas pelo app:      116                                         │
│  ∩ Faltantes (dump):    57  ← CRITICAL no relatório anterior       │
│  ❌ Confirmadas como GAP REAL: 54                                  │
│  🔄 Renames/Aliases:            3  ← FALSAS ALARMES                │
│  ✅ Reais a investigar:        ~54                                 │
└────────────────────────────────────────────────────────────────────┘
```

## 🔍 Metodologia da validação

Pra cada item "faltante", rodei queries SQL no banco DESTINO:

1. **Existência exata** via `pg_proc` (funcs) e `pg_class` (tables/views)
2. **Busca fuzzy** por nomes parecidos (LIKE wildcards, prefixos `fn_`, etc)
3. **Verificação de tipo** — tabela real vs view vs materialized view

## ✅ FALSAS ALARMES DESCOBERTAS

### Tables que existem como VIEWS (aliases legados)

| "Faltante" | Status real | Aponta para |
|---|---|---|
| `product_groups` | ✅ VIEW funcional | `product_similarity_groups` |
| `product_group_members` | ✅ VIEW funcional | `product_similarity_group_members` |

**Análise:** o time TI criou views de compat pra evitar quebrar o frontend depois do refactor `product_*` → `product_similarity_*`. **Boa prática!**

### Tables com possível rename

| "Faltante" | Substituto encontrado | Confiança |
|---|---|---|
| `product_components` | `product_kit_components` (tabela, 1.4 MB) | 🟡 MÉDIA — precisa validar colunas |

**Recomendação:** se o app está chamando `product_components`, ou (a) criar uma VIEW de compat (como fizeram com product_groups), ou (b) atualizar o código pra chamar `product_kit_components`.

## ❌ GAPS REAIS — 30 RPCs + 54 Tables

### 30 Functions REALMENTE faltando (sem substituto)

Todas listadas em [`CRITICAL_missing_rpcs.txt`](./CRITICAL_missing_rpcs.txt). Categorizadas:

| Subsistema | # | Functions |
|---|---|---|
| **Optimization Queue** | 5 | `claim_next_optimization`, `complete_optimization`, `enqueue_optimization`, `reset_optimization_queue`, `get_auto_test_job_status` |
| **Telemetry/Monitoring** | 5 | `check_telemetry_regression`, `record_dev_route_telemetry`, `record_platform_failure`, `get_platform_failure_metrics`, `lookup_request_id` |
| **Dashboard widgets** | 6 | `get_top_collected_products`, `get_top_compared_products`, `get_top_favorited_products`, `get_collections_weekly_count`, `get_favorites_weekly_count`, `get_user_recent_comparisons` |
| **Security/Audit logs** | 4 | `log_access_denied`, `log_rls_denial`, `log_user_logout`, `check_hardening_status` |
| **MCP Keys** | 1 | `can_grant_mcp_full` |
| **Connections config** | 4 | `get_connection_failure_window_minutes`, `set_connection_failure_window_minutes`, `get_connections_auto_test_interval`, `set_connections_auto_test_interval` |
| **Outros** | 5 | `execute_role_migration_batch`, `get_app_health_summary`, `get_bundle_suggestions`, `search_records_rerank`, `sync_external_connections_from_credentials` |

### 54 Tables REALMENTE faltando (sem substituto)

Lista em [`CRITICAL_missing_tables.txt`](./CRITICAL_missing_tables.txt) **menos** as 3 falsas alarmes acima. Categorizadas por subsistema:

| Subsistema | # | Tabelas representativas |
|---|---|---|
| **Magic Up** (marketing) | 3 | `magic_up_brand_kits`, `magic_up_campaigns`, `magic_up_generations` |
| **Kit Collaboration** | 4 | `kit_collaborators`, `kit_comments`, `kit_share_tokens`, `kit_variants` |
| **Collection Items v2** | 2 | `collection_items`, `collection_items_trash` |
| **MCP Keys system** | 2 | `mcp_api_keys`, `mcp_key_auto_revocations` |
| **Webhooks** | 2 | `outbound_webhooks`, `webhook_deliveries` |
| **Optimization** | 1 | `optimization_queue` |
| **Expert chat** | 2 | `expert_conversations`, `expert_messages` |
| **Mockup AI v2** | 3 | `mockup_drafts`, `mockup_prompt_configs`, `mockup_prompt_history` |
| **Cart/Seller** | 3 | `cart_templates`, `seller_cart_items`, `seller_carts` |
| **Security/Geofence** | 5 | `access_security_settings`, `geo_allowed_countries`, `hardening_health_snapshots`, `public_token_failures`, `rls_denial_log` |
| **Settings/Preferences** | 4 | `admin_settings`, `user_preferences`, `category_icons`, `ai_insights_cache` |
| **Role Migration** | 2 | `role_migration_batches`, `role_migration_items` |
| **Logs/Telemetry** | 7 | `ai_usage_events`, `connection_test_history`, `product_sync_logs`, `product_views`, `query_telemetry`, `request_rate_limits`, `search_analytics` |
| **External integrations** | 2 | `external_connections`, `art_file_attachments` |
| **Component system v1** | 2 | `component_media`, `product_component_locations` |
| **Org/Permissions** | 1 | `organization_members` |
| **Audit/History** | 2 | `ownership_audit_reports`, `saved_trends_views` |
| **Scheduled/Voice/Video** | 4 | `scheduled_reports`, `simulator_wizard_drafts`, `video_variant_links`, `voice_command_logs` |
| **Comparison/Pricing** | 3 | `user_comparisons`, `favorite_item_reactions`, `product_price_freshness_overrides` |
| **Wait, total real:**  | **54** | — |

## 🚨 Estado provável da PRODUÇÃO

Toda chamada do app a essas 30 RPCs e 54 tables provavelmente está retornando:

- **Para RPCs:** HTTP 404 com `{"code": "PGRST202", "details": "Searched for the function..."}`
- **Para tables (.from()):** HTTP 404 com `relation "public.X" does not exist`

Como o app usa `.then((data, error) => ...)` em chamadas Supabase, esses erros são tratados como **valores nulos** — o widget/feature simplesmente **não carrega**, sem alarme nenhum pro usuário.

### Impacto user-facing estimado

- 🔴 Dashboard widgets vazios (`get_top_*_products`, weekly counts)
- 🔴 Optimization queue inerte (`enqueue/claim/complete_optimization`)
- 🔴 Security logs perdidos (`log_access_denied`, `log_rls_denial`, `log_user_logout`)
- 🔴 Collections/Kits sem persistência (`collection_items`, `kit_*`)
- 🔴 Webhooks outbound não disparam (`outbound_webhooks`, `webhook_deliveries`)
- 🟡 Magic Up provavelmente nem aparece na UI (descontinuado?)
- 🟡 Voice commands silenciosamente quebrados

## 🎯 Recomendação consolidada para Fase C

### 🔴 PRIORIDADE 1 — Patches imediatos (impacto direto no usuário)

1. **Dashboard widgets** (6 RPCs) — usuário VÊ widgets vazios
2. **Optimization Queue** (5 RPCs + 1 table) — pipeline operacional travada
3. **Collection Items v2** (4 tables) — feature visível ao usuário
4. **Kit Collaboration** (4 tables) — feature visível ao usuário

### 🟡 PRIORIDADE 2 — Patches importantes (operacional/compliance)

5. **Security/Audit logs** (4 RPCs + 5 tables) — compliance + forense
6. **Webhooks outbound** (2 tables) — integrações externas quebradas
7. **MCP Keys system** (1 RPC + 2 tables) — feature de API keys
8. **Connections config** (4 RPCs) — settings de Hub de Conexões

### 🟢 PRIORIDADE 3 — Decisão estratégica (descartar ou refatorar)

9. **Magic Up** (3 tables) — feature descontinuada?
10. **Expert chat** (2 tables) — feature descontinuada?
11. **Voice commands** (1 table) — feature descontinuada?
12. **Role migration** (1 RPC + 2 tables) — refactor pontual?

## 🔍 Próximos passos

### ⏳ Aguardando do sponsor:
- **Token Auth do GlitchTip** (Frente A) — pra confirmar via erros frontend qual desses gaps está sendo HIT por usuários reais e com qual frequência

### ✅ Pronto pra continuar (sem bloqueio):
- **Fase C** — Decisão por subsistema (sponsor classifica prioridades acima → 🔴/🟡/🟢 → DESCARTAR/RESGATAR/REFATORAR)
- **Fase D** — Patches cirúrgicos do que ficar como 🔴 RESGATAR

## 📂 Arquivos relacionados

```
recovery/audit/
├── rpcs_used_in_app.txt          (36 RPCs)
├── tables_used_in_app.txt        (116 tables)
├── _missing_functions.txt        (137 do dump)
├── _missing_tables.txt           (95 do dump)
├── CRITICAL_missing_rpcs.txt     (30 USADAS+FALTANTES)
├── CRITICAL_missing_tables.txt   (57 USADAS+FALTANTES — sendo 3 falsas alarmes = 54 reais)
├── CRITICAL_rpcs_locations.txt   (linha+arquivo de cada RPC chamada)
└── GAP_CLASSIFICATION.md         ⭐ ESTE arquivo
```

---

**🫡 Fase B fechada (lado banco). Aguardando token GlitchTip pra fechar lado frontend.**
