
-- 1. CREATE OR REPLACE function to generate secure random tokens (64 hex chars = 32 bytes)
CREATE OR REPLACE FUNCTION public.generate_secure_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate a cryptographically secure 32-byte hex token
  NEW.token := encode(gen_random_bytes(32), 'hex');
  RETURN NEW;
END;
$$;

-- 2. Create trigger to auto-generate secure tokens on insert
DROP TRIGGER IF EXISTS trg_generate_secure_approval_token ON public.quote_approval_tokens;
CREATE TRIGGER trg_generate_secure_approval_token
  BEFORE INSERT ON public.quote_approval_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_secure_token();

-- 3. CREATE OR REPLACE function to auto-invalidate token after response
CREATE OR REPLACE FUNCTION public.invalidate_used_approval_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a response is recorded, mark as expired to prevent reuse
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    NEW.status := 'responded';
    -- Set expires_at to now to prevent any further use
    NEW.expires_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Create trigger for auto-invalidation
DROP TRIGGER IF EXISTS trg_invalidate_used_approval_token ON public.quote_approval_tokens;
CREATE TRIGGER trg_invalidate_used_approval_token
  BEFORE UPDATE ON public.quote_approval_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.invalidate_used_approval_token();

-- 5. Add index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_approval_tokens_token_status 
  ON public.quote_approval_tokens(token, status) 
  WHERE status = 'active';
