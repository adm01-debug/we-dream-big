-- 1. Garantir que todos os buckets sejam privados
UPDATE storage.buckets SET public = false;

-- 2. Remover explicitamente políticas que possam ser muito permissivas para o bucket de quarentena
-- Como não podemos deletar diretamente de storage.policies, usamos DROP POLICY IF EXISTS nominalmente
DROP POLICY IF EXISTS "Acesso restrito ao bucket de quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Public access to quarantine" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read quarantine" ON storage.objects;

-- 3. Recriar apenas as políticas necessárias e seguras
-- Apenas sistema pode fazer tudo
DROP POLICY IF EXISTS "Sistema pode gerenciar quarentena" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Sistema pode gerenciar quarentena') THEN
    CREATE POLICY "Sistema pode gerenciar quarentena"
    ON storage.objects FOR ALL
    TO service_role
    USING (bucket_id = 'quarantine')
    WITH CHECK (bucket_id = 'quarantine');
  END IF;
END $$;

-- Apenas admins podem ler
DROP POLICY IF EXISTS "Admins podem visualizar quarentena" ON storage.objects;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins podem visualizar quarentena') THEN
    CREATE POLICY "Admins podem visualizar quarentena"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'quarantine'
      AND (auth.jwt() ->> 'email' LIKE '%admin%' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    );
  END IF;
END $$;
