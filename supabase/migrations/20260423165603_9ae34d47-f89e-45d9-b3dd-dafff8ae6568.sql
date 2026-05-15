ALTER TABLE public.connection_test_history
  ADD COLUMN IF NOT EXISTS request_method text,
  ADD COLUMN IF NOT EXISTS request_url text,
  ADD COLUMN IF NOT EXISTS response_headers jsonb,
  ADD COLUMN IF NOT EXISTS response_body text,
  ADD COLUMN IF NOT EXISTS dns_ms integer,
  ADD COLUMN IF NOT EXISTS tcp_ms integer,
  ADD COLUMN IF NOT EXISTS tls_ms integer,
  ADD COLUMN IF NOT EXISTS ttfb_ms integer,
  ADD COLUMN IF NOT EXISTS download_ms integer,
  ADD COLUMN IF NOT EXISTS triggered_by_user_id uuid;