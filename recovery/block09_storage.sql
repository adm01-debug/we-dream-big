-- =====================================================================
-- BLOCO 9 — STORAGE BUCKETS + POLICIES
-- 6 buckets (todos privados) + 34 policies em storage.objects
-- Pré-requisito: função public.is_supervisor_or_above(uuid) (Bloco 4)
-- =====================================================================

-- ---------- BUCKETS ----------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('component-media',        'component-media',        false,   5242880, NULL),
  ('mockup-art-files',       'mockup-art-files',       false,   5242880, NULL),
  ('personalization-images', 'personalization-images', false,   5242880, NULL),
  ('product-videos',         'product-videos',         false, 104857600, NULL),
  ('quarantine',             'quarantine',             false,   5242880, NULL),
  ('supplier-logos',         'supplier-logos',         false,   2097152, NULL)
ON CONFLICT (id) DO UPDATE
SET file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public = EXCLUDED.public;

-- ---------- POLICIES (storage.objects) ----------
-- RLS já vem habilitado por padrão em storage.objects no Supabase.

-- ===== personalization-images =====
CREATE POLICY "Acesso de inserção para usuários autenticados em personaliza"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'personalization-images');

CREATE POLICY "Acesso de leitura para usuários autenticados em personalizatio"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'personalization-images');

CREATE POLICY "Authenticated users can view personalization images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'personalization-images');

CREATE POLICY "Authenticated users can upload personalization images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'personalization-images');

CREATE POLICY "Authenticated users can update own personalization images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'personalization-images' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'personalization-images' AND owner = auth.uid());

CREATE POLICY "Authenticated users can delete own personalization images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'personalization-images' AND owner = auth.uid());

CREATE POLICY "Users can upload own personalization images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'personalization-images'
              AND auth.uid()::text = split_part(name, '/', 1));

CREATE POLICY "Admins can delete personalization images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'personalization-images'
         AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Authenticated direct read personalization-images"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'personalization-images'
         AND name IS NOT NULL AND length(name) > 0);

-- ===== component-media =====
CREATE POLICY "Admins can upload component media"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'component-media'
              AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Admins can update component media"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'component-media' AND public.is_supervisor_or_above(auth.uid()))
  WITH CHECK (bucket_id = 'component-media' AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Admins can delete component media"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'component-media' AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Authenticated direct read component-media"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'component-media' AND name IS NOT NULL AND length(name) > 0);

-- ===== product-videos =====
CREATE POLICY "Admins can upload videos"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'product-videos'
              AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Only admins can update product videos"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'product-videos' AND public.is_supervisor_or_above(auth.uid()))
  WITH CHECK (bucket_id = 'product-videos' AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Admins can delete videos"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'product-videos' AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Authenticated direct read product-videos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-videos' AND name IS NOT NULL AND length(name) > 0);

-- ===== supplier-logos =====
CREATE POLICY "Public can view supplier logos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'supplier-logos');

CREATE POLICY "Only admins can upload supplier logos"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'supplier-logos'
              AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Only admins can update supplier logos"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()))
  WITH CHECK (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Only admins can delete supplier logos"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Only admins can manage supplier logos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()))
  WITH CHECK (bucket_id = 'supplier-logos' AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Authenticated direct read supplier-logos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'supplier-logos' AND name IS NOT NULL AND length(name) > 0);

-- ===== mockup-art-files =====
CREATE POLICY "Users can view their own or shared art files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'mockup-art-files'
         AND ((storage.foldername(name))[1] = auth.uid()::text
              OR public.is_supervisor_or_above(auth.uid())));

CREATE POLICY "Users can upload their own art files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'mockup-art-files'
              AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own art files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'mockup-art-files'
         AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users view own art files in storage"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'mockup-art-files'
         AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own art files to storage"
  ON storage.objects FOR INSERT TO public
  WITH CHECK (bucket_id = 'mockup-art-files'
              AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own art files in storage"
  ON storage.objects FOR UPDATE TO public
  USING (bucket_id = 'mockup-art-files'
         AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own art files in storage"
  ON storage.objects FOR DELETE TO public
  USING (bucket_id = 'mockup-art-files'
         AND auth.uid()::text = (storage.foldername(name))[1]);

-- ===== quarantine (apenas service_role + admins via JWT) =====
CREATE POLICY "Sistema pode gerenciar quarentena"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'quarantine')
  WITH CHECK (bucket_id = 'quarantine');

CREATE POLICY "Admins podem visualizar quarentena"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'quarantine'
         AND ((auth.jwt() ->> 'email') LIKE '%admin%'
              OR ((auth.jwt() -> 'app_metadata') ->> 'role') = 'admin'));

-- ===== Cross-bucket admin / service_role =====
CREATE POLICY "Admins can list protected buckets"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = ANY (ARRAY['supplier-logos','product-videos','personalization-images','component-media'])
         AND public.is_supervisor_or_above(auth.uid()));

CREATE POLICY "Service role full access protected buckets"
  ON storage.objects FOR SELECT TO service_role
  USING (bucket_id = ANY (ARRAY['supplier-logos','product-videos','personalization-images','component-media']));
