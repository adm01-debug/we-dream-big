# Data Dictionary — Promo Gifts (Local Supabase)

> SSOT externos (catálogo, CRM) **não** aparecem aqui — ver ADR 0001.
> Tabelas locais: 63 · Última atualização: 2026-04-17

## Convenções
- Toda tabela tem `id UUID PK DEFAULT gen_random_uuid()`, `created_at`, `updated_at`
- `user_id UUID` referencia `auth.users` (sem FK)
- Tabelas com `version INTEGER` usam optimistic locking (trigger `increment_row_version`)

## Domínios

### 🔐 Auth & RBAC
| Tabela | Propósito | Colunas-chave |
|--------|-----------|---------------|
| `profiles` | Perfil do usuário | `user_id`, `email`, `full_name`, `role` (sync) |
| `user_roles` | Papéis (SSOT) | `user_id`, `role` (`admin`/`manager`/`vendedor`) |
| `permissions` | Catálogo de permissões | `code`, `category`, `name` |
| `login_attempts` | Auditoria de login | `email`, `ip_address`, `success`, `failure_reason` |
| `admin_audit_log` | Trilha de ações admin | `action`, `resource_type`, `resource_id`, `details` |
| `ip_access_control` | Allow/block list IP | `ip_address`, `list_type`, `expires_at` |

### 📋 Orçamentos & Pedidos
| Tabela | Propósito | Colunas-chave |
|--------|-----------|---------------|
| `quotes` | Orçamento principal | `quote_number`, `client_id`, `seller_id`, `status`, `subtotal`, `discount_percent`, `negotiation_markup_percent`, `real_subtotal`, `real_discount_percent`, `total`, `version` |
| `quote_items` | Itens do orçamento | `quote_id`, `product_id`, `quantity`, `unit_price`, `subtotal` |
| `quote_approval_tokens` | Token público + e-signature | `token`, `signer_document`, `signer_ip`, `signature_hash` |
| `quote_comments` | Comentários | `quote_id`, `parent_id`, `content` |
| `quote_history` | Auditoria de mudanças | `action`, `field_changed`, `old_value`, `new_value` |
| `discount_approval_requests` | Workflow alçada | `quote_id`, `seller_id`, `requested_discount_percent`, `max_allowed_percent`, `status` |
| `seller_discount_limits` | Limite por vendedor | `user_id`, `max_discount_percent` |
| `orders` | Pedido (quote convertido) | `order_number` (PED-YY-XXXX), `quote_id`, `fulfillment_status`, `version` |
| `order_items` | Itens do pedido | `order_id`, `product_id`, `quantity`, `unit_price` |

### 🎨 Kits & Mockups
| Tabela | Propósito |
|--------|-----------|
| `custom_kits` | Kits montados |
| `kit_share_tokens` | Compartilhamento público |
| `mockup_drafts` | Rascunhos do studio |
| `mockup_templates` | Templates favoritos |
| `mockup_prompt_configs` | Prompts versionados (IA) |
| `mockup_prompt_history` | Histórico de versões |
| `generated_mockups` | Mockups produzidos |
| `magic_up_generations` | Imagens publicitárias IA |
| `art_file_attachments` | Arquivos de arte (PDF/AI) |

### 📦 Produtos & Componentes (referências locais)
| Tabela | Propósito |
|--------|-----------|
| `product_components` | Componentes de produto multi-parte |
| `product_component_locations` | Áreas de personalização |
| `product_groups` / `product_group_members` | Agrupamentos lógicos |
| `component_media` | Mídia por componente |
| `category_icons` | Ícones por categoria |
| `cart_templates` | Templates de carrinho |
| `collections` / `collection_items` | Coleções privadas do vendedor |
| `product_views` | Telemetria de visualização |
| `product_sync_logs` | Logs de sync com SSOT externo |

### 🤖 IA & Conversational
| Tabela | Propósito |
|--------|-----------|
| `ai_usage_logs` | Log de chamadas (cost tracking) |
| `ai_usage_quotas` | Limite mensal por role |
| `expert_conversations` / `expert_messages` | Histórico do Flow |

### 🔔 Notificações & Telemetria
| Tabela | Propósito |
|--------|-----------|
| `workspace_notifications` | Inbox do vendedor |
| `query_telemetry` | Performance de queries |
| `bot_detection_log` | Anti-scraping |
| `request_rate_limits` | Throttling |

### 🏢 Multi-tenant (preparado, pouco usado)
| Tabela | Propósito |
|--------|-----------|
| `organizations` | Tenant |
| `organization_members` | Membros + role org |

## Funções de DB críticas
- `has_role(uuid, app_role)` — autorização
- `check_rate_limit(...)` — throttling
- `acquire_ai_quota(...)` — reserva slot IA com lock
- `validate_quote_real_discount()` — alçada via trigger
- `increment_row_version()` — optimistic locking
- `generate_quote_number()` / `generate_order_number()` — sequenciais por ano
- `get_industry_top_products(...)` / `get_client_top_products(...)` — analytics

## Triggers ativos relevantes
- `quotes` / `orders` → `increment_row_version` BEFORE UPDATE
- `quotes` → `validate_quote_real_discount` BEFORE INSERT/UPDATE
- `quotes` → `notify_quote_status_change` AFTER UPDATE
- `discount_approval_requests` → `notify_discount_approval_request` AFTER INSERT/UPDATE
- `quote_approval_tokens` → `generate_secure_token` BEFORE INSERT, `invalidate_used_approval_token` BEFORE UPDATE
- `auth.users` → `handle_new_user` AFTER INSERT (cria profile + role default)
