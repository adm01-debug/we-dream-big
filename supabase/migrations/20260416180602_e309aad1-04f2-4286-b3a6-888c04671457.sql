-- Restringir listagem ampla em buckets públicos
-- Mantém acesso individual via URL pública (que usa a CDN do Supabase, não precisa de policy SELECT)
-- Remove policies amplas SELECT de objetos

DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND cmd = 'SELECT'
      AND (
        policyname ILIKE '%public%' 
        OR policyname ILIKE '%anyone%' 
        OR policyname ILIKE '%publicly accessible%'
        OR policyname ILIKE '%are accessible%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Recriar policies SELECT restritas: somente usuários autenticados podem listar/ler via API
-- (URLs públicas continuam funcionando via CDN sem policy)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can read personalization-images') THEN
    CREATE POLICY "Authenticated can read personalization-images"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'personalization-images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can read product-videos') THEN
    CREATE POLICY "Authenticated can read product-videos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'product-videos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can read supplier-logos') THEN
    CREATE POLICY "Authenticated can read supplier-logos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'supplier-logos');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Authenticated can read component-media') THEN
    CREATE POLICY "Authenticated can read component-media"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'component-media');
  END IF;
END $$;
