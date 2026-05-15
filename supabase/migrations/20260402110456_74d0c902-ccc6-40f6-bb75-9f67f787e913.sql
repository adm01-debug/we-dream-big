-- Add versioning columns to quotes table
ALTER TABLE public.quotes 
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_latest_version boolean NOT NULL DEFAULT true;

-- Index for fast lookup of versions by parent
CREATE INDEX IF NOT EXISTS idx_quotes_parent_quote_id ON public.quotes(parent_quote_id);
CREATE INDEX IF NOT EXISTS idx_quotes_version ON public.quotes(parent_quote_id, version);

-- Comment for documentation
COMMENT ON COLUMN public.quotes.version IS 'Version number starting from 1';
COMMENT ON COLUMN public.quotes.parent_quote_id IS 'Reference to the original quote for version tracking';
COMMENT ON COLUMN public.quotes.is_latest_version IS 'Whether this is the latest version of the quote';