-- ═══════════════════════════════════════════════════════════════════
-- PATCH D2.3_mcp_keys — MCP API Keys System
-- Prioridade: P2
-- Extraído por extract_d2.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── TABLE: public.mcp_api_keys ───────────
CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    key_hash text NOT NULL,
    key_prefix text NOT NULL,
    scopes text[] DEFAULT ARRAY[]::text[] NOT NULL,
    description text,
    created_by uuid NOT NULL,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    rotated_from uuid,
    CONSTRAINT mcp_api_keys_key_hash_format_chk CHECK (((length(key_hash) = 64) AND (key_hash ~ '^[0-9a-f]{64}$'::text)))
);

ALTER TABLE ONLY public.mcp_api_keys FORCE ROW LEVEL SECURITY;

ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Constraints (3, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.mcp_api_keys
    ADD CONSTRAINT mcp_api_keys_key_hash_key UNIQUE (key_hash); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.mcp_api_keys
    ADD CONSTRAINT mcp_api_keys_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.mcp_api_keys
    ADD CONSTRAINT mcp_api_keys_rotated_from_fkey FOREIGN KEY (rotated_from) REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.mcp_api_keys (1) ───────────
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_rotated_from ON public.mcp_api_keys USING btree (rotated_from) WHERE (rotated_from IS NOT NULL);

-- ─────────── POLICIES: public.mcp_api_keys (4) ───────────
DROP POLICY IF EXISTS "Devs read mcp_api_keys" ON public.mcp_api_keys;
CREATE POLICY "Devs read mcp_api_keys" ON public.mcp_api_keys FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));

DROP POLICY IF EXISTS "No direct delete via JWT" ON public.mcp_api_keys;
CREATE POLICY "No direct delete via JWT" ON public.mcp_api_keys FOR DELETE TO authenticated USING (false);

DROP POLICY IF EXISTS "No direct insert via JWT" ON public.mcp_api_keys;
CREATE POLICY "No direct insert via JWT" ON public.mcp_api_keys FOR INSERT TO authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "No direct update via JWT" ON public.mcp_api_keys;
CREATE POLICY "No direct update via JWT" ON public.mcp_api_keys FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

-- ─────────── TABLE: public.mcp_key_auto_revocations ───────────
CREATE TABLE IF NOT EXISTS public.mcp_key_auto_revocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_id uuid NOT NULL,
    created_by uuid NOT NULL,
    revoked_at timestamp with time zone DEFAULT now() NOT NULL,
    source text NOT NULL,
    reason text DEFAULT 'creator_lost_dev_role'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mcp_key_auto_revocations_source_check CHECK ((source = ANY (ARRAY['trigger'::text, 'cron'::text, 'manual'::text])))
);

ALTER TABLE public.mcp_key_auto_revocations ENABLE ROW LEVEL SECURITY;

-- Constraints (2, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.mcp_key_auto_revocations
    ADD CONSTRAINT mcp_key_auto_revocations_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
  BEGIN ALTER TABLE ONLY public.mcp_key_auto_revocations
    ADD CONSTRAINT mcp_key_auto_revocations_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.mcp_api_keys(id) ON DELETE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.mcp_key_auto_revocations (2) ───────────
CREATE INDEX IF NOT EXISTS idx_mcp_auto_rev_key ON public.mcp_key_auto_revocations USING btree (key_id);
CREATE INDEX IF NOT EXISTS idx_mcp_auto_rev_user ON public.mcp_key_auto_revocations USING btree (created_by, revoked_at DESC);

-- ─────────── POLICIES: public.mcp_key_auto_revocations (1) ───────────
DROP POLICY IF EXISTS "Devs can view auto-revocations" ON public.mcp_key_auto_revocations;
CREATE POLICY "Devs can view auto-revocations" ON public.mcp_key_auto_revocations FOR SELECT USING (public.is_dev(auth.uid()));

-- ─────────── TABLE: public.mcp_full_grantors ───────────
CREATE TABLE IF NOT EXISTS public.mcp_full_grantors (
    user_id uuid NOT NULL,
    granted_by uuid,
    reason text,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.mcp_full_grantors ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.mcp_full_grantors
    ADD CONSTRAINT mcp_full_grantors_pkey PRIMARY KEY (user_id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── POLICIES: public.mcp_full_grantors (2) ───────────
DROP POLICY IF EXISTS "Admins manage mcp_full_grantors" ON public.mcp_full_grantors;
CREATE POLICY "Admins manage mcp_full_grantors" ON public.mcp_full_grantors TO authenticated USING (public.is_admin_strict(auth.uid())) WITH CHECK (public.is_admin_strict(auth.uid()));

DROP POLICY IF EXISTS "Devs read mcp_full_grantors" ON public.mcp_full_grantors;
CREATE POLICY "Devs read mcp_full_grantors" ON public.mcp_full_grantors FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));

-- ─────────── TABLE: public.mcp_access_violations ───────────
CREATE TABLE IF NOT EXISTS public.mcp_access_violations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    reason text NOT NULL,
    source text NOT NULL,
    operation text,
    target_key_id uuid,
    ip_address text,
    user_agent text,
    request_id text,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.mcp_access_violations ENABLE ROW LEVEL SECURITY;

-- Constraints (1, com proteção contra duplicidade)
DO $$ BEGIN
  BEGIN ALTER TABLE ONLY public.mcp_access_violations
    ADD CONSTRAINT mcp_access_violations_pkey PRIMARY KEY (id); EXCEPTION WHEN duplicate_object THEN NULL; WHEN OTHERS THEN NULL; END;
END $$;

-- ─────────── INDEXES: public.mcp_access_violations (3) ───────────
CREATE INDEX IF NOT EXISTS idx_mcp_violations_created ON public.mcp_access_violations USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_violations_ip_created ON public.mcp_access_violations USING btree (ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_violations_user_created ON public.mcp_access_violations USING btree (user_id, created_at DESC);

-- ─────────── POLICIES: public.mcp_access_violations (1) ───────────
DROP POLICY IF EXISTS "Admins read mcp violations" ON public.mcp_access_violations;
CREATE POLICY "Admins read mcp violations" ON public.mcp_access_violations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- ─────────── FUNCTION: public.can_grant_mcp_full ───────────
CREATE OR REPLACE FUNCTION public.can_grant_mcp_full(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.is_dev(_user_id);
$$;

COMMIT;