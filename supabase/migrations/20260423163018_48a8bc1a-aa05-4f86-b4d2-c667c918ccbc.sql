-- Add action_type column to secret_rotation_log so we can register both "set" and "rotate" operations
ALTER TABLE public.secret_rotation_log
  ADD COLUMN IF NOT EXISTS action_type TEXT NOT NULL DEFAULT 'rotate';

-- Validation trigger ensures only allowed values
CREATE OR REPLACE FUNCTION public.validate_secret_rotation_action_type()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.action_type NOT IN ('set', 'rotate') THEN
    RAISE EXCEPTION 'Invalid action_type: must be set or rotate';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_secret_rotation_action_type ON public.secret_rotation_log;
DROP TRIGGER IF EXISTS trg_validate_secret_rotation_action_type ON public.secret_rotation_log;
CREATE TRIGGER trg_validate_secret_rotation_action_type
BEFORE INSERT OR UPDATE ON public.secret_rotation_log
FOR EACH ROW EXECUTE FUNCTION public.validate_secret_rotation_action_type();

-- Index to filter by secret + action_type for the "last set" lookups
CREATE INDEX IF NOT EXISTS idx_secret_rotation_log_secret_action
  ON public.secret_rotation_log (secret_name, action_type, rotated_at DESC);