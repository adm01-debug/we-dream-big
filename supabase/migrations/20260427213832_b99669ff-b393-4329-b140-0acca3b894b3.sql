-- Garantir que o bucket de quarentena não seja público
UPDATE storage.buckets SET public = false WHERE id = 'quarantine';

-- Remover políticas existentes para recreação limpa
DROP POLICY IF EXISTS "Acesso restrito ao bucket de quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Sistema pode gerenciar quarentena" ON storage.objects;
DROP POLICY IF EXISTS "Admins podem visualizar quarentena" ON storage.objects;

-- Política 1: O sistema (service_role) tem acesso total para mover arquivos para cá
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

-- Política 2: Administradores podem visualizar os arquivos para auditoria
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

-- Nota: Usuários autenticados comuns (não admins) NÃO possuem políticas aqui,
-- o que significa que o acesso é NEGADO por padrão (comportamento do RLS).
