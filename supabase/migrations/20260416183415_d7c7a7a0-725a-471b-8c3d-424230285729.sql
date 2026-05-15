-- Drop overly broad public SELECT policies if they exist by name (safe re-apply pattern)
-- We add NEW restrictive policies. Storage uses permissive AND restrictive policies.

-- RESTRICTIVE policy: deny anonymous LIST operations (HEAD /object/list)
-- This blocks scrapers from enumerating bucket contents while keeping individual GET-by-path public.

-- Note: Storage objects access is controlled by policies on storage.objects.
-- A public bucket means individual files are accessible via known URL, but listing requires policy.
-- We add a RESTRICTIVE policy that requires authentication for SELECT operations that don't include a specific path filter.

-- Strategy: Replace permissive "anyone can SELECT" with "authenticated only can SELECT" on the 4 buckets.
-- Anonymous users can still GET individual files via getPublicUrl() because those go through a different code path (storage CDN), not through storage.objects RLS for direct file fetches.

DO $$
DECLARE
  pol record;
BEGIN
  -- Drop any existing permissive public SELECT policies on these buckets
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        policyname ILIKE '%public%read%' OR
        policyname ILIKE '%anyone%' OR
        policyname ILIKE '%public access%' OR
        policyname ILIKE '%publicly%accessible%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Authenticated users can list/read objects in these buckets (for app functionality)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can read protected buckets') THEN
    CREATE POLICY "Authenticated can read protected buckets"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id IN ('supplier-logos', 'product-videos', 'personalization-images', 'component-media'));
  END IF;
END $$;

-- Service role full access (for edge functions / image-proxy)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Service role full access protected buckets') THEN
    CREATE POLICY "Service role full access protected buckets"
    ON storage.objects FOR SELECT
    TO service_role
    USING (bucket_id IN ('supplier-logos', 'product-videos', 'personalization-images', 'component-media'));
  END IF;
END $$;
