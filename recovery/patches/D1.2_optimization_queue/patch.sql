-- ═══════════════════════════════════════════════════════════════════
-- PATCH D1.2_optimization_queue — Optimization Queue
-- Prioridade: P1
-- Extraído por extract_objects_v3.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── TABLE: public.optimization_queue ───────────
CREATE TABLE IF NOT EXISTS public.optimization_queue (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    category text DEFAULT 'performance'::text NOT NULL,
    priority integer DEFAULT 100 NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    result jsonb,
    error text,
    guardrail_status text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT optimization_queue_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'done'::text, 'failed'::text, 'skipped'::text, 'blocked'::text])))
);

ALTER TABLE public.optimization_queue ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.optimization_queue
    ADD CONSTRAINT optimization_queue_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.optimization_queue (1) ───────────
CREATE INDEX IF NOT EXISTS idx_optimization_queue_status_priority ON public.optimization_queue USING btree (status, priority, created_at);

-- ─────────── POLICIES: public.optimization_queue (1) ───────────
CREATE POLICY "Devs manage optimization queue" ON public.optimization_queue TO authenticated USING (public.is_dev(auth.uid())) WITH CHECK (public.is_dev(auth.uid()));

-- ─────────── TABLE: public.optimization_queue_runs ───────────
CREATE TABLE IF NOT EXISTS public.optimization_queue_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue_id uuid NOT NULL,
    status text NOT NULL,
    notes text,
    guardrail_status text,
    duration_ms integer,
    executed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.optimization_queue_runs ENABLE ROW LEVEL SECURITY;

-- Constraints (2, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.optimization_queue_runs
    ADD CONSTRAINT optimization_queue_runs_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.optimization_queue_runs
    ADD CONSTRAINT optimization_queue_runs_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.optimization_queue(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.optimization_queue_runs (1) ───────────
CREATE INDEX IF NOT EXISTS idx_optimization_queue_runs_queue ON public.optimization_queue_runs USING btree (queue_id, created_at DESC);

-- ─────────── POLICIES: public.optimization_queue_runs (1) ───────────
CREATE POLICY "Admins manage optimization runs" ON public.optimization_queue_runs TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ─────────── TABLE: public.connection_test_history ───────────
CREATE TABLE IF NOT EXISTS public.connection_test_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connection_id uuid NOT NULL,
    tested_at timestamp with time zone DEFAULT now() NOT NULL,
    success boolean DEFAULT false NOT NULL,
    latency_ms integer,
    status_code integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    triggered_by text DEFAULT 'manual'::text NOT NULL,
    error_kind text,
    request_method text,
    request_url text,
    response_headers jsonb,
    response_body text,
    dns_ms integer,
    tcp_ms integer,
    tls_ms integer,
    ttfb_ms integer,
    download_ms integer,
    triggered_by_user_id uuid,
    attempts smallint DEFAULT 1 NOT NULL,
    CONSTRAINT connection_test_history_triggered_by_check CHECK ((triggered_by = ANY (ARRAY['manual'::text, 'cron'::text, 'webhook'::text])))
);

ALTER TABLE public.connection_test_history ENABLE ROW LEVEL SECURITY;

-- Constraints (2, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.connection_test_history
    ADD CONSTRAINT connection_test_history_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.connection_test_history
    ADD CONSTRAINT connection_test_history_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.external_connections(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.connection_test_history (2) ───────────
CREATE INDEX IF NOT EXISTS idx_connection_test_history_conn_time ON public.connection_test_history USING btree (connection_id, tested_at DESC);
CREATE INDEX IF NOT EXISTS idx_cth_triggered_by ON public.connection_test_history USING btree (triggered_by);

-- ─────────── POLICIES: public.connection_test_history (3) ───────────
CREATE POLICY "Devs delete connection_test_history" ON public.connection_test_history FOR DELETE TO authenticated USING (public.is_dev(auth.uid()));

CREATE POLICY "Devs read connection_test_history" ON public.connection_test_history FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));

CREATE POLICY "Service role inserts connection_test_history" ON public.connection_test_history FOR INSERT TO service_role WITH CHECK (true);

-- ─────────── FUNCTION: public.claim_next_optimization ───────────
CREATE OR REPLACE FUNCTION public.claim_next_optimization() RETURNS public.optimization_queue
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  claimed public.optimization_queue;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Bloqueia se já existe um running
  IF EXISTS (SELECT 1 FROM public.optimization_queue WHERE status = 'running') THEN
    RETURN NULL;
  END IF;

  UPDATE public.optimization_queue
     SET status = 'running', started_at = now()
   WHERE id = (
     SELECT id FROM public.optimization_queue
      WHERE status = 'pending'
      ORDER BY priority ASC, created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
   )
   RETURNING * INTO claimed;

  RETURN claimed;
END;
$$;

-- ─────────── FUNCTION: public.complete_optimization ───────────
CREATE OR REPLACE FUNCTION public.complete_optimization(_id uuid, _status text, _notes text DEFAULT NULL::text, _guardrail_status text DEFAULT NULL::text, _result jsonb DEFAULT NULL::jsonb, _error text DEFAULT NULL::text) RETURNS public.optimization_queue
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  updated public.optimization_queue;
  duration int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _status NOT IN ('done','failed','skipped','blocked') THEN
    RAISE EXCEPTION 'invalid status: %', _status;
  END IF;

  UPDATE public.optimization_queue
     SET status = _status,
         finished_at = now(),
         result = COALESCE(_result, result),
         error = _error,
         guardrail_status = COALESCE(_guardrail_status, guardrail_status)
   WHERE id = _id
   RETURNING * INTO updated;

  IF updated.id IS NULL THEN
    RAISE EXCEPTION 'optimization not found';
  END IF;

  duration := EXTRACT(EPOCH FROM (updated.finished_at - COALESCE(updated.started_at, updated.finished_at))) * 1000;

  INSERT INTO public.optimization_queue_runs (queue_id, status, notes, guardrail_status, duration_ms, executed_by)
  VALUES (_id, _status, _notes, _guardrail_status, duration, auth.uid());

  RETURN updated;
END;
$$;

-- ─────────── FUNCTION: public.enqueue_optimization ───────────
CREATE OR REPLACE FUNCTION public.enqueue_optimization(_title text, _description text DEFAULT NULL::text, _category text DEFAULT 'performance'::text, _priority integer DEFAULT 100) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.optimization_queue (title, description, category, priority, created_by)
  VALUES (_title, _description, COALESCE(_category,'performance'), COALESCE(_priority,100), auth.uid())
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- ─────────── FUNCTION: public.reset_optimization_queue ───────────
CREATE OR REPLACE FUNCTION public.reset_optimization_queue(_only_running boolean DEFAULT true) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  affected int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _only_running THEN
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL
     WHERE status = 'running';
  ELSE
    UPDATE public.optimization_queue
       SET status = 'pending', started_at = NULL, finished_at = NULL, error = NULL
     WHERE status IN ('running','failed','blocked');
  END IF;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- ─────────── FUNCTION: public.get_auto_test_job_status ───────────
CREATE OR REPLACE FUNCTION public.get_auto_test_job_status(_limit integer DEFAULT 20) RETURNS TABLE(run_started_at timestamp with time zone, run_ended_at timestamp with time zone, duration_ms integer, total_tested integer, ok_count integer, fail_count integer, retried_count integer, avg_latency_ms integer)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  RETURN QUERY
  WITH ordered AS (
    SELECT
      cth.tested_at,
      cth.success,
      cth.latency_ms,
      cth.attempts,
      date_trunc('minute', cth.tested_at) AS bucket
    FROM public.connection_test_history cth
    WHERE cth.triggered_by = 'cron'
      AND cth.tested_at > now() - interval '7 days'
  ),
  runs AS (
    SELECT
      o.bucket,
      MIN(o.tested_at) AS run_started_at,
      MAX(o.tested_at) AS run_ended_at,
      GREATEST(EXTRACT(EPOCH FROM (MAX(o.tested_at) - MIN(o.tested_at))) * 1000, 0)::int AS duration_ms,
      COUNT(*)::int AS total_tested,
      COUNT(*) FILTER (WHERE o.success)::int AS ok_count,
      COUNT(*) FILTER (WHERE NOT o.success)::int AS fail_count,
      COUNT(*) FILTER (WHERE o.attempts > 1)::int AS retried_count,
      COALESCE(AVG(o.latency_ms) FILTER (WHERE o.latency_ms IS NOT NULL), 0)::int AS avg_latency_ms
    FROM ordered o
    GROUP BY o.bucket
  )
  SELECT
    r.run_started_at,
    r.run_ended_at,
    r.duration_ms,
    r.total_tested,
    r.ok_count,
    r.fail_count,
    r.retried_count,
    r.avg_latency_ms
  FROM runs r
  ORDER BY r.run_started_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
END;
$$;

-- ─────────── FUNCTION: public.set_optimization_queue_updated_at ───────────
CREATE OR REPLACE FUNCTION public.set_optimization_queue_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMIT;