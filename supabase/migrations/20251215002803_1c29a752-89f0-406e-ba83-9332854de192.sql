-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search vector column to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- CREATE OR REPLACE function to generate search vector
CREATE OR REPLACE FUNCTION public.products_generate_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('portuguese', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.category_name, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.subcategory, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.materials, ' '), '')), 'C');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS products_search_vector_trigger ON public.products;
CREATE TRIGGER products_search_vector_trigger
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.products_generate_search_vector();

-- Update existing products to generate search vectors
UPDATE public.products SET updated_at = updated_at;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON public.products USING gin(search_vector);

-- Create GIN indexes for trigram similarity
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_description_trgm ON public.products USING gin(description gin_trgm_ops);

-- Create semantic search function
CREATE OR REPLACE FUNCTION public.search_products_semantic(
  search_query TEXT,
  max_results INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  sku TEXT,
  category_name TEXT,
  subcategory TEXT,
  description TEXT,
  price NUMERIC,
  colors JSONB,
  materials TEXT[],
  tags JSONB,
  relevance REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts_query tsquery;
  search_terms TEXT[];
  term TEXT;
BEGIN
  -- Split search query into terms and create tsquery
  search_terms := regexp_split_to_array(lower(trim(search_query)), '\s+');
  
  -- Build tsquery with OR logic for flexibility
  ts_query := to_tsquery('portuguese', array_to_string(search_terms, ' | '));
  
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.name,
    p.sku,
    p.category_name,
    p.subcategory,
    p.description,
    p.price,
    p.colors,
    p.materials,
    p.tags,
    (
      -- Full-text search score
      COALESCE(ts_rank(p.search_vector, ts_query), 0) * 10 +
      -- Trigram similarity on name (high weight)
      COALESCE(similarity(p.name, search_query), 0) * 5 +
      -- Trigram similarity on description
      COALESCE(similarity(COALESCE(p.description, ''), search_query), 0) * 2 +
      -- Exact match bonus
      CASE WHEN lower(p.name) LIKE '%' || lower(search_query) || '%' THEN 3 ELSE 0 END
    )::REAL as relevance
  FROM public.products p
  WHERE 
    p.is_active = true AND
    (
      -- Full-text search match
      p.search_vector @@ ts_query OR
      -- Trigram similarity threshold
      similarity(p.name, search_query) > 0.1 OR
      similarity(COALESCE(p.description, ''), search_query) > 0.1 OR
      -- Material match
      EXISTS (
        SELECT 1 FROM unnest(p.materials) m 
        WHERE similarity(m, search_query) > 0.3
      ) OR
      -- Category/subcategory match
      similarity(COALESCE(p.category_name, ''), search_query) > 0.2 OR
      similarity(COALESCE(p.subcategory, ''), search_query) > 0.2
    )
  ORDER BY relevance DESC
  LIMIT max_results;
END;
$$;