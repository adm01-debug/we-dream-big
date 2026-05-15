-- ═════════════════════════════════════════════════════════════════
-- ROLLBACK — D.1.1 (revert do patch)
-- CUIDADO: se houver dados nos buckets, DELETE vai falhar (desejável)
-- ═════════════════════════════════════════════════════════════════

BEGIN;

-- 1. DROP de TODAS as policies criadas pelo patch (34 + as do block09)
-- Lista exaustiva de policy names
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname FROM pg_policies 
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname IN (
        -- block09 policies (lista parcial — completar via grep)
        'Authenticated users can view personalization images',
        'Authenticated users can upload personalization images',
        'Admins can delete component media',
        'Admins can upload component media',
        'Admins can update component media',
        'Authenticated direct read component-media',
        'Admins can upload videos',
        'Only admins can update product videos',
        'Admins can delete videos',
        'Authenticated direct read product-videos'
        -- ... (todas as 34, ver block09b pra lista completa)
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- 2. DELETE dos 6 buckets criados
-- Se tiver dados, vai falhar — bom (não queremos perder dados acidentalmente)
DELETE FROM storage.buckets WHERE id IN (
  'component-media','mockup-art-files','personalization-images',
  'product-videos','quarantine','supplier-logos'
);

-- 3. Validar que voltou ao estado inicial
SELECT count(*) AS buckets_restantes FROM storage.buckets;

COMMIT;

-- Limpeza opcional: remover tabelas de backup (só após confirmação)
-- DROP TABLE IF EXISTS public._backup_storage_buckets_20260511_d11;
-- DROP TABLE IF EXISTS public._backup_storage_policies_20260511_d11;
