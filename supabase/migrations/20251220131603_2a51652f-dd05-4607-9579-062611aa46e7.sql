-- Create table for quote approval tokens
CREATE TABLE IF NOT EXISTS public.quote_approval_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid NOT NULL
);

-- Create index for token lookup
CREATE INDEX IF NOT EXISTS idx_quote_approval_tokens_token ON public.quote_approval_tokens(token);
CREATE INDEX IF NOT EXISTS idx_quote_approval_tokens_quote_id ON public.quote_approval_tokens(quote_id);

-- Enable RLS
ALTER TABLE public.quote_approval_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tokens for their own quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'Users can view tokens for their quotes') THEN
    CREATE POLICY "Users can view tokens for their quotes"
    ON public.quote_approval_tokens
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM quotes q
        WHERE q.id = quote_approval_tokens.quote_id
        AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      )
    );
  END IF;
END $$;

-- Policy: Users can create tokens for their own quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'Users can create tokens for their quotes') THEN
    CREATE POLICY "Users can create tokens for their quotes"
    ON public.quote_approval_tokens
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM quotes q
        WHERE q.id = quote_approval_tokens.quote_id
        AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
      )
    );
  END IF;
END $$;

-- Policy: Service role can manage all tokens (for edge function)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'Service can manage tokens') THEN
    CREATE POLICY "Service can manage tokens"
    ON public.quote_approval_tokens
    FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END $$;

-- Add client response fields to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS client_response text,
ADD COLUMN IF NOT EXISTS client_response_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS client_response_notes text;