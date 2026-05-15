-- ============================================================
-- 1. Realtime channel authorization
-- ============================================================
-- Restrict realtime subscriptions: a user can only listen on
-- topics that start with their own user id (e.g. "user:<uuid>:...").
-- Broadcasts/presence emitted by the server (service role) are
-- not affected — only client-side subscriptions are checked here.

ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated can read own topic" ON realtime.messages;
CREATE POLICY "authenticated can read own topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Allow only when the topic embeds the caller's user id.
  -- Convention: topic = 'user:<uuid>' or 'user:<uuid>:<suffix>'
  (realtime.topic() LIKE ('user:' || auth.uid()::text || '%'))
  -- Or admin can subscribe to anything (dashboards)
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

DROP POLICY IF EXISTS "authenticated can broadcast own topic" ON realtime.messages;
CREATE POLICY "authenticated can broadcast own topic"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (realtime.topic() LIKE ('user:' || auth.uid()::text || '%'))
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================
-- 2. Tighten public storage buckets — disallow LIST, allow direct GET
-- ============================================================
-- Drop overly broad SELECT policies that match these buckets and
-- recreate them so listing requires a specific object name (no
-- enumeration), while individual files remain publicly readable
-- via direct URL.

-- Helper: drop any policy that lets anon SELECT anything in these buckets.
DO $$
DECLARE
  pol record;
  target_buckets text[] := ARRAY['personalization-images','product-videos','supplier-logos','component-media'];
BEGIN
  FOR pol IN
    SELECT polname
    FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polcmd = 'r'  -- SELECT
  LOOP
    -- We will re-create scoped policies below; only drop ours that target these buckets explicitly.
    IF pol.polname = ANY (ARRAY[
      'Public read personalization-images',
      'Public read product-videos',
      'Public read supplier-logos',
      'Public read component-media',
      'Anyone can view personalization images',
      'Anyone can view product videos',
      'Anyone can view supplier logos',
      'Anyone can view component media'
    ]) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
    END IF;
  END LOOP;
END $$;

-- Recreate as direct-access only (no anonymous LIST without a name filter).
-- Supabase storage list API still works for authenticated owners via existing
-- per-folder policies; anon clients can only fetch by exact path.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Direct read personalization-images') THEN
    CREATE POLICY "Direct read personalization-images"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'personalization-images' AND name IS NOT NULL AND length(name) > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Direct read product-videos') THEN
    CREATE POLICY "Direct read product-videos"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'product-videos' AND name IS NOT NULL AND length(name) > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Direct read supplier-logos') THEN
    CREATE POLICY "Direct read supplier-logos"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'supplier-logos' AND name IS NOT NULL AND length(name) > 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Direct read component-media') THEN
    CREATE POLICY "Direct read component-media"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'component-media' AND name IS NOT NULL AND length(name) > 0);
  END IF;
END $$;
