-- ════════════════════════════════════════════════════════════════════════════
-- SCRIPT DE INTROSPECÇÃO DO BANCO ANTIGO (LOVABLE)
-- ────────────────────────────────────────────────────────────────────────────
-- Banco alvo: nmojwpihnslkssljowjh.supabase.co (Lovable original)
-- Objetivo:    Extrair estrutura COMPLETA das 64 tabelas faltantes
-- Modo:        100% READ-ONLY (SELECT apenas, zero modificação)
-- Tempo esperado: 5-15 segundos no total
-- ────────────────────────────────────────────────────────────────────────────
--
-- 📋 COMO RODAR:
-- 1. Abre: https://supabase.com/dashboard/project/nmojwpihnslkssljowjh/sql/new
-- 2. Cola o conteúdo deste arquivo INTEIRO no editor
-- 3. Clica em "RUN" (ou Ctrl+Enter)
-- 4. Vai aparecer 4 resultados (um por bloco QUERY-N)
-- 5. Pra cada resultado: clica no payload JSON e copia
--    OU clica em "Download CSV/JSON" no canto superior direito do resultado
-- 6. Cola os 4 JSONs aqui na conversa (pode ser em ordem)
--
-- 🛡️ SEGURANÇA: este script só FAZ SELECT em pg_catalog e information_schema.
-- Não modifica dados, schema, policies, ou nada. Pode rodar à vontade.
-- ════════════════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════════════════
-- 🔍 QUERY 1 — INVENTÁRIO + COLUNAS + COMENTÁRIOS
-- ════════════════════════════════════════════════════════════════════════════
-- Pra cada uma das 64 tabelas alvo, retorna:
--   - Se existe no banco
--   - Comentário da tabela
--   - Se RLS está habilitado
--   - Tamanho em bytes
--   - TODAS as colunas (nome, tipo, NOT NULL, default, comentário)
-- ════════════════════════════════════════════════════════════════════════════

WITH
target_tables AS (
  SELECT unnest(ARRAY[
    -- Críticas (8)
    'seller_carts', 'seller_cart_items', 'cart_templates',
    'expert_conversations', 'expert_messages',
    'kit_variants', 'kit_collaborators', 'kit_comments',
    -- Magic Up + AI (6)
    'magic_up_generations', 'magic_up_brand_kits', 'magic_up_campaigns',
    'ai_insights_cache', 'ai_usage_events', 'voice_command_logs',
    -- User & preferências (5)
    'user_preferences', 'user_comparisons', 'user_allowed_ips',
    'user_known_devices', 'password_reset_requests',
    -- Coleções e kits (4)
    'collection_items', 'collection_items_trash',
    'kit_share_tokens', 'favorite_item_reactions',
    -- Mockups (3)
    'mockup_prompt_configs', 'mockup_prompt_history', 'mockup_drafts',
    -- Conexões e webhooks (6)
    'external_connections', 'mcp_api_keys', 'mcp_key_auto_revocations',
    'webhook_deliveries', 'outbound_webhooks', 'connection_test_history',
    -- Bitrix + integrações (2)
    'bitrix_clients', 'simulator_wizard_drafts',
    -- Produtos e analytics (8)
    'product_views', 'product_components', 'product_component_locations',
    'product_price_freshness_overrides', 'product_sync_logs',
    'search_analytics', 'saved_trends_views', 'category_icons',
    -- Segurança (8)
    'access_blocked_log', 'access_security_settings',
    'city_whitelist', 'ip_whitelist', 'geo_allowed_countries',
    'security_settings', 'admin_settings', 'public_token_failures',
    -- Auditoria e telemetria (6)
    'art_file_attachments', 'component_media',
    'optimization_queue', 'personalization_simulations',
    'query_telemetry', 'request_rate_limits',
    -- Organizações (2)
    'organization_members', 'video_variant_links',
    -- Hardening + roles (4)
    'hardening_health_snapshots', 'ownership_audit_reports',
    'rls_denial_log', 'role_migration_batches',
    -- Reports + role_migration (2)
    'role_migration_items', 'scheduled_reports'
  ]) AS tname
),
existing AS (
  SELECT t.tname, c.oid
  FROM target_tables t
  JOIN pg_class c ON c.relname = t.tname AND c.relkind IN ('r','p')
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
),
columns_data AS (
  SELECT
    e.tname,
    jsonb_agg(
      jsonb_build_object(
        'name', a.attname,
        'type', format_type(a.atttypid, a.atttypmod),
        'not_null', a.attnotnull,
        'default', pg_get_expr(d.adbin, d.adrelid),
        'position', a.attnum,
        'comment', col_description(e.oid, a.attnum::int),
        'is_generated', a.attgenerated <> '',
        'identity', a.attidentity
      )
      ORDER BY a.attnum
    ) AS cols
  FROM existing e
  JOIN pg_attribute a ON a.attrelid = e.oid AND a.attnum > 0 AND NOT a.attisdropped
  LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
  GROUP BY e.tname
)
SELECT jsonb_pretty(jsonb_build_object(
  'query', 1,
  'titulo', 'inventario_e_colunas',
  'meta', jsonb_build_object(
    'banco', current_database(),
    'pg_version', version(),
    'gerado_em', now()::text,
    'total_alvo', (SELECT count(*) FROM target_tables),
    'total_encontradas', (SELECT count(*) FROM existing),
    'total_faltantes', (SELECT count(*) FROM target_tables) - (SELECT count(*) FROM existing)
  ),
  'tabelas_encontradas', (
    SELECT jsonb_object_agg(e.tname, jsonb_build_object(
      'oid', e.oid::text,
      'comment', obj_description(e.oid, 'pg_class'),
      'rls_enabled', (SELECT relrowsecurity FROM pg_class WHERE oid = e.oid),
      'rls_forced',  (SELECT relforcerowsecurity FROM pg_class WHERE oid = e.oid),
      'total_bytes', pg_total_relation_size(e.oid),
      'estimated_rows', (SELECT reltuples::bigint FROM pg_class WHERE oid = e.oid),
      'columns', COALESCE(cd.cols, '[]'::jsonb)
    ) ORDER BY e.tname)
    FROM existing e
    LEFT JOIN columns_data cd ON cd.tname = e.tname
  ),
  'tabelas_faltantes', (
    SELECT jsonb_agg(t.tname ORDER BY t.tname)
    FROM target_tables t
    WHERE NOT EXISTS (SELECT 1 FROM existing e WHERE e.tname = t.tname)
  )
)) AS payload_query_1;


-- ════════════════════════════════════════════════════════════════════════════
-- 🔍 QUERY 2 — CONSTRAINTS + INDEXES + FOREIGN KEYS
-- ════════════════════════════════════════════════════════════════════════════
-- Pra cada tabela: PRIMARY KEY, UNIQUE, CHECK, FK (com tabela referenciada),
-- e todos os indexes (com nome, definição e se é parcial).
-- ════════════════════════════════════════════════════════════════════════════

WITH
target_tables AS (
  SELECT unnest(ARRAY[
    'seller_carts','seller_cart_items','cart_templates','expert_conversations',
    'expert_messages','kit_variants','kit_collaborators','kit_comments',
    'magic_up_generations','magic_up_brand_kits','magic_up_campaigns',
    'ai_insights_cache','ai_usage_events','voice_command_logs',
    'user_preferences','user_comparisons','user_allowed_ips',
    'user_known_devices','password_reset_requests',
    'collection_items','collection_items_trash','kit_share_tokens',
    'favorite_item_reactions','mockup_prompt_configs','mockup_prompt_history',
    'mockup_drafts','external_connections','mcp_api_keys',
    'mcp_key_auto_revocations','webhook_deliveries','outbound_webhooks',
    'connection_test_history','bitrix_clients','simulator_wizard_drafts',
    'product_views','product_components','product_component_locations',
    'product_price_freshness_overrides','product_sync_logs','search_analytics',
    'saved_trends_views','category_icons','access_blocked_log',
    'access_security_settings','city_whitelist','ip_whitelist',
    'geo_allowed_countries','security_settings','admin_settings',
    'public_token_failures','art_file_attachments','component_media',
    'optimization_queue','personalization_simulations','query_telemetry',
    'request_rate_limits','organization_members','video_variant_links',
    'hardening_health_snapshots','ownership_audit_reports','rls_denial_log',
    'role_migration_batches','role_migration_items','scheduled_reports'
  ]) AS tname
),
existing AS (
  SELECT t.tname, c.oid
  FROM target_tables t
  JOIN pg_class c ON c.relname = t.tname AND c.relkind IN ('r','p')
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
),
cons AS (
  SELECT
    e.tname,
    jsonb_agg(
      jsonb_build_object(
        'name', c.conname,
        'type', CASE c.contype
                  WHEN 'p' THEN 'PRIMARY KEY'
                  WHEN 'u' THEN 'UNIQUE'
                  WHEN 'f' THEN 'FOREIGN KEY'
                  WHEN 'c' THEN 'CHECK'
                  WHEN 'x' THEN 'EXCLUDE'
                  ELSE c.contype::text END,
        'definition', pg_get_constraintdef(c.oid),
        'fk_target', CASE WHEN c.contype = 'f'
                          THEN (SELECT relname FROM pg_class WHERE oid = c.confrelid)::text
                          ELSE NULL END,
        'on_delete', CASE c.confdeltype
                       WHEN 'a' THEN 'NO ACTION'
                       WHEN 'r' THEN 'RESTRICT'
                       WHEN 'c' THEN 'CASCADE'
                       WHEN 'n' THEN 'SET NULL'
                       WHEN 'd' THEN 'SET DEFAULT'
                       ELSE NULL END
      )
      ORDER BY c.contype, c.conname
    ) AS constraints
  FROM existing e
  JOIN pg_constraint c ON c.conrelid = e.oid
  GROUP BY e.tname
),
idx AS (
  SELECT
    e.tname,
    jsonb_agg(
      jsonb_build_object(
        'name', idx_cls.relname,
        'definition', pg_get_indexdef(i.indexrelid),
        'is_unique', i.indisunique,
        'is_primary', i.indisprimary,
        'is_partial', i.indpred IS NOT NULL
      )
      ORDER BY idx_cls.relname
    ) AS indexes
  FROM existing e
  JOIN pg_index i ON i.indrelid = e.oid
  JOIN pg_class idx_cls ON idx_cls.oid = i.indexrelid
  GROUP BY e.tname
)
SELECT jsonb_pretty(jsonb_build_object(
  'query', 2,
  'titulo', 'constraints_e_indexes',
  'gerado_em', now()::text,
  'dados', (
    SELECT jsonb_object_agg(e.tname, jsonb_build_object(
      'constraints', COALESCE(c.constraints, '[]'::jsonb),
      'indexes',     COALESCE(i.indexes,     '[]'::jsonb)
    ) ORDER BY e.tname)
    FROM existing e
    LEFT JOIN cons c ON c.tname = e.tname
    LEFT JOIN idx  i ON i.tname = e.tname
  )
)) AS payload_query_2;


-- ════════════════════════════════════════════════════════════════════════════
-- 🔍 QUERY 3 — POLICIES RLS
-- ════════════════════════════════════════════════════════════════════════════
-- Pra cada tabela: todas as policies RLS com USING, WITH CHECK,
-- comando (SELECT/INSERT/UPDATE/DELETE/ALL) e roles.
-- ════════════════════════════════════════════════════════════════════════════

WITH
target_tables AS (
  SELECT unnest(ARRAY[
    'seller_carts','seller_cart_items','cart_templates','expert_conversations',
    'expert_messages','kit_variants','kit_collaborators','kit_comments',
    'magic_up_generations','magic_up_brand_kits','magic_up_campaigns',
    'ai_insights_cache','ai_usage_events','voice_command_logs',
    'user_preferences','user_comparisons','user_allowed_ips',
    'user_known_devices','password_reset_requests',
    'collection_items','collection_items_trash','kit_share_tokens',
    'favorite_item_reactions','mockup_prompt_configs','mockup_prompt_history',
    'mockup_drafts','external_connections','mcp_api_keys',
    'mcp_key_auto_revocations','webhook_deliveries','outbound_webhooks',
    'connection_test_history','bitrix_clients','simulator_wizard_drafts',
    'product_views','product_components','product_component_locations',
    'product_price_freshness_overrides','product_sync_logs','search_analytics',
    'saved_trends_views','category_icons','access_blocked_log',
    'access_security_settings','city_whitelist','ip_whitelist',
    'geo_allowed_countries','security_settings','admin_settings',
    'public_token_failures','art_file_attachments','component_media',
    'optimization_queue','personalization_simulations','query_telemetry',
    'request_rate_limits','organization_members','video_variant_links',
    'hardening_health_snapshots','ownership_audit_reports','rls_denial_log',
    'role_migration_batches','role_migration_items','scheduled_reports'
  ]) AS tname
),
existing AS (
  SELECT t.tname, c.oid
  FROM target_tables t
  JOIN pg_class c ON c.relname = t.tname AND c.relkind IN ('r','p')
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
),
policies_data AS (
  SELECT
    e.tname,
    jsonb_agg(
      jsonb_build_object(
        'name', p.polname,
        'cmd',  CASE p.polcmd
                  WHEN 'r' THEN 'SELECT'
                  WHEN 'a' THEN 'INSERT'
                  WHEN 'w' THEN 'UPDATE'
                  WHEN 'd' THEN 'DELETE'
                  WHEN '*' THEN 'ALL'
                  ELSE p.polcmd::text END,
        'permissive', p.polpermissive,
        'roles', (
          SELECT array_agg(CASE WHEN r.rolname IS NULL THEN 'public' ELSE r.rolname::text END)
          FROM unnest(p.polroles) AS roleoid
          LEFT JOIN pg_roles r ON r.oid = roleoid
        ),
        'using',      pg_get_expr(p.polqual,      p.polrelid),
        'with_check', pg_get_expr(p.polwithcheck, p.polrelid)
      )
      ORDER BY p.polname
    ) AS policies
  FROM existing e
  JOIN pg_policy p ON p.polrelid = e.oid
  GROUP BY e.tname
)
SELECT jsonb_pretty(jsonb_build_object(
  'query', 3,
  'titulo', 'policies_rls',
  'gerado_em', now()::text,
  'total_tabelas_com_policies', (SELECT count(*) FROM policies_data),
  'policies_por_tabela', (
    SELECT jsonb_object_agg(tname, policies ORDER BY tname)
    FROM policies_data
  )
)) AS payload_query_3;


-- ════════════════════════════════════════════════════════════════════════════
-- 🔍 QUERY 4 — TRIGGERS + FUNCTIONS + ENUMS
-- ════════════════════════════════════════════════════════════════════════════
-- Pra cada tabela: triggers com nomes da function que dispara.
-- Pra cada function referenciada: body completo (CREATE OR REPLACE).
-- Mais: enums customizados usados pelas colunas das tabelas alvo.
-- ════════════════════════════════════════════════════════════════════════════

WITH
target_tables AS (
  SELECT unnest(ARRAY[
    'seller_carts','seller_cart_items','cart_templates','expert_conversations',
    'expert_messages','kit_variants','kit_collaborators','kit_comments',
    'magic_up_generations','magic_up_brand_kits','magic_up_campaigns',
    'ai_insights_cache','ai_usage_events','voice_command_logs',
    'user_preferences','user_comparisons','user_allowed_ips',
    'user_known_devices','password_reset_requests',
    'collection_items','collection_items_trash','kit_share_tokens',
    'favorite_item_reactions','mockup_prompt_configs','mockup_prompt_history',
    'mockup_drafts','external_connections','mcp_api_keys',
    'mcp_key_auto_revocations','webhook_deliveries','outbound_webhooks',
    'connection_test_history','bitrix_clients','simulator_wizard_drafts',
    'product_views','product_components','product_component_locations',
    'product_price_freshness_overrides','product_sync_logs','search_analytics',
    'saved_trends_views','category_icons','access_blocked_log',
    'access_security_settings','city_whitelist','ip_whitelist',
    'geo_allowed_countries','security_settings','admin_settings',
    'public_token_failures','art_file_attachments','component_media',
    'optimization_queue','personalization_simulations','query_telemetry',
    'request_rate_limits','organization_members','video_variant_links',
    'hardening_health_snapshots','ownership_audit_reports','rls_denial_log',
    'role_migration_batches','role_migration_items','scheduled_reports'
  ]) AS tname
),
existing AS (
  SELECT t.tname, c.oid
  FROM target_tables t
  JOIN pg_class c ON c.relname = t.tname AND c.relkind IN ('r','p')
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
),
triggers_data AS (
  SELECT
    e.tname,
    jsonb_agg(
      jsonb_build_object(
        'name', t.tgname,
        'function_oid', p.oid::text,
        'function_name', p.proname,
        'function_namespace', n.nspname,
        'definition', pg_get_triggerdef(t.oid)
      )
      ORDER BY t.tgname
    ) AS triggers,
    array_agg(DISTINCT p.oid) AS function_oids
  FROM existing e
  JOIN pg_trigger t ON t.tgrelid = e.oid AND NOT t.tgisinternal
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_namespace n ON n.oid = p.pronamespace
  GROUP BY e.tname
),
all_function_oids AS (
  SELECT DISTINCT unnest(function_oids) AS oid FROM triggers_data
),
functions_body AS (
  SELECT
    p.oid::text AS oid,
    p.proname AS name,
    n.nspname AS namespace,
    pg_get_functiondef(p.oid) AS definition
  FROM all_function_oids afo
  JOIN pg_proc p ON p.oid = afo.oid
  JOIN pg_namespace n ON n.oid = p.pronamespace
),
used_types AS (
  SELECT DISTINCT a.atttypid AS oid
  FROM existing e
  JOIN pg_attribute a ON a.attrelid = e.oid AND a.attnum > 0 AND NOT a.attisdropped
),
enums_used AS (
  SELECT
    t.typname AS name,
    n.nspname AS namespace,
    array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
  FROM used_types ut
  JOIN pg_type t ON t.oid = ut.oid AND t.typtype = 'e'
  JOIN pg_namespace n ON n.oid = t.typnamespace
  JOIN pg_enum e ON e.enumtypid = t.oid
  GROUP BY t.typname, n.nspname
)
SELECT jsonb_pretty(jsonb_build_object(
  'query', 4,
  'titulo', 'triggers_functions_enums',
  'gerado_em', now()::text,
  'triggers_por_tabela', (
    SELECT jsonb_object_agg(tname, triggers ORDER BY tname)
    FROM triggers_data
  ),
  'function_bodies', (
    SELECT jsonb_object_agg(name, jsonb_build_object(
      'namespace', namespace,
      'oid', oid,
      'definition', definition
    ))
    FROM functions_body
  ),
  'enums_customizados', (
    SELECT jsonb_object_agg(name, jsonb_build_object(
      'namespace', namespace,
      'values', values
    ))
    FROM enums_used
  )
)) AS payload_query_4;


-- ════════════════════════════════════════════════════════════════════════════
-- ✅ FIM DO SCRIPT — 4 PAYLOADS GERADOS
-- Cada payload é um JSON estruturado. Cole os 4 aqui na conversa.
-- ════════════════════════════════════════════════════════════════════════════
