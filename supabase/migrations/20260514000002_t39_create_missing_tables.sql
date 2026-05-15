-- ============================================================
-- MIGRATION: t39 — Criar 12 tabelas ausentes no banco atual
-- Auditoria: tabelas existem nas migrations do repo mas não
-- foram aplicadas ao banco de produção (schema drift).
-- Todas defensivas: CREATE TABLE IF NOT EXISTS + políticas
-- protegidas por verificação em pg_policies.
-- Ordem respeita dependências de FK.
-- ============================================================

-- -------------------------------------------------------
-- 1. admin_settings
--    Hook: useRetestCooldownSetting.ts
--    Finalidade: preferências globais de admin (key/value)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id         UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key        TEXT        NOT NULL UNIQUE,
  value      JSONB       NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_settings' AND policyname='Admins can view admin_settings') THEN
    CREATE POLICY "Admins can view admin_settings"
      ON public.admin_settings FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_settings' AND policyname='Admins can insert admin_settings') THEN
    CREATE POLICY "Admins can insert admin_settings"
      ON public.admin_settings FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='admin_settings' AND policyname='Admins can update admin_settings') THEN
    CREATE POLICY "Admins can update admin_settings"
      ON public.admin_settings FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_admin_settings_updated_at') THEN
    CREATE TRIGGER update_admin_settings_updated_at
      BEFORE UPDATE ON public.admin_settings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -------------------------------------------------------
-- 2. category_icons
--    Hooks: useCategoryIcons.ts, useCategoriesTree.ts,
--           useGlobalSearch.ts
--    Finalidade: ícone visual por categoria na UI
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.category_icons (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_name TEXT        NOT NULL,
  icon          TEXT        NOT NULL,
  description   TEXT,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.category_icons ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Anyone can read category icons') THEN
    CREATE POLICY "Anyone can read category icons"
      ON public.category_icons FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Admins can insert category icons') THEN
    CREATE POLICY "Admins can insert category icons"
      ON public.category_icons FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Admins can update category icons') THEN
    CREATE POLICY "Admins can update category icons"
      ON public.category_icons FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='category_icons' AND policyname='Admins can delete category icons') THEN
    CREATE POLICY "Admins can delete category icons"
      ON public.category_icons FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- -------------------------------------------------------
-- 3. product_groups
--    Hooks: useProductGroups.ts, usePersonalizationManager.ts
--           external-db-config.ts (edge functions)
--    Finalidade: agrupamento de produtos com regras de
--    personalização compartilhadas
--    NOTA: views homônimas existiam como compat-aliases de
--    product_similarity_groups — sem dependentes, removidas.
-- -------------------------------------------------------
DO $$ BEGIN DROP VIEW IF EXISTS public.product_group_members;
EXCEPTION WHEN wrong_object_type THEN NULL; END $$;
DO $$ BEGIN DROP VIEW IF EXISTS public.product_groups;
EXCEPTION WHEN wrong_object_type THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.product_groups (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_code   TEXT        NOT NULL,
  group_name   TEXT        NOT NULL,
  description  TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_groups' AND policyname='Authenticated users can read groups') THEN
    CREATE POLICY "Authenticated users can read groups"
      ON public.product_groups FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_groups' AND policyname='Admins can manage groups') THEN
    CREATE POLICY "Admins can manage groups"
      ON public.product_groups FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- -------------------------------------------------------
-- 4. product_components
--    Hooks: usePersonalizationManager.ts,
--           usePersonalizationData.ts,
--           ProductPersonalizationManager.tsx,
--           useProdutoPersonalizacao.ts
--    Finalidade: componentes personalizáveis por produto
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_components (
  id                UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id        TEXT        NOT NULL,
  component_code    TEXT        NOT NULL,
  component_name    TEXT        NOT NULL,
  is_personalizable BOOLEAN     NOT NULL DEFAULT true,
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  sort_order        INTEGER     DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_components_product_id
  ON public.product_components (product_id);

ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_components' AND policyname='Authenticated users can read components') THEN
    CREATE POLICY "Authenticated users can read components"
      ON public.product_components FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_components' AND policyname='Admins can manage components') THEN
    CREATE POLICY "Admins can manage components"
      ON public.product_components FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_product_components_updated_at') THEN
    CREATE TRIGGER update_product_components_updated_at
      BEFORE UPDATE ON public.product_components
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -------------------------------------------------------
-- 5. product_group_members  (depende de product_groups)
--    Hooks: usePersonalizationManager.ts,
--           useProductGroups.ts, useSimilarProducts.ts,
--           GroupInheritance.tsx
--    Finalidade: membros de grupos de personalização
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_group_members (
  id               UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_group_id UUID        NOT NULL REFERENCES public.product_groups(id) ON DELETE CASCADE,
  product_id       TEXT        NOT NULL,
  use_group_rules  BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_group_members_product_group_id
  ON public.product_group_members (product_group_id);
CREATE INDEX IF NOT EXISTS idx_product_group_members_product_id
  ON public.product_group_members (product_id);

ALTER TABLE public.product_group_members ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_group_members' AND policyname='Authenticated users can read members') THEN
    CREATE POLICY "Authenticated users can read members"
      ON public.product_group_members FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_group_members' AND policyname='Admins can manage members') THEN
    CREATE POLICY "Admins can manage members"
      ON public.product_group_members FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- -------------------------------------------------------
-- 6. product_component_locations  (depende de product_components)
--    Hooks: usePersonalizationManager.ts,
--           usePersonalizationData.ts,
--           useProdutoPersonalizacao.ts
--    Finalidade: locais de gravação por componente.
--    ATENÇÃO: código tem fallback quando tabela não existe
--    (warn + return []) — sem ela a UI degrada silenciosamente.
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_component_locations (
  id             UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id   UUID         NOT NULL REFERENCES public.product_components(id) ON DELETE CASCADE,
  location_code  TEXT         NOT NULL,
  location_name  TEXT         NOT NULL,
  description    TEXT,
  max_width_cm   NUMERIC(6,2),
  max_height_cm  NUMERIC(6,2),
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  sort_order     INTEGER      DEFAULT 0,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (component_id, location_code)
);

CREATE INDEX IF NOT EXISTS idx_product_comp_loc_component
  ON public.product_component_locations (component_id);

ALTER TABLE public.product_component_locations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_component_locations' AND policyname='Authenticated view component locations') THEN
    CREATE POLICY "Authenticated view component locations"
      ON public.product_component_locations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_component_locations' AND policyname='Admins manage component locations') THEN
    CREATE POLICY "Admins manage component locations"
      ON public.product_component_locations FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_product_comp_loc_updated_at') THEN
    CREATE TRIGGER update_product_comp_loc_updated_at
      BEFORE UPDATE ON public.product_component_locations
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -------------------------------------------------------
-- 7. component_media
--    Hooks: useGlobalSearch.ts (.from("component_media"))
--    Finalidade: imagens/vídeos de componentes de kit,
--    exibidos na busca global
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('component-media', 'component-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.component_media (
  id           UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id TEXT        NOT NULL,
  product_id   TEXT        NOT NULL,
  media_type   TEXT        NOT NULL DEFAULT 'image'
                           CHECK (media_type IN ('image', 'video')),
  url          TEXT        NOT NULL,
  title        TEXT,
  sort_order   INTEGER     DEFAULT 0,
  is_cover     BOOLEAN     DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_component_media_component_id
  ON public.component_media (component_id);
CREATE INDEX IF NOT EXISTS idx_component_media_product_id
  ON public.component_media (product_id);

ALTER TABLE public.component_media ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='component_media' AND policyname='Authenticated users can read component media') THEN
    CREATE POLICY "Authenticated users can read component media"
      ON public.component_media FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='component_media' AND policyname='Admins can manage component media') THEN
    CREATE POLICY "Admins can manage component media"
      ON public.component_media FOR ALL TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Anyone can read component media') THEN
    CREATE POLICY "Anyone can read component media"
      ON storage.objects FOR SELECT TO public
      USING (bucket_id = 'component-media');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can upload component media') THEN
    CREATE POLICY "Admins can upload component media"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'component-media' AND public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can update component media') THEN
    CREATE POLICY "Admins can update component media"
      ON storage.objects FOR UPDATE TO authenticated
      USING (bucket_id = 'component-media' AND public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Admins can delete component media') THEN
    CREATE POLICY "Admins can delete component media"
      ON storage.objects FOR DELETE TO authenticated
      USING (bucket_id = 'component-media' AND public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- -------------------------------------------------------
-- 8. product_sync_logs
--    Finalidade: log de execuções de sync com fornecedores
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_sync_logs (
  id                 UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source             TEXT        NOT NULL,
  status             TEXT        NOT NULL DEFAULT 'pending',
  records_processed  INTEGER     NOT NULL DEFAULT 0,
  records_inserted   INTEGER     NOT NULL DEFAULT 0,
  records_updated    INTEGER     NOT NULL DEFAULT 0,
  records_failed     INTEGER     NOT NULL DEFAULT 0,
  duration_ms        INTEGER,
  payload            JSONB,
  error_message      TEXT,
  triggered_by       UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_sync_logs_created
  ON public.product_sync_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_sync_logs_source
  ON public.product_sync_logs (source, status);

ALTER TABLE public.product_sync_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_sync_logs' AND policyname='Admins view product sync logs') THEN
    CREATE POLICY "Admins view product sync logs"
      ON public.product_sync_logs FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_sync_logs' AND policyname='Admins insert product sync logs') THEN
    CREATE POLICY "Admins insert product sync logs"
      ON public.product_sync_logs FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- -------------------------------------------------------
-- 9. product_price_freshness_overrides
--    Finalidade: override de threshold de frescor de preço
--    por produto (30/60/90 dias)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_price_freshness_overrides (
  id             UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id     TEXT        NOT NULL UNIQUE,
  threshold_days INTEGER     NOT NULL CHECK (threshold_days IN (30, 60, 90)),
  updated_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pfo_product_id
  ON public.product_price_freshness_overrides (product_id);

ALTER TABLE public.product_price_freshness_overrides ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_price_freshness_overrides' AND policyname='Authenticated can read freshness overrides') THEN
    CREATE POLICY "Authenticated can read freshness overrides"
      ON public.product_price_freshness_overrides FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_price_freshness_overrides' AND policyname='Admins can insert freshness overrides') THEN
    CREATE POLICY "Admins can insert freshness overrides"
      ON public.product_price_freshness_overrides FOR INSERT TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_price_freshness_overrides' AND policyname='Admins can update freshness overrides') THEN
    CREATE POLICY "Admins can update freshness overrides"
      ON public.product_price_freshness_overrides FOR UPDATE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='product_price_freshness_overrides' AND policyname='Admins can delete freshness overrides') THEN
    CREATE POLICY "Admins can delete freshness overrides"
      ON public.product_price_freshness_overrides FOR DELETE TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_pfo_set_updated_at') THEN
    CREATE TRIGGER trg_pfo_set_updated_at
      BEFORE UPDATE ON public.product_price_freshness_overrides
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- -------------------------------------------------------
-- 10. ai_insights_cache
--     Finalidade: cache de respostas de IA por usuário
--     (TTL 24h) para reduzir custo e latência
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL,
  function_name TEXT        NOT NULL,
  cache_key     TEXT        NOT NULL,
  payload       JSONB       NOT NULL,
  model         TEXT,
  tokens_input  INTEGER,
  tokens_output INTEGER,
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_insights_cache_user_fn_key
  ON public.ai_insights_cache (user_id, function_name, cache_key);
CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires
  ON public.ai_insights_cache (expires_at);

ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_insights_cache' AND policyname='Users can view their own cached insights') THEN
    CREATE POLICY "Users can view their own cached insights"
      ON public.ai_insights_cache FOR SELECT TO authenticated
      USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_insights_cache' AND policyname='Users can insert their own cached insights') THEN
    CREATE POLICY "Users can insert their own cached insights"
      ON public.ai_insights_cache FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_insights_cache' AND policyname='Users can update their own cached insights') THEN
    CREATE POLICY "Users can update their own cached insights"
      ON public.ai_insights_cache FOR UPDATE TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_insights_cache' AND policyname='Users can delete their own cached insights') THEN
    CREATE POLICY "Users can delete their own cached insights"
      ON public.ai_insights_cache FOR DELETE TO authenticated
      USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- -------------------------------------------------------
-- 11. ai_usage_events
--     Finalidade: log granular de eventos de IA
--     (regenerações, cache hits, erros)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID        NOT NULL,
  function_name TEXT        NOT NULL,
  event_type    TEXT        NOT NULL,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created
  ON public.ai_usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_fn_created
  ON public.ai_usage_events (function_name, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_usage_events' AND policyname='Users can view their own usage events') THEN
    CREATE POLICY "Users can view their own usage events"
      ON public.ai_usage_events FOR SELECT TO authenticated
      USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='ai_usage_events' AND policyname='Users can insert their own usage events') THEN
    CREATE POLICY "Users can insert their own usage events"
      ON public.ai_usage_events FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- -------------------------------------------------------
-- 12. art_file_attachments
--     Finalidade: arquivos de arte (vetores, layouts)
--     anexados a mockups ou orçamentos pelo cliente
-- -------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('mockup-art-files', 'mockup-art-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.art_file_attachments (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL,
  mockup_id       UUID,
  quote_id        UUID,
  file_url        TEXT        NOT NULL,
  file_path       TEXT        NOT NULL,
  original_name   TEXT        NOT NULL,
  mime_type       TEXT,
  file_size_bytes BIGINT,
  file_extension  TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_art_files_user
  ON public.art_file_attachments (user_id);
CREATE INDEX IF NOT EXISTS idx_art_files_mockup
  ON public.art_file_attachments (mockup_id);
CREATE INDEX IF NOT EXISTS idx_art_files_quote
  ON public.art_file_attachments (quote_id);

ALTER TABLE public.art_file_attachments ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='art_file_attachments' AND policyname='Users view own art files') THEN
    CREATE POLICY "Users view own art files"
      ON public.art_file_attachments FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='art_file_attachments' AND policyname='Users insert own art files') THEN
    CREATE POLICY "Users insert own art files"
      ON public.art_file_attachments FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='art_file_attachments' AND policyname='Users update own art files') THEN
    CREATE POLICY "Users update own art files"
      ON public.art_file_attachments FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='art_file_attachments' AND policyname='Users delete own art files') THEN
    CREATE POLICY "Users delete own art files"
      ON public.art_file_attachments FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_art_files_updated_at') THEN
    CREATE TRIGGER update_art_files_updated_at
      BEFORE UPDATE ON public.art_file_attachments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users view own art files in storage') THEN
    CREATE POLICY "Users view own art files in storage"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users upload own art files to storage') THEN
    CREATE POLICY "Users upload own art files to storage"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users update own art files in storage') THEN
    CREATE POLICY "Users update own art files in storage"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users delete own art files in storage') THEN
    CREATE POLICY "Users delete own art files in storage"
      ON storage.objects FOR DELETE
      USING (bucket_id = 'mockup-art-files' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;
