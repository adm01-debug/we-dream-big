-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.4.1 Step-Up MFA Completo (P2)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: step_up_challenges ───
--

CREATE TABLE public.step_up_challenges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action public.step_up_action NOT NULL,
    target_ref text,
    otp_hash text NOT NULL,
    attempts smallint DEFAULT 0 NOT NULL,
    max_attempts smallint DEFAULT 5 NOT NULL,
    password_verified boolean DEFAULT false NOT NULL,
    otp_verified boolean DEFAULT false NOT NULL,
    consumed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL,
    ip_address inet,
    user_agent text
);


--

--

CREATE INDEX idx_step_up_challenges_expires ON public.step_up_challenges USING btree (expires_at) WHERE (consumed = false);


--
--

CREATE INDEX idx_step_up_challenges_user ON public.step_up_challenges USING btree (user_id, created_at DESC);


--

--

ALTER TABLE public.step_up_challenges ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can view own challenges" ON public.step_up_challenges FOR SELECT USING ((auth.uid() = user_id));


--

-- ─── Table: step_up_tokens ───
--

CREATE TABLE public.step_up_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action public.step_up_action NOT NULL,
    target_ref text,
    token_hash text NOT NULL,
    challenge_id uuid NOT NULL,
    consumed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:05:00'::interval) NOT NULL,
    consumed_at timestamp with time zone
);


--

--

CREATE INDEX idx_step_up_tokens_challenge_id ON public.step_up_tokens USING btree (challenge_id);


--
--

CREATE INDEX idx_step_up_tokens_hash ON public.step_up_tokens USING btree (token_hash) WHERE (consumed = false);


--
--

CREATE INDEX idx_step_up_tokens_user ON public.step_up_tokens USING btree (user_id, created_at DESC);


--

--

ALTER TABLE public.step_up_tokens ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can view own tokens" ON public.step_up_tokens FOR SELECT USING ((auth.uid() = user_id));


--

-- ─── Table: user_token_revocations ───
--

CREATE TABLE public.user_token_revocations (
    user_id uuid NOT NULL,
    revoked_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

ALTER TABLE public.user_token_revocations ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Supervisors can manage revocations" ON public.user_token_revocations TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
--

CREATE POLICY "Users can view own revocation" ON public.user_token_revocations FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

-- ─── Table: public_token_failures ───
--

CREATE TABLE public.public_token_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    attempted_token text,
    ip_address text,
    user_agent text,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT public_token_failures_resource_type_check CHECK ((resource_type = ANY (ARRAY['quote'::text, 'kit'::text])))
);


--

--

CREATE INDEX idx_public_token_failures_ip ON public.public_token_failures USING btree (ip_address, created_at DESC);


--
--

CREATE INDEX idx_public_token_failures_resource ON public.public_token_failures USING btree (resource_type, resource_id, created_at DESC);


--

--

ALTER TABLE public.public_token_failures ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins read token failures" ON public.public_token_failures FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
--

CREATE POLICY "Service role inserts token failures" ON public.public_token_failures FOR INSERT TO service_role WITH CHECK (true);


--

COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.4.1 Step-Up MFA Completo (P2)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

COMMIT;
