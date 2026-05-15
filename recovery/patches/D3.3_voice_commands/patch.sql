-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.3.3 Voice Commands (P3)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: voice_command_logs ───
--

CREATE TABLE public.voice_command_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    transcript text NOT NULL,
    action text NOT NULL,
    response text,
    data jsonb DEFAULT '{}'::jsonb,
    duration_ms integer,
    success boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_voice_command_logs_user_created ON public.voice_command_logs USING btree (user_id, created_at DESC);


--

--

ALTER TABLE public.voice_command_logs ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins can view all voice logs" ON public.voice_command_logs FOR SELECT TO authenticated USING (public.is_manager_or_admin());


--
--

CREATE POLICY "Users can insert own voice logs" ON public.voice_command_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can view own voice logs" ON public.voice_command_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.3.3 Voice Commands (P3)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

COMMIT;
