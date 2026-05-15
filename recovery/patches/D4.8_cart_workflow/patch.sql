-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.4.8 Cart Workflow + Trash (P2)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: seller_carts ───
--

CREATE TABLE public.seller_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    company_id text NOT NULL,
    company_name text NOT NULL,
    company_location text,
    company_logo_url text,
    notes text,
    status text DEFAULT 'novo'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_seller_carts_seller_id ON public.seller_carts USING btree (seller_id);


--

--

ALTER TABLE public.seller_carts ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own carts" ON public.seller_carts TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--

--

CREATE TRIGGER trg_owner__seller_carts__seller_id BEFORE INSERT ON public.seller_carts FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--

-- ─── Table: seller_cart_items ───
--

CREATE TABLE public.seller_cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    product_id text NOT NULL,
    product_name text NOT NULL,
    product_sku text,
    product_image_url text,
    product_price numeric DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    color_name text,
    color_hex text,
    notes text,
    sort_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_seller_cart_items_cart_id ON public.seller_cart_items USING btree (cart_id);


--

--

ALTER TABLE public.seller_cart_items ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own cart items" ON public.seller_cart_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.seller_carts c
  WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.seller_carts c
  WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = auth.uid())))));


--

-- ─── Table: cart_templates ───
--

CREATE TABLE public.cart_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

CREATE INDEX idx_cart_templates_user_id ON public.cart_templates USING btree (user_id);


--

--

ALTER TABLE public.cart_templates ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own templates" ON public.cart_templates TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--

--

CREATE TRIGGER trg_owner__cart_templates__user_id BEFORE INSERT ON public.cart_templates FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--

-- ─── Table: follow_up_reminders ───
--

CREATE TABLE public.follow_up_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id text NOT NULL,
    seller_id uuid NOT NULL,
    reminder_type text DEFAULT 'expiring'::text NOT NULL,
    scheduled_for timestamp with time zone NOT NULL,
    is_sent boolean DEFAULT false NOT NULL,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    title text DEFAULT ''::text,
    notes text,
    is_completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone
);


--

--

CREATE INDEX idx_follow_up_pending ON public.follow_up_reminders USING btree (is_sent, scheduled_for);


--
--

CREATE INDEX idx_follow_up_reminders_completed ON public.follow_up_reminders USING btree (is_completed, scheduled_for);


--
--

CREATE INDEX idx_follow_up_reminders_seller_scheduled ON public.follow_up_reminders USING btree (seller_id, scheduled_for DESC);


--

--

ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own reminders" ON public.follow_up_reminders TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--

--

CREATE TRIGGER trg_owner__follow_up_reminders__seller_id BEFORE INSERT ON public.follow_up_reminders FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--

-- ─── Table: order_item_personalizations ───
--

CREATE TABLE public.order_item_personalizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_item_id uuid NOT NULL,
    technique_id uuid,
    technique_name text,
    location_id uuid,
    location_name text,
    image_url text,
    personalization_text text,
    price_adjustment numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--

--

CREATE INDEX idx_order_item_personalizations_order_item_id ON public.order_item_personalizations USING btree (order_item_id);


--

--

ALTER TABLE public.order_item_personalizations ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY order_item_p_select_scope ON public.order_item_personalizations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.id = order_item_personalizations.order_item_id) AND ((o.seller_id = auth.uid()) OR public.can_view_all_sales())))));


--

-- ─── Table: simulator_wizard_drafts ───
--

CREATE TABLE public.simulator_wizard_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text DEFAULT 'Rascunho'::text NOT NULL,
    product_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    quantity integer DEFAULT 100 NOT NULL,
    personalizations jsonb DEFAULT '[]'::jsonb NOT NULL,
    wizard_step text DEFAULT 'product'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

ALTER TABLE public.simulator_wizard_drafts ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can delete own drafts" ON public.simulator_wizard_drafts FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
--

CREATE POLICY "Users can insert own drafts" ON public.simulator_wizard_drafts FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
--

CREATE POLICY "Users can update own drafts" ON public.simulator_wizard_drafts FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
--

CREATE POLICY "Users can view own drafts" ON public.simulator_wizard_drafts FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--

-- ─── Table: video_variant_links ───
--

CREATE TABLE public.video_variant_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    video_id text NOT NULL,
    variant_id text NOT NULL,
    variant_name text,
    variant_color_hex text,
    supplier_code text,
    product_id text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--

--

ALTER TABLE public.video_variant_links ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Admins can manage video variant links" ON public.video_variant_links TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
--

CREATE POLICY "Authenticated users can read video variant links" ON public.video_variant_links FOR SELECT TO authenticated USING (true);


--

COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.4.8 Cart Workflow + Trash (P2)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

COMMIT;
