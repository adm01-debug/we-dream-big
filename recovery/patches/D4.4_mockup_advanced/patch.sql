-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.4.4 Mockup Advanced (P2)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: mockup_drafts ───
--

CREATE TABLE public.mockup_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    draft_key text DEFAULT 'default'::text NOT NULL,
    product_id text,
    product_name text,
    technique_id text,
    technique_name text,
    client_id text,
    client_name text,
    personalization_areas jsonb DEFAULT '[]'::jsonb,
    logo_data text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

ALTER TABLE public.mockup_drafts ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own drafts" ON public.mockup_drafts TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--

--

CREATE TRIGGER trg_owner__mockup_drafts__user_id BEFORE INSERT ON public.mockup_drafts FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--

-- ─── Table: mockup_prompt_configs ───
--

CREATE TABLE public.mockup_prompt_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_key text NOT NULL,
    label text NOT NULL,
    prompt_text text NOT NULL,
    ai_model text DEFAULT 'google/gemini-2.5-flash-image-preview'::text NOT NULL,
    technique_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_mockup_prompt_configs_key ON public.mockup_prompt_configs USING btree (config_key);


--
--

CREATE INDEX idx_mockup_prompt_configs_technique ON public.mockup_prompt_configs USING btree (technique_id);


--

--

ALTER TABLE public.mockup_prompt_configs ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins manage prompt configs" ON public.mockup_prompt_configs USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--

--

CREATE TRIGGER trg_log_mockup_prompt_change BEFORE UPDATE ON public.mockup_prompt_configs FOR EACH ROW EXECUTE FUNCTION public.log_mockup_prompt_change();


--
--

CREATE TRIGGER update_mockup_prompt_configs_updated_at BEFORE UPDATE ON public.mockup_prompt_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--

-- ─── Table: mockup_prompt_history ───
--

CREATE TABLE public.mockup_prompt_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    config_id uuid NOT NULL,
    config_key text NOT NULL,
    old_prompt text,
    new_prompt text NOT NULL,
    ai_model text NOT NULL,
    version integer NOT NULL,
    changed_by uuid,
    change_notes text,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_mockup_prompt_history_config ON public.mockup_prompt_history USING btree (config_id, changed_at DESC);


--

--

ALTER TABLE public.mockup_prompt_history ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins insert prompt history" ON public.mockup_prompt_history FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
--

CREATE POLICY "Admins view prompt history" ON public.mockup_prompt_history FOR SELECT USING (public.is_admin(auth.uid()));


--

COMMIT;
