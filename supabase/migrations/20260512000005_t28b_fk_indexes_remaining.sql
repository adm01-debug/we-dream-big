-- T28b: Add indexes for remaining 30 unindexed foreign keys
-- Continuation of T28 (20260512000003) — covers FKs missed in first pass.
-- Advisor target: unindexed_foreign_keys = 0

-- public schema
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ai_function_routing_updated_by
    ON public.ai_function_routing (updated_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ai_providers_created_by
    ON public.ai_providers (created_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ai_providers_updated_by
    ON public.ai_providers (updated_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_attribute_equivalences_supplier_attribute_id
    ON public.attribute_equivalences (supplier_attribute_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_b2b_collections_created_by
    ON public.b2b_collections (created_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_categories_created_by
    ON public.categories (created_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_categories_updated_by
    ON public.categories (updated_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_category_colors_color_group_id
    ON public.category_colors (color_group_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_color_equivalences_promo_nuance_id
    ON public.color_equivalences (promo_nuance_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_color_equivalences_promo_variation_id
    ON public.color_equivalences (promo_variation_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_color_variations_group_id
    ON public.color_variations (group_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_inbound_webhook_endpoints_created_by
    ON public.inbound_webhook_endpoints (created_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_integration_credentials_created_by
    ON public.integration_credentials (created_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_integration_credentials_updated_by
    ON public.integration_credentials (updated_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ip_access_control_created_by
    ON public.ip_access_control (created_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_product_properties_property_definition_id
    ON public.product_properties (property_definition_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_quote_comments_user_id
    ON public.quote_comments (user_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_quote_items_product_id
    ON public.quote_items (product_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_quote_templates_created_by
    ON public.quote_templates (created_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_quote_versions_created_by
    ON public.quote_versions (created_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_quotes_assigned_to
    ON public.quotes (assigned_to);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_code
    ON public.role_permissions (permission_code);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_seller_discount_limits_set_by
    ON public.seller_discount_limits (set_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_supplier_category_mappings_category_id
    ON public.supplier_category_mappings (category_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_supplier_field_priority_supplier_id
    ON public.supplier_field_priority (supplier_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_favorites_product_id
    ON public.user_favorites (product_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_user_roles_granted_by
    ON public.user_roles (granted_by);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_variation_values_variation_type_id
    ON public.variation_values (variation_type_id);
EXCEPTION WHEN undefined_table OR undefined_column THEN NULL;
END $$;

-- supplier_stricker schema
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ss_category_mappings_category_id
    ON supplier_stricker.category_mappings (category_id);
EXCEPTION WHEN undefined_table OR undefined_column OR invalid_schema_name THEN NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_ss_stg_product_types_mapped_to_category_id
    ON supplier_stricker.stg_product_types (mapped_to_category_id);
EXCEPTION WHEN undefined_table OR undefined_column OR invalid_schema_name THEN NULL;
END $$;
