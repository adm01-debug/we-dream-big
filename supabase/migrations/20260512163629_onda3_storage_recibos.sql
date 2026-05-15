-- ============================================================
--  Storage bucket pra recibos de entrega
--  Padrão: cotacoes/{cotacao_id}/recibo.jpg
-- ============================================================
--
-- Nota de sincronização (2026-05-12, T19 redeploy Fase 1):
-- Migration aplicada direto no banco prod via MCP e órfã no repo até agora.
--
-- ⚠️ ATENÇÃO: este bucket é PÚBLICO (`public = true`). Isso diverge da
-- política oficial PUBLIC_BUCKETS (docs/storage/PUBLIC_BUCKETS.md) — todo
-- bucket deveria ser privado por default. Revisar com sponsor se o uso
-- (link público de recibo) ainda justifica.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'recibos-entrega') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'recibos-entrega',
      'recibos-entrega',
      true,                           -- público (qualquer um com link vê)
      10 * 1024 * 1024,               -- 10 MB max por arquivo
      ARRAY['image/jpeg','image/png','image/webp','application/pdf']
    );
  ELSE
    UPDATE storage.buckets
    SET
      public = true,
      file_size_limit = 10 * 1024 * 1024,
      allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','application/pdf']
    WHERE id = 'recibos-entrega';
  END IF;
END $$;

-- Policies de Storage
DROP POLICY IF EXISTS "recibos_public_read" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'recibos_public_read') THEN
    CREATE POLICY "recibos_public_read"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'recibos-entrega');
  END IF;
END $$;

DROP POLICY IF EXISTS "recibos_authenticated_write" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'recibos_authenticated_write') THEN
    CREATE POLICY "recibos_authenticated_write"
      ON storage.objects FOR INSERT
      TO authenticated, service_role
      WITH CHECK (bucket_id = 'recibos-entrega');
  END IF;
END $$;

DROP POLICY IF EXISTS "recibos_authenticated_update" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'recibos_authenticated_update') THEN
    CREATE POLICY "recibos_authenticated_update"
      ON storage.objects FOR UPDATE
      TO authenticated, service_role
      USING (bucket_id = 'recibos-entrega');
  END IF;
END $$;
