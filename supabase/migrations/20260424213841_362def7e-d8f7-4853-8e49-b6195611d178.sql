-- Optimization queue tables + RPCs

CREATE TABLE IF NOT EXISTS public.optimization_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'performance',
  priority int NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'pending',
  result jsonb,
  error text,
  guardrail_status text,
  started_at timestamptz,
  finished_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT optimization_queue_status_check
    CHECK (status IN ('pending','running','done','failed','skipped','blocked'))
);

CREATE INDEX IF NOT EXISTS idx_optimization_queue_status_priority
  ON public.optimization_queue (status, priority ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS public.optimization_queue_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid NOT NULL REFERENCES public.optimization_queue(id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  guardrail_status text,
  duration_ms int,
  executed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_optimization_queue_runs_queue
  ON public.optimization_queue_runs (queue_id, created_at DESC);

ALTER TABLE public.optimization_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.optimization_queue_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage optimization queue" ON public.optimization_queue;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'optimization_queue' AND policyname = 'Admins manage optimization queue') THEN
    CREATE POLICY "Admins manage optimization queue"
      ON public.optimization_queue
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP POLICY IF EXISTS "Admins manage optimization runs" ON public.optimization_queue_runs;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'optimization_queue_runs' AND policyname = 'Admins manage optimization runs') THEN
    CREATE POLICY "Admins manage optimization runs"
      ON public.optimization_queue_runs
      FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Trigger: updated_at
CREATE OR REPLACE FUNCTION public.set_optimization_queue_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_optimization_queue_updated_at ON public.optimization_queue;
DROP TRIGGER IF EXISTS trg_optimization_queue_updated_at ON public.optimization_queue;
CREATE TRIGGER trg_optimization_queue_updated_at
BEFORE UPDATE ON public.optimization_queue
FOR EACH ROW EXECUTE FUNCTION public.set_optimization_queue_updated_at();

-- RPC: enqueue
CREATE OR REPLACE FUNCTION public.enqueue_optimization(
  _title text,
  _description text DEFAULT NULL,
  _category text DEFAULT 'performance',
  _priority int DEFAULT 100
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- RPC: claim next pending (atomic)
CREATE OR REPLACE FUNCTION public.claim_next_optimization()
RETURNS public.optimization_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- RPC: complete
CREATE OR REPLACE FUNCTION public.complete_optimization(
  _id uuid,
  _status text,
  _notes text DEFAULT NULL,
  _guardrail_status text DEFAULT NULL,
  _result jsonb DEFAULT NULL,
  _error text DEFAULT NULL
)
RETURNS public.optimization_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- RPC: reset stuck running -> pending
CREATE OR REPLACE FUNCTION public.reset_optimization_queue(_only_running boolean DEFAULT true)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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