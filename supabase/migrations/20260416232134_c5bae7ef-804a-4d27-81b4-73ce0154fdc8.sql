
CREATE TABLE IF NOT EXISTS public.saved_trends_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_trends_views ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_trends_views' AND policyname = 'Users manage own saved trends views') THEN
    CREATE POLICY "Users manage own saved trends views"
    ON public.saved_trends_views
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_saved_trends_views_user ON public.saved_trends_views(user_id);

DROP TRIGGER IF EXISTS update_saved_trends_views_updated_at ON public.saved_trends_views;
CREATE TRIGGER update_saved_trends_views_updated_at
BEFORE UPDATE ON public.saved_trends_views
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
