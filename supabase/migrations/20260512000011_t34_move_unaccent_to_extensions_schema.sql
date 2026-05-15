-- T34: Move unaccent extension from public schema to extensions schema
-- Fixes: extension_in_public advisor violation
-- 57 functions used unaccent() without schema prefix; their search_path is
-- updated to include extensions so they continue to resolve correctly.

-- Step 1: Add 'extensions' to search_path for all functions that call
--         unaccent() without schema qualification
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args,
           n.nspname
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.prosrc ILIKE '%unaccent(%'
      AND p.prosrc NOT ILIKE '%extensions.unaccent(%'
      AND p.proconfig IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM unnest(p.proconfig) v
        WHERE v LIKE 'search_path=%'
          AND v NOT LIKE '%extensions%'
      )
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path TO public, extensions',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;

-- Step 2: Drop extension CASCADE — also drops dependent views:
--         public.v_category_keywords, public.v_product_tokens
DROP EXTENSION IF EXISTS unaccent CASCADE;

-- Step 3: Recreate extension in extensions schema
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

-- Step 4: Recreate views (migration search_path includes extensions,
--         so bare unaccent() resolves to extensions.unaccent())
DO $$
BEGIN
  EXECUTE $view$
    CREATE OR REPLACE VIEW public.v_category_keywords AS
     WITH tokens AS (
       SELECT c.id AS category_id,
          c.full_path_readable,
          c.level,
          c.name AS category_name,
          unnest(regexp_split_to_array(lower(unaccent(c.name)), '[\s\|>/,\.\-]+'::text)) AS token
       FROM categories c
       WHERE c.is_active
     )
     SELECT category_id,
        full_path_readable,
        category_name,
        level,
        token
     FROM tokens
     WHERE (length(token) >= 3)
       AND (token <> ALL (ARRAY['de','da','do','das','dos','com','sem','para',
                                'por','que','brindes','kit','tipo','uso','pcs',
                                'pecas','unidade']::text[]))
  $view$;
EXCEPTION WHEN undefined_table OR undefined_column OR undefined_function THEN NULL;
END $$;

DO $$
BEGIN
  EXECUTE $view$
    CREATE OR REPLACE VIEW public.v_product_tokens AS
     WITH tokens AS (
       SELECT p.id AS product_id,
          p.name AS product_name,
          p.is_active,
          unnest(regexp_split_to_array(lower(unaccent(((p.name || ' '::text) || COALESCE(p.description, ''::text)))), '[\s\|>/,\.\-()0-9]+'::text)) AS token
       FROM products p
       WHERE p.is_active
     )
     SELECT product_id,
        product_name,
        token
     FROM tokens
     WHERE (length(token) >= 3)
       AND (token <> ALL (ARRAY['de','da','do','das','dos','com','sem','para','por','que',
                                'mais','cor','cores','tipo','uso','seu','sua','como','tem',
                                'gramatura','dimensoes','medidas','aprox','aproximadamente',
                                'tamanho','unidade','unidades','peca','pecas','kit','kits',
                                'varias','variadas','novo','novidade','novos','produto',
                                'produtos','item','marca','sobre','material']::text[]))
  $view$;
EXCEPTION WHEN undefined_table OR undefined_column OR undefined_function THEN NULL;
END $$;
