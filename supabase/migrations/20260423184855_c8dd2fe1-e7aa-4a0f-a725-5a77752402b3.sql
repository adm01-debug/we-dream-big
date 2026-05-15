ALTER TABLE public.connection_test_history
  ADD COLUMN IF NOT EXISTS attempts smallint NOT NULL DEFAULT 1;

COMMENT ON COLUMN public.connection_test_history.attempts IS
  'Number of attempts performed for this test (1 = first try succeeded; 2 = retry after a transient failure).';