-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.3.5 Analytics/UX (P3)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: recently_viewed_products ───
--

CREATE TABLE public.recently_viewed_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_recently_viewed_user_at ON public.recently_viewed_products USING btree (user_id, viewed_at DESC);


--
--

CREATE INDEX idx_recently_viewed_user_viewed_at ON public.recently_viewed_products USING btree (user_id, viewed_at DESC);


--

--

ALTER TABLE public.recently_viewed_products ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can delete their own recently viewed products" ON public.recently_viewed_products FOR DELETE USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can insert their own recently viewed products" ON public.recently_viewed_products FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can update their own recently viewed products" ON public.recently_viewed_products FOR UPDATE USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can view their own recently viewed products" ON public.recently_viewed_products FOR SELECT USING ((auth.uid() = user_id));


--

--

CREATE TRIGGER trigger_limit_recently_viewed AFTER INSERT OR UPDATE ON public.recently_viewed_products FOR EACH ROW EXECUTE FUNCTION public.limit_recently_viewed_items();


--
--

CREATE TRIGGER trigger_limit_recently_viewed_products AFTER INSERT ON public.recently_viewed_products FOR EACH ROW EXECUTE FUNCTION public.limit_recently_viewed_products();


--

-- ─── Table: user_search_history ───
--

CREATE TABLE public.user_search_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    query_text text NOT NULL,
    history_type text DEFAULT 'general'::text NOT NULL,
    result_count integer DEFAULT 0,
    is_pinned boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--

--

CREATE INDEX idx_user_search_history_pinned ON public.user_search_history USING btree (is_pinned);


--
--

CREATE INDEX idx_user_search_history_type ON public.user_search_history USING btree (history_type);


--
--

CREATE INDEX idx_user_search_history_user_id ON public.user_search_history USING btree (user_id);


--

--

ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage their own search history" ON public.user_search_history USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--

--

CREATE TRIGGER limit_user_search_history AFTER INSERT ON public.user_search_history FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_search_history();


--
--

CREATE TRIGGER update_user_search_history_updated_at BEFORE UPDATE ON public.user_search_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--

-- ─── Table: search_analytics ───
--

CREATE TABLE public.search_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    search_term text NOT NULL,
    results_count integer DEFAULT 0 NOT NULL,
    search_context text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_search_analytics_created_at ON public.search_analytics USING btree (created_at DESC);


--
--

CREATE INDEX idx_search_analytics_term_lower ON public.search_analytics USING btree (lower(search_term));


--
--

CREATE INDEX idx_search_analytics_zero_results ON public.search_analytics USING btree (created_at DESC) WHERE (results_count = 0);


--

--

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Authenticated users can log searches" ON public.search_analytics FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
--

CREATE POLICY "Managers and admins can read search analytics" ON public.search_analytics FOR SELECT TO authenticated USING (public.is_manager_or_admin());


--

-- ─── Table: user_preferences ───
--

CREATE TABLE public.user_preferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    comparison_weights jsonb DEFAULT '{"price": 35, "stock": 20, "colors": 10, "minQty": 15, "leadTime": 10, "verified": 10}'::jsonb NOT NULL,
    comparison_column_order jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    filter_states jsonb DEFAULT '{}'::jsonb NOT NULL
);


--

--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users update own preferences" ON public.user_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users view own preferences" ON public.user_preferences FOR SELECT USING ((auth.uid() = user_id));


--

--

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--

-- ─── Table: saved_trends_views ───
--

CREATE TABLE public.saved_trends_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_saved_trends_views_user ON public.saved_trends_views USING btree (user_id);


--

--

ALTER TABLE public.saved_trends_views ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users manage own saved trends views" ON public.saved_trends_views TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--

--

CREATE TRIGGER trg_owner__saved_trends_views__user_id BEFORE INSERT ON public.saved_trends_views FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
--

CREATE TRIGGER update_saved_trends_views_updated_at BEFORE UPDATE ON public.saved_trends_views FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--

-- ─── Table: scheduled_reports ───
--

CREATE TABLE public.scheduled_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    report_type text DEFAULT 'sales'::text NOT NULL,
    frequency text DEFAULT 'weekly'::text NOT NULL,
    email_to text NOT NULL,
    report_name text DEFAULT 'Relatório'::text NOT NULL,
    filters jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    last_sent_at timestamp with time zone,
    next_run_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT valid_frequency CHECK ((frequency = ANY (ARRAY['daily'::text, 'weekly'::text, 'monthly'::text]))),
    CONSTRAINT valid_report_type CHECK ((report_type = ANY (ARRAY['sales'::text, 'quotes'::text, 'clients'::text, 'products'::text, 'orders'::text])))
);


--

--

CREATE INDEX idx_scheduled_reports_next_run ON public.scheduled_reports USING btree (next_run_at) WHERE (is_active = true);


--

--

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can create own scheduled reports" ON public.scheduled_reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can delete own scheduled reports" ON public.scheduled_reports FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can update own scheduled reports" ON public.scheduled_reports FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
--

CREATE POLICY "Users can view own scheduled reports" ON public.scheduled_reports FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--

--

CREATE TRIGGER trg_owner__scheduled_reports__user_id BEFORE INSERT ON public.scheduled_reports FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
--

CREATE TRIGGER trg_validate_report_email BEFORE INSERT OR UPDATE ON public.scheduled_reports FOR EACH ROW EXECUTE FUNCTION public.validate_scheduled_report_email();


--

-- ─── Table: product_views ───
--

CREATE TABLE public.product_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id text,
    product_sku text,
    product_name text,
    seller_id uuid,
    view_type text DEFAULT 'detail'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_product_views_product_id ON public.product_views USING btree (product_id);


--
--

CREATE INDEX idx_product_views_seller ON public.product_views USING btree (seller_id, created_at DESC);


--

--

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins can read all views" ON public.product_views FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
--

CREATE POLICY "Users can insert own views" ON public.product_views FOR INSERT TO authenticated WITH CHECK ((seller_id = auth.uid()));


--
--

CREATE POLICY "Users can view own views" ON public.product_views FOR SELECT TO authenticated USING ((seller_id = auth.uid()));


--

COMMIT;
