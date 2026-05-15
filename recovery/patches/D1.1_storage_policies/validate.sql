-- ═════════════════════════════════════════════════════════════════
-- VALIDATE — D.1.1 (rodar APÓS patch.sql)
-- Deve retornar zero erros (todas verificações = TRUE)
-- ═════════════════════════════════════════════════════════════════

SELECT 
  -- 1. 6 buckets do dump criados?
  (SELECT count(*) FROM storage.buckets WHERE id IN (
    'component-media','mockup-art-files','personalization-images',
    'product-videos','quarantine','supplier-logos')) = 6 AS chk_6_buckets,
  
  -- 2. 34 policies criadas em storage.objects?
  (SELECT count(*) FROM pg_policies 
   WHERE schemaname='storage' AND tablename='objects') >= 34 AS chk_34_policies,
  
  -- 3. RLS ainda habilitado?
  (SELECT relrowsecurity FROM pg_class 
   WHERE oid='storage.objects'::regclass) AS chk_rls_objects,
  (SELECT relrowsecurity FROM pg_class 
   WHERE oid='storage.buckets'::regclass) AS chk_rls_buckets,
  
  -- 4. Tabelas de backup criadas?
  EXISTS (SELECT 1 FROM information_schema.tables 
          WHERE table_schema='public' AND table_name='_backup_storage_buckets_20260511_d11')
    AS chk_backup_exists;

-- Detalhamento
SELECT 'BUCKETS' AS tipo, id AS nome, file_size_limit, public::text AS publ
FROM storage.buckets ORDER BY id;

SELECT 'POLICIES' AS tipo, policyname AS nome, cmd
FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
ORDER BY policyname;
