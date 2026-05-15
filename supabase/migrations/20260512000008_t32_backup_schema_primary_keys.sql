-- T32: Add primary keys to 12 backup schema tables lacking them
-- Note: backup tables only exist in production (moved there by t16/20260512201600).
-- In a fresh preview DB they don't exist yet, so all operations are guarded with IF EXISTS.

DO $$
BEGIN
  -- ── Tables with existing id column ─────────────────────────────────────────

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_20260425_tabela_preco_gravacao_oficial_faixa')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_20260425_tabela_preco_gravacao_oficial_faixa' AND c.contype='p') THEN
    ALTER TABLE backup._backup_20260425_tabela_preco_gravacao_oficial_faixa
      ADD CONSTRAINT backup_tabela_preco_faixa_pkey PRIMARY KEY (id);
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_collection_products_b2b_20260511')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_collection_products_b2b_20260511' AND c.contype='p') THEN
    ALTER TABLE backup._backup_collection_products_b2b_20260511
      ADD CONSTRAINT backup_collection_products_b2b_pkey PRIMARY KEY (id);
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_collections_b2b_20260511')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_collections_b2b_20260511' AND c.contype='p') THEN
    ALTER TABLE backup._backup_collections_b2b_20260511
      ADD CONSTRAINT backup_collections_b2b_pkey PRIMARY KEY (id);
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_storage_buckets_20260511_d11')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_storage_buckets_20260511_d11' AND c.contype='p') THEN
    ALTER TABLE backup._backup_storage_buckets_20260511_d11
      ADD CONSTRAINT backup_storage_buckets_d11_pkey PRIMARY KEY (id);
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_system_settings_legacy_20260511')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_system_settings_legacy_20260511' AND c.contype='p') THEN
    ALTER TABLE backup._backup_system_settings_legacy_20260511
      ADD CONSTRAINT backup_system_settings_legacy_pkey PRIMARY KEY (id);
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_unif_setup_fatmin_20260425')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_unif_setup_fatmin_20260425' AND c.contype='p') THEN
    ALTER TABLE backup._backup_unif_setup_fatmin_20260425
      ADD CONSTRAINT backup_unif_setup_fatmin_pkey PRIMARY KEY (id);
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_unif_setup_fatmin_faixa_20260425')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_unif_setup_fatmin_faixa_20260425' AND c.contype='p') THEN
    ALTER TABLE backup._backup_unif_setup_fatmin_faixa_20260425
      ADD CONSTRAINT backup_unif_setup_fatmin_faixa_pkey PRIMARY KEY (id);
  END IF;

  -- ── Natural key ─────────────────────────────────────────────────────────────

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_20260425_tecnicas_gravacao')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_20260425_tecnicas_gravacao' AND c.contype='p') THEN
    ALTER TABLE backup._backup_20260425_tecnicas_gravacao
      ADD CONSTRAINT backup_tecnicas_gravacao_pkey PRIMARY KEY (codigo);
  END IF;

  -- ── Surrogate id (no unique natural key) ────────────────────────────────────

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_collections_policies_b2b_20260511')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_collections_policies_b2b_20260511' AND c.contype='p') THEN
    ALTER TABLE backup._backup_collections_policies_b2b_20260511
      ADD COLUMN IF NOT EXISTS id bigserial PRIMARY KEY;
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_functions_d12')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_functions_d12' AND c.contype='p') THEN
    ALTER TABLE backup._backup_functions_d12
      ADD COLUMN IF NOT EXISTS id bigserial PRIMARY KEY;
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_storage_policies_20260511_d11')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_storage_policies_20260511_d11' AND c.contype='p') THEN
    ALTER TABLE backup._backup_storage_policies_20260511_d11
      ADD COLUMN IF NOT EXISTS id bigserial PRIMARY KEY;
  END IF;

  IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='backup' AND tablename='_backup_unif_funcoes_20260425')
     AND NOT EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class cl ON c.conrelid=cl.oid JOIN pg_namespace n ON cl.relnamespace=n.oid WHERE n.nspname='backup' AND cl.relname='_backup_unif_funcoes_20260425' AND c.contype='p') THEN
    ALTER TABLE backup._backup_unif_funcoes_20260425
      ADD COLUMN IF NOT EXISTS id bigserial PRIMARY KEY;
  END IF;

END $$;
