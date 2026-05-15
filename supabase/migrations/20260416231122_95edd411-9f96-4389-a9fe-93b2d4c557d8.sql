-- Create search_analytics table to track all searches (including unmet demand with results_count = 0)
CREATE TABLE IF NOT EXISTS public.search_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  search_term TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  search_context TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON public.search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_term_lower ON public.search_analytics(lower(search_term));
CREATE INDEX IF NOT EXISTS idx_search_analytics_zero_results ON public.search_analytics(created_at DESC) WHERE results_count = 0;

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can log a search (insert)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_analytics' AND policyname = 'Authenticated users can log searches') THEN
    CREATE POLICY "Authenticated users can log searches"
    ON public.search_analytics
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- Allow anonymous logging too (catalog is public-facing for visitors)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_analytics' AND policyname = 'Anyone can log searches') THEN
    CREATE POLICY "Anyone can log searches"
    ON public.search_analytics
    FOR INSERT
    TO anon
    WITH CHECK (true);
  END IF;
END $$;

-- Only managers/admins can read aggregated search analytics
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'search_analytics' AND policyname = 'Managers and admins can read search analytics') THEN
    CREATE POLICY "Managers and admins can read search analytics"
    ON public.search_analytics
    FOR SELECT
    TO authenticated
    USING (public.is_manager_or_admin());
  END IF;
END $$;
