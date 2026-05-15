ALTER TABLE public.connection_test_history
  ADD COLUMN IF NOT EXISTS triggered_by text NOT NULL DEFAULT 'manual';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'connection_test_history_triggered_by_check'
  ) THEN
    ALTER TABLE public.connection_test_history
      ADD CONSTRAINT connection_test_history_triggered_by_check
      CHECK (triggered_by IN ('manual','cron','webhook'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cth_triggered_by ON public.connection_test_history(triggered_by);