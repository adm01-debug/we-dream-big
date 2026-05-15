-- Create table for quote change history
CREATE TABLE IF NOT EXISTS public.quote_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action text NOT NULL, -- 'created', 'updated', 'status_changed', 'item_added', 'item_removed', 'item_updated'
  field_changed text, -- which field was changed (optional)
  old_value text, -- previous value (optional)
  new_value text, -- new value (optional)
  description text NOT NULL, -- human readable description
  metadata jsonb DEFAULT '{}'::jsonb, -- additional context
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_quote_history_quote_id ON public.quote_history(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_history_created_at ON public.quote_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view history of their own quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_history' AND policyname = 'Users can view history of their quotes') THEN
    CREATE POLICY "Users can view history of their quotes"
    ON public.quote_history
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM quotes q
        WHERE q.id = quote_history.quote_id
        AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      )
    );
  END IF;
END $$;

-- Policy: Users can create history for their own quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_history' AND policyname = 'Users can create history for their quotes') THEN
    CREATE POLICY "Users can create history for their quotes"
    ON public.quote_history
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM quotes q
        WHERE q.id = quote_history.quote_id
        AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      )
    );
  END IF;
END $$;
