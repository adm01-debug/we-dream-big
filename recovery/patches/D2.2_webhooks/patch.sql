-- ═══════════════════════════════════════════════════════════════════
-- PATCH D2.2_webhooks — Outbound Webhooks
-- Prioridade: P2
-- Extraído por extract_d2.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── TABLE: public.outbound_webhooks ───────────
CREATE TABLE IF NOT EXISTS public.outbound_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    secret_ref text,
    events text[] DEFAULT ARRAY[]::text[] NOT NULL,
    active boolean DEFAULT true NOT NULL,
    retry_policy jsonb DEFAULT jsonb_build_object('max_attempts', 3, 'backoff_seconds', ARRAY[5, 30, 120]) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    last_triggered_at timestamp with time zone,
    total_success integer DEFAULT 0 NOT NULL,
    total_failure integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    consecutive_failures integer DEFAULT 0 NOT NULL,
    auto_disabled_at timestamp with time zone,
    auto_disabled_reason text
);

ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.outbound_webhooks
    ADD CONSTRAINT outbound_webhooks_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.outbound_webhooks (1) ───────────
CREATE INDEX IF NOT EXISTS idx_outbound_webhooks_active_events ON public.outbound_webhooks USING gin (events) WHERE (active = true);

-- ─────────── POLICIES: public.outbound_webhooks (1) ───────────
DROP POLICY IF EXISTS "Admins manage outbound_webhooks" ON public.outbound_webhooks;
CREATE POLICY "Admins manage outbound_webhooks" ON public.outbound_webhooks USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ─────────── TABLE: public.webhook_deliveries ───────────
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid NOT NULL,
    event text NOT NULL,
    payload jsonb,
    payload_hash text,
    status_code integer,
    response_body_truncated text,
    attempt integer DEFAULT 1 NOT NULL,
    success boolean DEFAULT false NOT NULL,
    error_message text,
    delivered_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Constraints (2, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.outbound_webhooks(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.webhook_deliveries (2) ───────────
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_time ON public.webhook_deliveries USING btree (event, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_time ON public.webhook_deliveries USING btree (webhook_id, delivered_at DESC);

-- ─────────── POLICIES: public.webhook_deliveries (2) ───────────
DROP POLICY IF EXISTS "Admins delete webhook_deliveries" ON public.webhook_deliveries;
CREATE POLICY "Admins delete webhook_deliveries" ON public.webhook_deliveries FOR DELETE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read webhook_deliveries" ON public.webhook_deliveries;
CREATE POLICY "Admins read webhook_deliveries" ON public.webhook_deliveries FOR SELECT USING (public.is_admin(auth.uid()));

COMMIT;