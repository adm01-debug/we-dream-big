ALTER TABLE public.connection_test_history
ADD COLUMN IF NOT EXISTS error_kind text;

COMMENT ON COLUMN public.connection_test_history.error_kind IS 'Structured error category: timeout | network | dns | http | auth | config | unknown. Null for legacy rows or successes.';