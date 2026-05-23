-- LOTE A 1/6 - public_token_failures (origem: Lovable Cloud)
CREATE TABLE public.public_token_failures (
  id              uuid        NOT NULL DEFAULT gen_random_uuid(),
  resource_type   text        NOT NULL,
  resource_id     text        NULL,
  attempted_token text        NULL,
  ip_address      text        NULL,
  user_agent      text        NULL,
  reason          text        NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT public_token_failures_pkey PRIMARY KEY (id),
  CONSTRAINT public_token_failures_resource_type_check CHECK (resource_type = ANY (ARRAY['quote'::text, 'kit'::text]))
);
CREATE INDEX idx_public_token_failures_ip ON public.public_token_failures USING btree (ip_address, created_at DESC);
CREATE INDEX idx_public_token_failures_resource ON public.public_token_failures USING btree (resource_type, resource_id, created_at DESC);
ALTER TABLE public.public_token_failures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role inserts token failures" ON public.public_token_failures FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "Admins read token failures" ON public.public_token_failures FOR SELECT TO authenticated USING (is_admin(auth.uid()));
