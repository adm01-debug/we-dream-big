-- Substitui has_role(auth.uid(),'admin') por is_supervisor_or_above(auth.uid())
-- nas 6 policies de storage.objects que protegem buckets administrativos.
-- Garante que o papel 'dev' (e supervisor/admin/manager legados) tenha acesso
-- a uploads/edição/leitura de logos, vídeos e mídias de componentes.

-- supplier-logos (3 policies)
DROP POLICY IF EXISTS "Only admins can upload supplier logos" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Only admins can upload supplier logos') THEN
    CREATE POLICY "Only admins can upload supplier logos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Only admins can update supplier logos" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Only admins can update supplier logos') THEN
    CREATE POLICY "Only admins can update supplier logos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()))
    WITH CHECK (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Only admins can delete supplier logos" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Only admins can delete supplier logos') THEN
    CREATE POLICY "Only admins can delete supplier logos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- product-videos (2 policies + 1 já existente de update)
DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload videos') THEN
    CREATE POLICY "Admins can upload videos"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'product-videos' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Only admins can update product videos" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Only admins can update product videos') THEN
    CREATE POLICY "Only admins can update product videos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'product-videos' AND public.is_supervisor_or_above(auth.uid()))
    WITH CHECK (bucket_id = 'product-videos' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete videos') THEN
    CREATE POLICY "Admins can delete videos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'product-videos' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- component-media (3 policies)
DROP POLICY IF EXISTS "Admins can upload component media" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload component media') THEN
    CREATE POLICY "Admins can upload component media"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'component-media' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can update component media" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update component media') THEN
    CREATE POLICY "Admins can update component media"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'component-media' AND public.is_supervisor_or_above(auth.uid()))
    WITH CHECK (bucket_id = 'component-media' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins can delete component media" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete component media') THEN
    CREATE POLICY "Admins can delete component media"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'component-media' AND public.is_supervisor_or_above(auth.uid()));
  END IF;
END $$;

-- Listagem dos buckets protegidos
DROP POLICY IF EXISTS "Admins can list protected buckets" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can list protected buckets') THEN
    CREATE POLICY "Admins can list protected buckets"
    ON storage.objects FOR SELECT
    USING (
      bucket_id = ANY (ARRAY['supplier-logos','product-videos','personalization-images','component-media'])
      AND public.is_supervisor_or_above(auth.uid())
    );
  END IF;
END $$;