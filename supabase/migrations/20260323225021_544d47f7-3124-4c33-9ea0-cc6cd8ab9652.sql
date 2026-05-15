
CREATE TABLE IF NOT EXISTS public.web_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  rating text,
  delta numeric,
  navigation_type text,
  page_url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.web_vitals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_vitals' AND policyname = 'Admins can read web vitals') THEN
    CREATE POLICY "Admins can read web vitals"
      ON public.web_vitals FOR SELECT TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_vitals' AND policyname = 'Authenticated users can insert web vitals') THEN
    CREATE POLICY "Authenticated users can insert web vitals"
      ON public.web_vitals FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_web_vitals_created_at ON public.web_vitals (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_name ON public.web_vitals (metric_name);
