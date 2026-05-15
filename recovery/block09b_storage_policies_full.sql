-- =====================================================================
-- Bloco 9b — STORAGE POLICIES COMPLETAS (extração ao vivo do banco)
-- =====================================================================
-- Complementa block09_storage.sql.
-- Snapshot gerado de pg_policies WHERE schemaname='storage'.
-- Total: 34 policies em storage.objects, agrupadas por bucket.
--
-- RLS state (storage schema):
--   buckets, buckets_analytics, buckets_vectors, migrations,
--   objects, s3_multipart_uploads, s3_multipart_uploads_parts,
--   vector_indexes  → TODOS com rowsecurity=ON, force=OFF (default Supabase).
-- =====================================================================

-- Garantia (idempotente). Não desabilitar — gerenciado pela plataforma.
ALTER TABLE storage.objects  ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- Bucket: component-media  (4 policies)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete component media" ON storage.objects;
CREATE POLICY "Admins can delete component media" ON storage.objects FOR DELETE TO public
  USING (((bucket_id = 'component-media'::text) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Admins can upload component media" ON storage.objects;
CREATE POLICY "Admins can upload component media" ON storage.objects FOR INSERT TO public
  WITH CHECK (((bucket_id = 'component-media'::text) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Authenticated direct read component-media" ON storage.objects;
CREATE POLICY "Authenticated direct read component-media" ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'component-media'::text) AND (name IS NOT NULL) AND (length(name) > 0)));

DROP POLICY IF EXISTS "Admins can update component media" ON storage.objects;
CREATE POLICY "Admins can update component media" ON storage.objects FOR UPDATE TO public
  USING (((bucket_id = 'component-media'::text) AND is_supervisor_or_above(auth.uid())))
  WITH CHECK (((bucket_id = 'component-media'::text) AND is_supervisor_or_above(auth.uid())));

-- ---------------------------------------------------------------
-- Bucket: mockup-art-files  (7 policies)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete their own art files" ON storage.objects;
CREATE POLICY "Users can delete their own art files" ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'mockup-art-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

DROP POLICY IF EXISTS "Users delete own art files in storage" ON storage.objects;
CREATE POLICY "Users delete own art files in storage" ON storage.objects FOR DELETE TO public
  USING (((bucket_id = 'mockup-art-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users can upload their own art files" ON storage.objects;
CREATE POLICY "Users can upload their own art files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'mockup-art-files'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

DROP POLICY IF EXISTS "Users upload own art files to storage" ON storage.objects;
CREATE POLICY "Users upload own art files to storage" ON storage.objects FOR INSERT TO public
  WITH CHECK (((bucket_id = 'mockup-art-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users can view their own or shared art files" ON storage.objects;
CREATE POLICY "Users can view their own or shared art files" ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'mockup-art-files'::text) AND (((storage.foldername(name))[1] = (auth.uid())::text) OR is_supervisor_or_above(auth.uid()))));

DROP POLICY IF EXISTS "Users view own art files in storage" ON storage.objects;
CREATE POLICY "Users view own art files in storage" ON storage.objects FOR SELECT TO public
  USING (((bucket_id = 'mockup-art-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

DROP POLICY IF EXISTS "Users update own art files in storage" ON storage.objects;
CREATE POLICY "Users update own art files in storage" ON storage.objects FOR UPDATE TO public
  USING (((bucket_id = 'mockup-art-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));

-- ---------------------------------------------------------------
-- Bucket: personalization-images  (9 policies)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete personalization images" ON storage.objects;
CREATE POLICY "Admins can delete personalization images" ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'personalization-images'::text) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Authenticated users can delete own personalization images" ON storage.objects;
CREATE POLICY "Authenticated users can delete own personalization images" ON storage.objects FOR DELETE TO authenticated
  USING (((bucket_id = 'personalization-images'::text) AND (owner = auth.uid())));

DROP POLICY IF EXISTS "Acesso de inserção para usuários autenticados em personaliza" ON storage.objects;
CREATE POLICY "Acesso de inserção para usuários autenticados em personaliza" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'personalization-images'::text));

DROP POLICY IF EXISTS "Authenticated users can upload personalization images" ON storage.objects;
CREATE POLICY "Authenticated users can upload personalization images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK ((bucket_id = 'personalization-images'::text));

DROP POLICY IF EXISTS "Users can upload own personalization images" ON storage.objects;
CREATE POLICY "Users can upload own personalization images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (((bucket_id = 'personalization-images'::text) AND ((auth.uid())::text = split_part(name, '/'::text, 1))));

DROP POLICY IF EXISTS "Acesso de leitura para usuários autenticados em personalizatio" ON storage.objects;
CREATE POLICY "Acesso de leitura para usuários autenticados em personalizatio" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'personalization-images'::text));

DROP POLICY IF EXISTS "Authenticated direct read personalization-images" ON storage.objects;
CREATE POLICY "Authenticated direct read personalization-images" ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'personalization-images'::text) AND (name IS NOT NULL) AND (length(name) > 0)));

DROP POLICY IF EXISTS "Authenticated users can view personalization images" ON storage.objects;
CREATE POLICY "Authenticated users can view personalization images" ON storage.objects FOR SELECT TO authenticated
  USING ((bucket_id = 'personalization-images'::text));

DROP POLICY IF EXISTS "Authenticated users can update own personalization images" ON storage.objects;
CREATE POLICY "Authenticated users can update own personalization images" ON storage.objects FOR UPDATE TO authenticated
  USING (((bucket_id = 'personalization-images'::text) AND (owner = auth.uid())))
  WITH CHECK (((bucket_id = 'personalization-images'::text) AND (owner = auth.uid())));

-- ---------------------------------------------------------------
-- Bucket: product-videos  (4 policies)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can delete videos" ON storage.objects;
CREATE POLICY "Admins can delete videos" ON storage.objects FOR DELETE TO public
  USING (((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Admins can upload videos" ON storage.objects;
CREATE POLICY "Admins can upload videos" ON storage.objects FOR INSERT TO public
  WITH CHECK (((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Authenticated direct read product-videos" ON storage.objects;
CREATE POLICY "Authenticated direct read product-videos" ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'product-videos'::text) AND (name IS NOT NULL) AND (length(name) > 0)));

DROP POLICY IF EXISTS "Only admins can update product videos" ON storage.objects;
CREATE POLICY "Only admins can update product videos" ON storage.objects FOR UPDATE TO public
  USING (((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(auth.uid())))
  WITH CHECK (((bucket_id = 'product-videos'::text) AND is_supervisor_or_above(auth.uid())));

-- ---------------------------------------------------------------
-- Bucket: quarantine  (2 policies)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Sistema pode gerenciar quarentena" ON storage.objects;
CREATE POLICY "Sistema pode gerenciar quarentena" ON storage.objects FOR ALL TO service_role
  USING ((bucket_id = 'quarantine'::text))
  WITH CHECK ((bucket_id = 'quarantine'::text));

DROP POLICY IF EXISTS "Admins podem visualizar quarentena" ON storage.objects;
CREATE POLICY "Admins podem visualizar quarentena" ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'quarantine'::text) AND (((auth.jwt() ->> 'email'::text) ~~ '%admin%'::text) OR (((auth.jwt() -> 'app_metadata'::text) ->> 'role'::text) = 'admin'::text))));

-- ---------------------------------------------------------------
-- Bucket: supplier-logos  (6 policies)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Only admins can manage supplier logos" ON storage.objects;
CREATE POLICY "Only admins can manage supplier logos" ON storage.objects FOR ALL TO authenticated
  USING (((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid())))
  WITH CHECK (((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Only admins can delete supplier logos" ON storage.objects;
CREATE POLICY "Only admins can delete supplier logos" ON storage.objects FOR DELETE TO public
  USING (((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Only admins can upload supplier logos" ON storage.objects;
CREATE POLICY "Only admins can upload supplier logos" ON storage.objects FOR INSERT TO public
  WITH CHECK (((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Authenticated direct read supplier-logos" ON storage.objects;
CREATE POLICY "Authenticated direct read supplier-logos" ON storage.objects FOR SELECT TO authenticated
  USING (((bucket_id = 'supplier-logos'::text) AND (name IS NOT NULL) AND (length(name) > 0)));

DROP POLICY IF EXISTS "Public can view supplier logos" ON storage.objects;
CREATE POLICY "Public can view supplier logos" ON storage.objects FOR SELECT TO public
  USING ((bucket_id = 'supplier-logos'::text));

DROP POLICY IF EXISTS "Only admins can update supplier logos" ON storage.objects;
CREATE POLICY "Only admins can update supplier logos" ON storage.objects FOR UPDATE TO public
  USING (((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid())))
  WITH CHECK (((bucket_id = 'supplier-logos'::text) AND is_supervisor_or_above(auth.uid())));

-- ---------------------------------------------------------------
-- Bucket: multi:supplier-logos,product-videos,personalization-images,component-media  (2 policies)
-- ---------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can list protected buckets" ON storage.objects;
CREATE POLICY "Admins can list protected buckets" ON storage.objects FOR SELECT TO public
  USING (((bucket_id = ANY (ARRAY['supplier-logos'::text, 'product-videos'::text, 'personalization-images'::text, 'component-media'::text])) AND is_supervisor_or_above(auth.uid())));

DROP POLICY IF EXISTS "Service role full access protected buckets" ON storage.objects;
CREATE POLICY "Service role full access protected buckets" ON storage.objects FOR SELECT TO service_role
  USING ((bucket_id = ANY (ARRAY['supplier-logos'::text, 'product-videos'::text, 'personalization-images'::text, 'component-media'::text])));

-- =====================================================================
-- Validação: confira que 34 policies foram criadas em storage.objects
-- =====================================================================
-- SELECT count(*) FROM pg_policies WHERE schemaname='storage';  -- esperado: 34
-- SELECT policyname FROM pg_policies WHERE schemaname='storage' ORDER BY 1;