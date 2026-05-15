
-- Drop the old trigger and function
DROP TRIGGER IF EXISTS set_quote_number ON public.quotes;
DROP FUNCTION IF EXISTS public.generate_quote_number();

-- Create a new sequence that starts from 10001 (if it doesn't exist yet, or reset)
-- We keep the existing sequence but we'll use a year-aware approach
DROP SEQUENCE IF EXISTS quote_number_seq;

-- Create a table to track per-year sequences
CREATE TABLE IF NOT EXISTS public.quote_number_counters (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 10000
);

-- New function: generates numbers like 10001/26, 10002/26, etc.
-- Resets to 10001 on new year
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_year_short TEXT;
  v_next INTEGER;
BEGIN
  -- Only generate if quote_number is not already set
  IF NEW.quote_number IS NOT NULL AND NEW.quote_number != '' THEN
    RETURN NEW;
  END IF;

  v_year := EXTRACT(YEAR FROM NOW())::INTEGER;
  v_year_short := TO_CHAR(NOW(), 'YY');

  -- Upsert counter for the current year
  INSERT INTO public.quote_number_counters (year, last_number)
  VALUES (v_year, 10000)
  ON CONFLICT (year) DO NOTHING;

  -- Atomically increment and get next number
  UPDATE public.quote_number_counters
  SET last_number = last_number + 1
  WHERE year = v_year
  RETURNING last_number INTO v_next;

  NEW.quote_number := v_next::TEXT || '/' || v_year_short;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Re-create the trigger
DROP TRIGGER IF EXISTS set_quote_number ON public.quotes;
CREATE TRIGGER set_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION public.generate_quote_number();

-- Enable RLS on counter table
ALTER TABLE public.quote_number_counters ENABLE ROW LEVEL SECURITY;

-- Only allow the trigger function to access it (service role)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_number_counters' AND policyname = 'service_role_only') THEN
    CREATE POLICY "service_role_only" ON public.quote_number_counters
      USING (false)
      WITH CHECK (false);
  END IF;
END $$;
