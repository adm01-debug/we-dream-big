-- T28: Add primary keys to tables missing them + indexes on unindexed FKs
-- Advisor targets: no_primary_key = 0, unindexed_foreign_keys = 0

-- ═══════════════════════════════════════════════════════════════
-- PART 1 — PRIMARY KEYS (33 tables)
-- Strategy: tables with natural composite key get composite PK;
--           others get surrogate UUID column id.
-- ═══════════════════════════════════════════════════════════════

-- Reaction tables have surrogate id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'collection_item_reactions_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.collection_item_reactions
  ADD CONSTRAINT collection_item_reactions_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'comparison_reactions_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.comparison_reactions
  ADD CONSTRAINT comparison_reactions_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- Tables with clear single-column PK candidates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_templates_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.cart_templates
  ADD CONSTRAINT cart_templates_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversation_audit_logs_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.conversation_audit_logs
  ADD CONSTRAINT conversation_audit_logs_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversation_delivery_status_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.conversation_delivery_status
  ADD CONSTRAINT conversation_delivery_status_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'conversation_event_history_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.conversation_event_history
  ADD CONSTRAINT conversation_event_history_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expert_conversations_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.expert_conversations
  ADD CONSTRAINT expert_conversations_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'expert_messages_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.expert_messages
  ADD CONSTRAINT expert_messages_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'follow_up_reminders_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.follow_up_reminders
  ADD CONSTRAINT follow_up_reminders_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mockup_drafts_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.mockup_drafts
  ADD CONSTRAINT mockup_drafts_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mockup_prompt_configs_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.mockup_prompt_configs
  ADD CONSTRAINT mockup_prompt_configs_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mockup_prompt_history_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.mockup_prompt_history
  ADD CONSTRAINT mockup_prompt_history_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'order_item_personalizations_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.order_item_personalizations
  ADD CONSTRAINT order_item_personalizations_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ownership_audit_reports_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.ownership_audit_reports
  ADD CONSTRAINT ownership_audit_reports_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ownership_repair_logs_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.ownership_repair_logs
  ADD CONSTRAINT ownership_repair_logs_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'product_views_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.product_views
  ADD CONSTRAINT product_views_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'public_token_failures_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.public_token_failures
  ADD CONSTRAINT public_token_failures_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quote_drafts_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.quote_drafts
  ADD CONSTRAINT quote_drafts_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recently_viewed_products_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.recently_viewed_products
  ADD CONSTRAINT recently_viewed_products_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'request_rate_limits_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.request_rate_limits
  ADD CONSTRAINT request_rate_limits_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_migration_batches_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.role_migration_batches
  ADD CONSTRAINT role_migration_batches_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'role_migration_items_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.role_migration_items
  ADD CONSTRAINT role_migration_items_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saved_trends_views_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.saved_trends_views
  ADD CONSTRAINT saved_trends_views_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scheduled_reports_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.scheduled_reports
  ADD CONSTRAINT scheduled_reports_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'search_analytics_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.search_analytics
  ADD CONSTRAINT search_analytics_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seller_cart_items_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.seller_cart_items
  ADD CONSTRAINT seller_cart_items_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seller_carts_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.seller_carts
  ADD CONSTRAINT seller_carts_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'simulator_wizard_drafts_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.simulator_wizard_drafts
  ADD CONSTRAINT simulator_wizard_drafts_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'step_up_challenges_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.step_up_challenges
  ADD CONSTRAINT step_up_challenges_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'step_up_tokens_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.step_up_tokens
  ADD CONSTRAINT step_up_tokens_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_preferences_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.user_preferences
  ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_search_history_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.user_search_history
  ADD CONSTRAINT user_search_history_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'video_variant_links_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.video_variant_links
  ADD CONSTRAINT video_variant_links_pkey PRIMARY KEY (id);
  END IF;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- PART 2 — INDEXES ON UNINDEXED FOREIGN KEYS (13 FKs)
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ai_routing_decisions_final_model_id
    ON public.ai_routing_decisions (final_model_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ai_routing_decisions_final_provider_id
    ON public.ai_routing_decisions (final_provider_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_attribute_equivalences_organization_id
    ON public.attribute_equivalences (organization_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_product_commemorative_dates_category_id
    ON public.product_commemorative_dates (category_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_product_target_audiences_category_id
    ON public.product_target_audiences (category_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_product_videos_organization_id
    ON public.product_videos (organization_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_quote_comments_quote_id
    ON public.quote_comments (quote_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_scraper_images_staging_product_id
    ON public.scraper_images_staging (product_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_stock_daily_summary_variant_id
    ON public.stock_daily_summary (variant_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_stock_snapshots_variant_id
    ON public.stock_snapshots (variant_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_supplier_attribute_definitions_organization_id
    ON public.supplier_attribute_definitions (organization_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_supplier_property_mappings_supplier_id
    ON public.supplier_property_mappings (supplier_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_target_audiences_organization_id
    ON public.target_audiences (organization_id);
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
