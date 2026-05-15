-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.3.2 Expert Chat (P3)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: expert_conversations ───
--

CREATE TABLE public.expert_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    client_id text,
    title text DEFAULT 'Nova Conversa'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_expert_conversations_seller_id ON public.expert_conversations USING btree (seller_id);


--

--

ALTER TABLE public.expert_conversations ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own conversations" ON public.expert_conversations TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--

--

CREATE TRIGGER trg_owner__expert_conversations__seller_id BEFORE INSERT ON public.expert_conversations FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--

-- ─── Table: expert_messages ───
--

CREATE TABLE public.expert_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_expert_messages_conversation_id ON public.expert_messages USING btree (conversation_id);


--

--

ALTER TABLE public.expert_messages ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own messages" ON public.expert_messages TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.expert_conversations
  WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.expert_conversations
  WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = auth.uid())))));


--

-- ─── Table: conversation_audit_logs ───
--

CREATE TABLE public.conversation_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id text NOT NULL,
    user_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    total_tokens_estimated integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active'::text NOT NULL,
    client_info jsonb DEFAULT '{}'::jsonb
);


--

--

CREATE INDEX idx_conv_audit_session_id ON public.conversation_audit_logs USING btree (session_id);


--
--

CREATE INDEX idx_conv_audit_user_id ON public.conversation_audit_logs USING btree (user_id);


--

--

ALTER TABLE public.conversation_audit_logs ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins e Managers podem ver todos os logs de conversa" ON public.conversation_audit_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
--

CREATE POLICY "Usuários podem criar seus próprios logs de conversa" ON public.conversation_audit_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Usuários podem ver seus próprios logs de conversa" ON public.conversation_audit_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

-- ─── Table: conversation_delivery_status ───
--

CREATE TABLE public.conversation_delivery_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    error_details text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_conv_delivery_event_id ON public.conversation_delivery_status USING btree (event_id);


--

--

ALTER TABLE public.conversation_delivery_status ENABLE ROW LEVEL SECURITY;

--

--

CREATE TRIGGER update_delivery_status_updated_at BEFORE UPDATE ON public.conversation_delivery_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--

-- ─── Table: conversation_event_history ───
--

CREATE TABLE public.conversation_event_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text NOT NULL,
    event_type public.conversation_event_type DEFAULT 'text'::public.conversation_event_type NOT NULL,
    content text,
    media_url text,
    media_metadata jsonb DEFAULT '{}'::jsonb,
    tokens_estimated integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id uuid
);


--

--

CREATE INDEX idx_conv_event_conv_id ON public.conversation_event_history USING btree (conversation_id);


--

--

ALTER TABLE public.conversation_event_history ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Acesso ao histórico de eventos segue o log de auditoria" ON public.conversation_event_history FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.conversation_audit_logs
  WHERE (conversation_audit_logs.id = conversation_event_history.conversation_id))));


--
--

CREATE POLICY "Inserção de eventos permitida para o dono da conversa" ON public.conversation_event_history FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversation_audit_logs
  WHERE ((conversation_audit_logs.id = conversation_event_history.conversation_id) AND (conversation_audit_logs.user_id = auth.uid())))));


--

COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.3.2 Expert Chat (P3)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

COMMIT;
