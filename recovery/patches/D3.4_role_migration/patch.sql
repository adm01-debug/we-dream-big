-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.3.4 Role Migration (P3)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: role_migration_batches ───
--

CREATE TABLE public.role_migration_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    reason text NOT NULL,
    initiated_by uuid NOT NULL,
    dry_run boolean DEFAULT false NOT NULL,
    status public.role_migration_status DEFAULT 'pending'::public.role_migration_status NOT NULL,
    total_items integer DEFAULT 0 NOT NULL,
    success_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    skipped_count integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_role_mig_batches_created_at ON public.role_migration_batches USING btree (created_at DESC);


--
--

CREATE INDEX idx_role_mig_batches_initiated_by ON public.role_migration_batches USING btree (initiated_by);


--

--

ALTER TABLE public.role_migration_batches ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "No direct delete role_migration_batches" ON public.role_migration_batches FOR DELETE TO authenticated USING (false);


--
--

CREATE POLICY "No direct insert role_migration_batches" ON public.role_migration_batches FOR INSERT TO authenticated WITH CHECK (false);


--
--

CREATE POLICY "No direct update role_migration_batches" ON public.role_migration_batches FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


--
--

CREATE POLICY "Supervisors+ can read role_migration_batches" ON public.role_migration_batches FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--

-- ─── Table: role_migration_items ───
--

CREATE TABLE public.role_migration_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_email text,
    from_role public.app_role,
    to_role public.app_role NOT NULL,
    operation text NOT NULL,
    status public.role_migration_item_status DEFAULT 'pending'::public.role_migration_item_status NOT NULL,
    error_message text,
    duration_ms integer,
    processed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT role_migration_items_operation_check CHECK ((operation = ANY (ARRAY['add'::text, 'remove'::text, 'replace'::text])))
);


--

--

CREATE INDEX idx_role_mig_items_batch ON public.role_migration_items USING btree (batch_id);


--
--

CREATE INDEX idx_role_mig_items_status ON public.role_migration_items USING btree (status);


--
--

CREATE INDEX idx_role_mig_items_user ON public.role_migration_items USING btree (user_id);


--

--

ALTER TABLE public.role_migration_items ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "No direct delete role_migration_items" ON public.role_migration_items FOR DELETE TO authenticated USING (false);


--
--

CREATE POLICY "No direct insert role_migration_items" ON public.role_migration_items FOR INSERT TO authenticated WITH CHECK (false);


--
--

CREATE POLICY "No direct update role_migration_items" ON public.role_migration_items FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


--
--

CREATE POLICY "Supervisors+ can read role_migration_items" ON public.role_migration_items FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--

COMMIT;
