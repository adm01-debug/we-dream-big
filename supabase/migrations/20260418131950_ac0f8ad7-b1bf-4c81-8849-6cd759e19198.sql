-- Tabela de cache de insights gerados pela IA
CREATE TABLE IF NOT EXISTS public.ai_insights_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  cache_key text NOT NULL,
  payload jsonb NOT NULL,
  model text,
  tokens_input integer,
  tokens_output integer,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ai_insights_cache_user_fn_key
  ON public.ai_insights_cache (user_id, function_name, cache_key);

CREATE INDEX IF NOT EXISTS idx_ai_insights_cache_expires
  ON public.ai_insights_cache (expires_at);

ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_insights_cache' AND policyname = 'Users can view their own cached insights') THEN
    CREATE POLICY "Users can view their own cached insights"
      ON public.ai_insights_cache
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_insights_cache' AND policyname = 'Users can insert their own cached insights') THEN
    CREATE POLICY "Users can insert their own cached insights"
      ON public.ai_insights_cache
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_insights_cache' AND policyname = 'Users can update their own cached insights') THEN
    CREATE POLICY "Users can update their own cached insights"
      ON public.ai_insights_cache
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_insights_cache' AND policyname = 'Users can delete their own cached insights') THEN
    CREATE POLICY "Users can delete their own cached insights"
      ON public.ai_insights_cache
      FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Telemetria de eventos de uso de IA (regenerações, cache hits)
CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  event_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created
  ON public.ai_usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_fn_created
  ON public.ai_usage_events (function_name, created_at DESC);

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_events' AND policyname = 'Users can view their own usage events') THEN
    CREATE POLICY "Users can view their own usage events"
      ON public.ai_usage_events
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_events' AND policyname = 'Users can insert their own usage events') THEN
    CREATE POLICY "Users can insert their own usage events"
      ON public.ai_usage_events
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
