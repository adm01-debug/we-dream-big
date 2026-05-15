
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'discount_approval_requests') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.discount_approval_requests;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'kit_comments') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.kit_comments;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'kit_variants') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.kit_variants;
  END IF;
END $$;
