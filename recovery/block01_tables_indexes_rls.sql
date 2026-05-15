-- Generated from pg_dump --schema-only --schema=public

-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: optimization_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_queue (
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


--
-- Name: quote_approval_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_approval_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id text NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    seller_id uuid NOT NULL,
    client_name text,
    client_email text,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    viewed_at timestamp with time zone,
    responded_at timestamp with time zone,
    response text,
    response_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    signer_name text,
    signer_document text,
    signer_ip text,
    signer_user_agent text,
    signature_hash text,
    signed_at timestamp with time zone
);


--
-- Name: access_security_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_security_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_whitelist_enabled boolean DEFAULT false,
    city_whitelist_enabled boolean DEFAULT false,
    block_unknown_locations boolean DEFAULT false,
    max_failed_attempts integer DEFAULT 5,
    lockout_duration_minutes integer DEFAULT 15,
    strict_access_mode boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb,
    source text
)
PARTITION BY RANGE (created_at);


--
-- Name: admin_audit_log_old; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log_old (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb DEFAULT '{}'::jsonb,
    source text
);


--
-- Name: admin_audit_log_y2025m12; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log_y2025m12 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb,
    source text
);


--
-- Name: admin_audit_log_y2026m01; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log_y2026m01 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb,
    source text
);


--
-- Name: admin_audit_log_y2026m02; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log_y2026m02 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb,
    source text
);


--
-- Name: admin_audit_log_y2026m03; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log_y2026m03 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb,
    source text
);


--
-- Name: admin_audit_log_y2026m04; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log_y2026m04 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb,
    source text
);


--
-- Name: admin_audit_log_y2026m05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log_y2026m05 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb,
    source text
);


--
-- Name: admin_audit_log_y2026m06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log_y2026m06 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    details jsonb,
    ip_address text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    request_id text,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    duration_ms integer,
    status text,
    payload_summary jsonb,
    source text
);


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    value jsonb DEFAULT '{}'::jsonb NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_insights_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_insights_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    function_name text NOT NULL,
    cache_key text NOT NULL,
    payload jsonb NOT NULL,
    model text,
    tokens_input integer,
    tokens_output integer,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL
);


--
-- Name: ai_usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    function_name text NOT NULL,
    event_type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_usage_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    function_name text NOT NULL,
    model text,
    input_tokens integer DEFAULT 0,
    output_tokens integer DEFAULT 0,
    total_tokens integer DEFAULT 0,
    estimated_cost_usd numeric(10,6) DEFAULT 0,
    duration_ms integer,
    status text DEFAULT 'success'::text NOT NULL,
    error_message text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_usage_quotas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage_quotas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    monthly_limit integer DEFAULT 100 NOT NULL,
    is_unlimited boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_vitals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_vitals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    rating text,
    request_id text,
    page_url text,
    user_agent text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: art_file_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.art_file_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    mockup_id uuid,
    quote_id uuid,
    file_url text NOT NULL,
    file_path text NOT NULL,
    original_name text NOT NULL,
    mime_type text,
    file_size_bytes bigint,
    file_extension text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    endpoint text NOT NULL,
    identifier text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: auth_login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    ip_address text,
    success boolean DEFAULT false NOT NULL,
    failure_reason text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: bot_detection_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bot_detection_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    user_agent text,
    endpoint text NOT NULL,
    detection_reason text NOT NULL,
    request_count integer DEFAULT 1,
    blocked boolean DEFAULT false NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: cart_templates; Type: TABLE; Schema: public; Owner: -
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
-- Name: category_icons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_icons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name text NOT NULL,
    icon text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collection_item_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_item_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id uuid NOT NULL,
    item_id uuid NOT NULL,
    anon_id text NOT NULL,
    emoji text NOT NULL,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collection_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    collection_id uuid NOT NULL,
    product_id text NOT NULL,
    color_name text,
    color_hex text,
    thumbnail_url text,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    price_at_save numeric,
    added_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: collection_items_trash; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_items_trash (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_id uuid NOT NULL,
    collection_id uuid NOT NULL,
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    color_name text,
    color_hex text,
    thumbnail_url text,
    notes text,
    price_at_save numeric,
    sort_order integer,
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL
);


--
-- Name: collections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_featured boolean DEFAULT false NOT NULL,
    icon_color text DEFAULT '#3b82f6'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    icon text DEFAULT '📁'::text,
    client_id text,
    client_name text,
    share_token text,
    share_expires_at timestamp with time zone,
    is_public boolean DEFAULT false NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: comparison_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comparison_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comparison_id uuid NOT NULL,
    item_index integer DEFAULT 0 NOT NULL,
    emoji text NOT NULL,
    anon_id text NOT NULL,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: component_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.component_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    component_id text NOT NULL,
    product_id text NOT NULL,
    media_type text DEFAULT 'image'::text NOT NULL,
    url text NOT NULL,
    title text,
    sort_order integer DEFAULT 0,
    is_cover boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT component_media_media_type_check CHECK ((media_type = ANY (ARRAY['image'::text, 'video'::text])))
);


--
-- Name: connection_test_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connection_test_history (
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


--
-- Name: conversation_audit_logs; Type: TABLE; Schema: public; Owner: -
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
-- Name: conversation_delivery_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversation_delivery_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_id uuid NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    error_details text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversation_event_history; Type: TABLE; Schema: public; Owner: -
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
-- Name: custom_kits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_kits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'Kit sem nome'::text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    box_data jsonb,
    items_data jsonb DEFAULT '[]'::jsonb NOT NULL,
    personalization_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    kit_quantity integer DEFAULT 1 NOT NULL,
    box_price numeric DEFAULT 0 NOT NULL,
    items_price numeric DEFAULT 0 NOT NULL,
    personalization_price numeric DEFAULT 0 NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL,
    volume_usage_percent numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kit_type text DEFAULT 'montado'::text NOT NULL,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    tag text,
    icon text DEFAULT 'Package'::text NOT NULL,
    description text,
    is_favorite boolean DEFAULT false NOT NULL,
    last_used_at timestamp with time zone,
    is_pinned boolean DEFAULT false NOT NULL
);


--
-- Name: discount_approval_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.discount_approval_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    requested_discount_percent numeric NOT NULL,
    max_allowed_percent numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    admin_id uuid,
    admin_notes text,
    seller_notes text,
    responded_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: e2e_cleanup_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.e2e_cleanup_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    user_id uuid,
    dry_run boolean DEFAULT true NOT NULL,
    status text NOT NULL,
    reason text,
    ip text,
    user_agent text,
    total_deleted integer DEFAULT 0 NOT NULL,
    deleted_by_table jsonb DEFAULT '{}'::jsonb NOT NULL,
    errors jsonb DEFAULT '{}'::jsonb NOT NULL,
    duration_ms integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    seller_scope text,
    seller_id uuid,
    name_filter_prefix text,
    CONSTRAINT e2e_cleanup_audit_status_check CHECK ((status = ANY (ARRAY['ok'::text, 'error'::text, 'rate_limited'::text, 'unauthorized'::text, 'forbidden'::text, 'not_found'::text, 'invalid'::text])))
);


--
-- Name: e2e_cleanup_rate_limit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.e2e_cleanup_rate_limit (
    key text NOT NULL,
    count integer DEFAULT 0 NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: expert_conversations; Type: TABLE; Schema: public; Owner: -
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
-- Name: expert_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expert_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    conversation_id uuid NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: external_connections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_connections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text NOT NULL,
    name text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    secret_refs text[] DEFAULT ARRAY[]::text[] NOT NULL,
    status text DEFAULT 'unconfigured'::text NOT NULL,
    last_test_at timestamp with time zone,
    last_test_ok boolean,
    last_test_message text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_latency_ms integer,
    env_key text,
    auto_test_enabled boolean DEFAULT true NOT NULL,
    CONSTRAINT external_connections_status_check CHECK ((status = ANY (ARRAY['unconfigured'::text, 'active'::text, 'degraded'::text, 'error'::text, 'disabled'::text]))),
    CONSTRAINT external_connections_type_check CHECK ((type = ANY (ARRAY['supabase'::text, 'bitrix24'::text, 'n8n'::text, 'mcp'::text, 'webhook_outbound'::text, 'webhook_inbound'::text])))
);


--
-- Name: external_connections_sync_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_connections_sync_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ran_at timestamp with time zone DEFAULT now() NOT NULL,
    triggered_by_user_id uuid,
    triggered_by_secret_name text,
    trigger_op text,
    processed integer DEFAULT 0 NOT NULL,
    created_count integer DEFAULT 0 NOT NULL,
    updated_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'ok'::text NOT NULL,
    error_message text,
    duration_ms integer,
    details jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: favorite_item_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_item_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    item_id uuid NOT NULL,
    list_id uuid NOT NULL,
    anon_id text NOT NULL,
    emoji text NOT NULL,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT favorite_item_reactions_emoji_check CHECK ((emoji = ANY (ARRAY['👍'::text, '❤️'::text, '🔥'::text, '💡'::text])))
);


--
-- Name: favorite_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_id uuid NOT NULL,
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    variant_id text,
    variant_info jsonb,
    note text,
    price_at_save numeric(12,2),
    "position" integer DEFAULT 0 NOT NULL,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT favorite_items_note_check CHECK ((char_length(note) <= 280))
);


--
-- Name: favorite_items_trash; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_items_trash (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    original_id uuid NOT NULL,
    list_id uuid NOT NULL,
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    variant_id text,
    variant_info jsonb,
    note text,
    price_at_save numeric(12,2),
    deleted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL
);


--
-- Name: favorite_lists; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorite_lists (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'Minha lista'::text NOT NULL,
    description text,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    icon text DEFAULT 'Heart'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_archived boolean DEFAULT false NOT NULL,
    client_id text,
    client_name text,
    shared_token text,
    shared_expires_at timestamp with time zone,
    "position" integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    variant_info jsonb,
    added_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: file_scan_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.file_scan_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    bucket character varying(255) NOT NULL,
    path text NOT NULL,
    hash character varying(64) NOT NULL,
    scan_result jsonb DEFAULT '{}'::jsonb NOT NULL,
    status_code integer NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: follow_up_reminders; Type: TABLE; Schema: public; Owner: -
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
-- Name: generated_mockups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.generated_mockups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    client_id text,
    client_name text,
    product_id text,
    product_name text,
    product_sku text,
    technique_id text,
    technique_name text,
    logo_url text,
    mockup_url text,
    layout_url text,
    position_x numeric,
    position_y numeric,
    logo_width_cm numeric,
    logo_height_cm numeric,
    location_name text,
    colors_count integer,
    annotations jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: geo_allowed_countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.geo_allowed_countries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    country_code character(2) NOT NULL,
    country_name text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: hardening_health_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.hardening_health_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL,
    score integer NOT NULL,
    max_score integer DEFAULT 5 NOT NULL,
    failures text[] DEFAULT ARRAY[]::text[] NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inbound_webhook_endpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_webhook_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slug text NOT NULL,
    name text NOT NULL,
    source_system text NOT NULL,
    hmac_secret_ref text NOT NULL,
    allowed_events text[] DEFAULT ARRAY[]::text[] NOT NULL,
    active boolean DEFAULT true NOT NULL,
    description text,
    created_by uuid NOT NULL,
    last_received_at timestamp with time zone,
    total_received integer DEFAULT 0 NOT NULL,
    total_invalid integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inbound_webhook_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_webhook_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    endpoint_id uuid NOT NULL,
    event_type text,
    payload jsonb,
    signature_valid boolean DEFAULT false NOT NULL,
    processed boolean DEFAULT false NOT NULL,
    error text,
    source_ip text,
    received_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: integration_credentials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration_credentials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    secret_name text NOT NULL,
    secret_value text NOT NULL,
    masked_suffix text,
    length integer,
    notes text,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE ONLY public.integration_credentials REPLICA IDENTITY FULL;


--
-- Name: ip_access_control; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ip_access_control (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ip_address text NOT NULL,
    list_type text NOT NULL,
    reason text,
    expires_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kit_collaborators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kit_collaborators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_id uuid NOT NULL,
    user_id uuid NOT NULL,
    permission text DEFAULT 'view'::text NOT NULL,
    invited_by uuid,
    invited_email text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT kit_collaborators_permission_check CHECK ((permission = ANY (ARRAY['view'::text, 'edit'::text])))
);


--
-- Name: kit_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kit_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_id uuid NOT NULL,
    author_id uuid NOT NULL,
    parent_id uuid,
    item_anchor text,
    body text NOT NULL,
    resolved boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kit_share_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kit_share_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_id uuid NOT NULL,
    seller_id uuid NOT NULL,
    token text DEFAULT encode(extensions.gen_random_bytes(32), 'hex'::text) NOT NULL,
    client_name text,
    client_email text,
    status text DEFAULT 'active'::text NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval),
    viewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kit_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kit_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'Geral'::text NOT NULL,
    color text DEFAULT '#3B82F6'::text NOT NULL,
    icon text DEFAULT 'Package'::text NOT NULL,
    tag text,
    cover_image_url text,
    box_data jsonb,
    items_data jsonb DEFAULT '[]'::jsonb NOT NULL,
    personalization_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL,
    volume_usage_percent numeric DEFAULT 0 NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: kit_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kit_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    kit_master_id uuid NOT NULL,
    label text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    box_data jsonb,
    items_data jsonb DEFAULT '[]'::jsonb NOT NULL,
    personalization_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    kit_quantity integer DEFAULT 1 NOT NULL,
    total_price numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.login_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    user_id uuid,
    ip_address text DEFAULT 'unknown'::text NOT NULL,
    user_agent text,
    success boolean DEFAULT false NOT NULL,
    failure_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: magic_up_brand_kits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_up_brand_kits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id text,
    client_name text,
    logo_urls jsonb DEFAULT '[]'::jsonb NOT NULL,
    primary_color text,
    secondary_color text,
    tone_of_voice text,
    visual_style text,
    required_words text[] DEFAULT '{}'::text[] NOT NULL,
    forbidden_words text[] DEFAULT '{}'::text[] NOT NULL,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: magic_up_campaigns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_up_campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id text,
    client_name text,
    title text DEFAULT 'Campanha Magic Up'::text NOT NULL,
    objective text,
    channel text,
    audience text,
    tone text,
    cta text,
    occasion text,
    status text DEFAULT 'draft'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: magic_up_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_up_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    generation_id uuid NOT NULL,
    author_name text DEFAULT 'Cliente'::text NOT NULL,
    comment text NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: magic_up_generations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_up_generations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_name text,
    scene_title text,
    scene_category text,
    client_name text,
    generated_image_url text,
    is_favorite boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    campaign_id uuid,
    product_id text,
    product_sku text,
    prompt_text text,
    model text,
    channel text,
    aspect_ratio text,
    quality_score integer,
    status text DEFAULT 'draft'::text NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    copy_pack jsonb DEFAULT '{}'::jsonb NOT NULL,
    export_presets jsonb DEFAULT '[]'::jsonb NOT NULL
);


--
-- Name: magic_up_public_shares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_up_public_shares (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    generation_id uuid,
    campaign_id uuid,
    share_token text DEFAULT encode(extensions.gen_random_bytes(24), 'hex'::text) NOT NULL,
    expires_at timestamp with time zone,
    allow_download boolean DEFAULT true NOT NULL,
    allow_comments boolean DEFAULT true NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT magic_up_public_shares_target_check CHECK (((generation_id IS NOT NULL) OR (campaign_id IS NOT NULL)))
);


--
-- Name: magic_up_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_up_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    generation_id uuid NOT NULL,
    reaction_type text NOT NULL,
    ip_hash text,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mcp_access_violations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_access_violations (
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


--
-- Name: mcp_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_api_keys (
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


--
-- Name: mcp_full_grantors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_full_grantors (
    user_id uuid NOT NULL,
    granted_by uuid,
    reason text,
    granted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: mcp_key_auto_revocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mcp_key_auto_revocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_id uuid NOT NULL,
    created_by uuid NOT NULL,
    revoked_at timestamp with time zone DEFAULT now() NOT NULL,
    source text NOT NULL,
    reason text DEFAULT 'creator_lost_dev_role'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mcp_key_auto_revocations_source_check CHECK ((source = ANY (ARRAY['trigger'::text, 'cron'::text, 'manual'::text])))
);


--
-- Name: mockup_drafts; Type: TABLE; Schema: public; Owner: -
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
-- Name: mockup_prompt_configs; Type: TABLE; Schema: public; Owner: -
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
-- Name: mockup_prompt_history; Type: TABLE; Schema: public; Owner: -
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
-- Name: mockup_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mockup_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    product_id text,
    product_name text,
    technique_id text,
    technique_name text,
    personalization_areas jsonb DEFAULT '[]'::jsonb NOT NULL,
    thumbnail_url text,
    usage_count integer DEFAULT 0 NOT NULL,
    is_favorite boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: optimization_queue_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.optimization_queue_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    queue_id uuid NOT NULL,
    status text NOT NULL,
    notes text,
    guardrail_status text,
    duration_ms integer,
    executed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: order_item_personalizations; Type: TABLE; Schema: public; Owner: -
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
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    product_id text,
    product_sku text,
    product_name text,
    product_image_url text,
    quantity integer DEFAULT 1,
    unit_price numeric(12,4) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    total_price numeric(12,4),
    color_name text,
    color_hex text,
    notes text,
    size_code text,
    gender text,
    kit_group_id uuid,
    kit_name text,
    CONSTRAINT order_items_order_id_fkey_uuid CHECK (true)
);


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    order_number text DEFAULT ''::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    fulfillment_status text DEFAULT 'unfulfilled'::text NOT NULL,
    client_id text,
    client_name text,
    client_email text,
    client_phone text,
    client_company text,
    quote_id uuid,
    subtotal numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    shipping_cost numeric DEFAULT 0,
    total numeric DEFAULT 0,
    notes text,
    internal_notes text,
    tracking_number text,
    shipping_type text,
    payment_terms text,
    delivery_time text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid,
    version integer DEFAULT 1 NOT NULL
);


--
-- Name: organization_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organization_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.org_role DEFAULT 'member'::public.org_role NOT NULL,
    invited_by uuid,
    joined_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: outbound_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.outbound_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    url text NOT NULL,
    secret_ref text,
    events text[] DEFAULT ARRAY[]::text[] NOT NULL,
    active boolean DEFAULT true NOT NULL,
    retry_policy jsonb DEFAULT jsonb_build_object('max_attempts', 3, 'backoff_seconds', ARRAY[5, 30, 120]) NOT NULL,
    description text,
    created_by uuid NOT NULL,
    last_triggered_at timestamp with time zone,
    total_success integer DEFAULT 0 NOT NULL,
    total_failure integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    consecutive_failures integer DEFAULT 0 NOT NULL,
    auto_disabled_at timestamp with time zone,
    auto_disabled_reason text
);


--
-- Name: ownership_audit_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ownership_audit_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_tables_scanned integer DEFAULT 0 NOT NULL,
    total_issues_found integer DEFAULT 0 NOT NULL,
    null_owner_count integer DEFAULT 0 NOT NULL,
    missing_user_count integer DEFAULT 0 NOT NULL,
    details jsonb DEFAULT '[]'::jsonb NOT NULL,
    triggered_by text DEFAULT 'cron'::text NOT NULL,
    duration_ms integer,
    rls_coverage jsonb DEFAULT '[]'::jsonb NOT NULL,
    rls_gaps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: ownership_repair_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ownership_repair_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid,
    table_name text NOT NULL,
    owner_column text NOT NULL,
    issue_type text NOT NULL,
    action text NOT NULL,
    rows_affected integer DEFAULT 0 NOT NULL,
    dry_run boolean DEFAULT true NOT NULL,
    triggered_by uuid,
    triggered_by_label text,
    notes text,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ownership_repair_logs_action_check CHECK ((action = ANY (ARRAY['deleted'::text, 'deactivated'::text, 'manual_review'::text, 'skipped'::text, 'failed'::text]))),
    CONSTRAINT ownership_repair_logs_issue_type_check CHECK ((issue_type = ANY (ARRAY['null_owner'::text, 'missing_user'::text])))
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    category text DEFAULT 'geral'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id text NOT NULL,
    variant_id text,
    price numeric(12,2) NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_component_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_component_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    component_id uuid NOT NULL,
    location_code text NOT NULL,
    location_name text NOT NULL,
    description text,
    max_width_cm numeric(6,2),
    max_height_cm numeric(6,2),
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_components; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_components (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id text NOT NULL,
    component_code text NOT NULL,
    component_name text NOT NULL,
    is_personalizable boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_group_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_group_id uuid NOT NULL,
    product_id text NOT NULL,
    use_group_rules boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_code text NOT NULL,
    group_name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_price_freshness_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_price_freshness_overrides (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id text NOT NULL,
    threshold_days integer NOT NULL,
    updated_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_price_freshness_overrides_threshold_days_check CHECK ((threshold_days = ANY (ARRAY[30, 60, 90])))
);


--
-- Name: product_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    records_processed integer DEFAULT 0 NOT NULL,
    records_inserted integer DEFAULT 0 NOT NULL,
    records_updated integer DEFAULT 0 NOT NULL,
    records_failed integer DEFAULT 0 NOT NULL,
    duration_ms integer,
    payload jsonb,
    error_message text,
    triggered_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_views; Type: TABLE; Schema: public; Owner: -
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
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    email text,
    full_name text,
    role text DEFAULT 'vendedor'::text,
    avatar_url text,
    phone text,
    department text,
    is_active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    preferences jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: public_token_failures; Type: TABLE; Schema: public; Owner: -
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
-- Name: query_telemetry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.query_telemetry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    operation text NOT NULL,
    table_name text,
    rpc_name text,
    duration_ms integer NOT NULL,
    record_count integer,
    query_limit integer,
    query_offset integer,
    count_mode text,
    severity text DEFAULT 'slow'::text NOT NULL,
    error_message text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    error_kind text,
    retry_count integer DEFAULT 0 NOT NULL,
    cache_hit boolean DEFAULT false NOT NULL,
    is_cold_start boolean DEFAULT false NOT NULL,
    is_503 boolean DEFAULT false NOT NULL
);


--
-- Name: quote_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id text NOT NULL,
    user_id uuid NOT NULL,
    parent_id uuid,
    content text NOT NULL,
    is_edited boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    data jsonb NOT NULL,
    last_saved_at timestamp with time zone DEFAULT now()
);


--
-- Name: quote_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    user_id uuid,
    action text NOT NULL,
    description text,
    field_changed text,
    old_value text,
    new_value text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_item_personalizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_item_personalizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_item_id uuid NOT NULL,
    technique_id text,
    technique_name text,
    colors_count integer DEFAULT 1,
    positions_count integer DEFAULT 1,
    area_cm2 numeric,
    width_cm numeric,
    height_cm numeric,
    personalized_quantity integer,
    setup_cost numeric DEFAULT 0,
    unit_cost numeric DEFAULT 0,
    total_cost numeric DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_id uuid NOT NULL,
    product_id text,
    product_name text NOT NULL,
    product_sku text,
    product_image_url text,
    quantity integer DEFAULT 1 NOT NULL,
    unit_price numeric DEFAULT 0 NOT NULL,
    subtotal numeric,
    color_name text,
    color_hex text,
    notes text,
    sort_order integer DEFAULT 0,
    display_order integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kit_group_id text,
    kit_name text,
    size_code text,
    gender text,
    price_confirmed_at timestamp with time zone
);


--
-- Name: quote_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    seller_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_default boolean DEFAULT false,
    template_data jsonb DEFAULT '{}'::jsonb,
    items_data jsonb DEFAULT '[]'::jsonb,
    discount_percent numeric DEFAULT 0,
    discount_amount numeric DEFAULT 0,
    notes text,
    internal_notes text,
    payment_terms text,
    delivery_time text,
    validity_days integer DEFAULT 30,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quote_number text DEFAULT ''::text NOT NULL,
    client_id text,
    client_name text,
    client_email text,
    client_phone text,
    client_company text,
    client_cnpj text,
    seller_id uuid NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    subtotal numeric DEFAULT 0 NOT NULL,
    discount_percent numeric DEFAULT 0 NOT NULL,
    discount_amount numeric DEFAULT 0 NOT NULL,
    total numeric DEFAULT 0 NOT NULL,
    notes text,
    payment_terms text,
    delivery_time text,
    shipping_type text,
    shipping_cost numeric DEFAULT 0,
    internal_notes text,
    valid_until timestamp with time zone,
    bitrix_deal_id text,
    bitrix_quote_id text,
    synced_to_bitrix boolean DEFAULT false,
    synced_at timestamp with time zone,
    client_response text,
    client_response_at timestamp with time zone,
    client_response_notes text,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    parent_quote_id uuid,
    is_latest_version boolean DEFAULT true NOT NULL,
    organization_id uuid,
    negotiation_markup_percent numeric(5,2) DEFAULT 0 NOT NULL,
    real_subtotal numeric(12,2),
    real_discount_percent numeric(5,2),
    CONSTRAINT quotes_negotiation_markup_range CHECK (((negotiation_markup_percent >= (0)::numeric) AND (negotiation_markup_percent <= (50)::numeric)))
);


--
-- Name: recently_viewed_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recently_viewed_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    product_id text NOT NULL,
    viewed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: request_rate_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.request_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier text NOT NULL,
    endpoint text NOT NULL,
    request_count integer DEFAULT 1 NOT NULL,
    window_start timestamp with time zone DEFAULT now() NOT NULL,
    blocked_until timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: rls_denial_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rls_denial_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    user_email text,
    user_role text,
    table_name text NOT NULL,
    operation text NOT NULL,
    endpoint text,
    query_summary text,
    target_id uuid,
    target_seller_id uuid,
    policy_hint text,
    error_code text,
    error_message text,
    user_agent text,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT rls_denial_log_operation_check CHECK ((operation = ANY (ARRAY['SELECT'::text, 'INSERT'::text, 'UPDATE'::text, 'DELETE'::text])))
);


--
-- Name: role_migration_batches; Type: TABLE; Schema: public; Owner: -
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
-- Name: role_migration_items; Type: TABLE; Schema: public; Owner: -
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
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    role public.app_role NOT NULL,
    permission_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_filters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_filters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    filters jsonb DEFAULT '{}'::jsonb NOT NULL,
    context text DEFAULT 'catalog'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    icon text,
    color text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: saved_trends_views; Type: TABLE; Schema: public; Owner: -
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
-- Name: scheduled_reports; Type: TABLE; Schema: public; Owner: -
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
-- Name: search_analytics; Type: TABLE; Schema: public; Owner: -
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
-- Name: secret_rotation_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.secret_rotation_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    secret_name text NOT NULL,
    rotated_by uuid NOT NULL,
    rotated_at timestamp with time zone DEFAULT now() NOT NULL,
    previous_suffix text,
    new_suffix text,
    notes text,
    action_type text DEFAULT 'rotate'::text NOT NULL
);


--
-- Name: seller_cart_items; Type: TABLE; Schema: public; Owner: -
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
-- Name: seller_carts; Type: TABLE; Schema: public; Owner: -
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
-- Name: seller_discount_limits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seller_discount_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    max_discount_percent numeric DEFAULT 5 NOT NULL,
    set_by uuid NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: simulator_wizard_drafts; Type: TABLE; Schema: public; Owner: -
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
-- Name: step_up_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.step_up_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    action public.step_up_action,
    target_ref text,
    event_type text NOT NULL,
    challenge_id uuid,
    token_id uuid,
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: step_up_challenges; Type: TABLE; Schema: public; Owner: -
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
-- Name: step_up_tokens; Type: TABLE; Schema: public; Owner: -
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
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: user_comparisons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_comparisons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    client_id text,
    client_name text,
    name text,
    items jsonb DEFAULT '[]'::jsonb NOT NULL,
    share_token text,
    is_public boolean DEFAULT false NOT NULL,
    share_expires_at timestamp with time zone,
    view_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_onboarding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_onboarding (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    has_completed_tour boolean DEFAULT false NOT NULL,
    current_step integer DEFAULT 0 NOT NULL,
    completed_steps jsonb DEFAULT '[]'::jsonb,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_preferences; Type: TABLE; Schema: public; Owner: -
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
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'vendedor'::public.app_role NOT NULL
);


--
-- Name: user_search_history; Type: TABLE; Schema: public; Owner: -
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
-- Name: user_token_revocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_token_revocations (
    user_id uuid NOT NULL,
    revoked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: video_variant_links; Type: TABLE; Schema: public; Owner: -
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
-- Name: voice_command_logs; Type: TABLE; Schema: public; Owner: -
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
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid NOT NULL,
    event text NOT NULL,
    payload jsonb,
    payload_hash text,
    status_code integer,
    response_body_truncated text,
    attempt integer DEFAULT 1 NOT NULL,
    success boolean DEFAULT false NOT NULL,
    error_message text,
    delivered_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_delivery_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_delivery_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id text,
    event_type text,
    source text,
    direction text DEFAULT 'inbound'::text,
    endpoint text,
    http_status integer,
    duration_ms integer,
    attempt integer DEFAULT 1,
    success boolean DEFAULT true,
    error_class text,
    error_message text,
    payload_bytes integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
)
PARTITION BY RANGE (occurred_at);


--
-- Name: webhook_delivery_metrics_y2026m05; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_delivery_metrics_y2026m05 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id text,
    event_type text,
    source text,
    direction text DEFAULT 'inbound'::text,
    endpoint text,
    http_status integer,
    duration_ms integer,
    attempt integer DEFAULT 1,
    success boolean DEFAULT true,
    error_class text,
    error_message text,
    payload_bytes integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: webhook_delivery_metrics_y2026m06; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_delivery_metrics_y2026m06 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id text,
    event_type text,
    source text,
    direction text DEFAULT 'inbound'::text,
    endpoint text,
    http_status integer,
    duration_ms integer,
    attempt integer DEFAULT 1,
    success boolean DEFAULT true,
    error_class text,
    error_message text,
    payload_bytes integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: workspace_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.workspace_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    category text DEFAULT 'system'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    action_url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_audit_log_y2025m12; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ATTACH PARTITION public.admin_audit_log_y2025m12 FOR VALUES FROM ('2025-12-01 00:00:00+00') TO ('2026-01-01 00:00:00+00');


--
-- Name: admin_audit_log_y2026m01; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ATTACH PARTITION public.admin_audit_log_y2026m01 FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-02-01 00:00:00+00');


--
-- Name: admin_audit_log_y2026m02; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ATTACH PARTITION public.admin_audit_log_y2026m02 FOR VALUES FROM ('2026-02-01 00:00:00+00') TO ('2026-03-01 00:00:00+00');


--
-- Name: admin_audit_log_y2026m03; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ATTACH PARTITION public.admin_audit_log_y2026m03 FOR VALUES FROM ('2026-03-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');


--
-- Name: admin_audit_log_y2026m04; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ATTACH PARTITION public.admin_audit_log_y2026m04 FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-05-01 00:00:00+00');


--
-- Name: admin_audit_log_y2026m05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ATTACH PARTITION public.admin_audit_log_y2026m05 FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');


--
-- Name: admin_audit_log_y2026m06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log ATTACH PARTITION public.admin_audit_log_y2026m06 FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');


--
-- Name: webhook_delivery_metrics_y2026m05; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_delivery_metrics ATTACH PARTITION public.webhook_delivery_metrics_y2026m05 FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');


--
-- Name: webhook_delivery_metrics_y2026m06; Type: TABLE ATTACH; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_delivery_metrics ATTACH PARTITION public.webhook_delivery_metrics_y2026m06 FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');


--
-- Name: access_security_settings access_security_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_security_settings
    ADD CONSTRAINT access_security_settings_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_log admin_audit_log_new_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_new_pkey PRIMARY KEY (id, created_at);


--
-- Name: admin_audit_log_old admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log_old
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_log_y2025m12 admin_audit_log_y2025m12_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log_y2025m12
    ADD CONSTRAINT admin_audit_log_y2025m12_pkey PRIMARY KEY (id, created_at);


--
-- Name: admin_audit_log_y2026m01 admin_audit_log_y2026m01_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log_y2026m01
    ADD CONSTRAINT admin_audit_log_y2026m01_pkey PRIMARY KEY (id, created_at);


--
-- Name: admin_audit_log_y2026m02 admin_audit_log_y2026m02_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log_y2026m02
    ADD CONSTRAINT admin_audit_log_y2026m02_pkey PRIMARY KEY (id, created_at);


--
-- Name: admin_audit_log_y2026m03 admin_audit_log_y2026m03_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log_y2026m03
    ADD CONSTRAINT admin_audit_log_y2026m03_pkey PRIMARY KEY (id, created_at);


--
-- Name: admin_audit_log_y2026m04 admin_audit_log_y2026m04_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log_y2026m04
    ADD CONSTRAINT admin_audit_log_y2026m04_pkey PRIMARY KEY (id, created_at);


--
-- Name: admin_audit_log_y2026m05 admin_audit_log_y2026m05_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log_y2026m05
    ADD CONSTRAINT admin_audit_log_y2026m05_pkey PRIMARY KEY (id, created_at);


--
-- Name: admin_audit_log_y2026m06 admin_audit_log_y2026m06_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log_y2026m06
    ADD CONSTRAINT admin_audit_log_y2026m06_pkey PRIMARY KEY (id, created_at);


--
-- Name: admin_settings admin_settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_key_key UNIQUE (key);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: ai_insights_cache ai_insights_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_insights_cache
    ADD CONSTRAINT ai_insights_cache_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_events ai_usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_events
    ADD CONSTRAINT ai_usage_events_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_logs ai_usage_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_logs
    ADD CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_quotas ai_usage_quotas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_quotas
    ADD CONSTRAINT ai_usage_quotas_pkey PRIMARY KEY (id);


--
-- Name: ai_usage_quotas ai_usage_quotas_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage_quotas
    ADD CONSTRAINT ai_usage_quotas_role_key UNIQUE (role);


--
-- Name: app_vitals app_vitals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_vitals
    ADD CONSTRAINT app_vitals_pkey PRIMARY KEY (id);


--
-- Name: art_file_attachments art_file_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.art_file_attachments
    ADD CONSTRAINT art_file_attachments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_login_attempts auth_login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_login_attempts
    ADD CONSTRAINT auth_login_attempts_pkey PRIMARY KEY (id);


--
-- Name: bot_detection_log bot_detection_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bot_detection_log
    ADD CONSTRAINT bot_detection_log_pkey PRIMARY KEY (id);


--
-- Name: cart_templates cart_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_templates
    ADD CONSTRAINT cart_templates_pkey PRIMARY KEY (id);


--
-- Name: category_icons category_icons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_icons
    ADD CONSTRAINT category_icons_pkey PRIMARY KEY (id);


--
-- Name: collection_item_reactions collection_item_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_item_reactions
    ADD CONSTRAINT collection_item_reactions_pkey PRIMARY KEY (id);


--
-- Name: collection_items collection_items_collection_id_product_id_color_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT collection_items_collection_id_product_id_color_name_key UNIQUE (collection_id, product_id, color_name);


--
-- Name: collection_items collection_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT collection_items_pkey PRIMARY KEY (id);


--
-- Name: collection_items_trash collection_items_trash_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_items_trash
    ADD CONSTRAINT collection_items_trash_pkey PRIMARY KEY (id);


--
-- Name: collections collections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_pkey PRIMARY KEY (id);


--
-- Name: collections collections_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collections
    ADD CONSTRAINT collections_share_token_key UNIQUE (share_token);


--
-- Name: comparison_reactions comparison_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comparison_reactions
    ADD CONSTRAINT comparison_reactions_pkey PRIMARY KEY (id);


--
-- Name: component_media component_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.component_media
    ADD CONSTRAINT component_media_pkey PRIMARY KEY (id);


--
-- Name: connection_test_history connection_test_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_test_history
    ADD CONSTRAINT connection_test_history_pkey PRIMARY KEY (id);


--
-- Name: conversation_audit_logs conversation_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_audit_logs
    ADD CONSTRAINT conversation_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: conversation_delivery_status conversation_delivery_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_delivery_status
    ADD CONSTRAINT conversation_delivery_status_pkey PRIMARY KEY (id);


--
-- Name: conversation_event_history conversation_event_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_event_history
    ADD CONSTRAINT conversation_event_history_pkey PRIMARY KEY (id);


--
-- Name: custom_kits custom_kits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_kits
    ADD CONSTRAINT custom_kits_pkey PRIMARY KEY (id);


--
-- Name: discount_approval_requests discount_approval_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_approval_requests
    ADD CONSTRAINT discount_approval_requests_pkey PRIMARY KEY (id);


--
-- Name: e2e_cleanup_audit e2e_cleanup_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e2e_cleanup_audit
    ADD CONSTRAINT e2e_cleanup_audit_pkey PRIMARY KEY (id);


--
-- Name: e2e_cleanup_rate_limit e2e_cleanup_rate_limit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.e2e_cleanup_rate_limit
    ADD CONSTRAINT e2e_cleanup_rate_limit_pkey PRIMARY KEY (key);


--
-- Name: expert_conversations expert_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_conversations
    ADD CONSTRAINT expert_conversations_pkey PRIMARY KEY (id);


--
-- Name: expert_messages expert_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_messages
    ADD CONSTRAINT expert_messages_pkey PRIMARY KEY (id);


--
-- Name: external_connections external_connections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_connections
    ADD CONSTRAINT external_connections_pkey PRIMARY KEY (id);


--
-- Name: external_connections_sync_log external_connections_sync_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_connections_sync_log
    ADD CONSTRAINT external_connections_sync_log_pkey PRIMARY KEY (id);


--
-- Name: external_connections external_connections_type_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_connections
    ADD CONSTRAINT external_connections_type_name_key UNIQUE (type, name);


--
-- Name: favorite_item_reactions favorite_item_reactions_item_id_anon_id_emoji_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_item_reactions
    ADD CONSTRAINT favorite_item_reactions_item_id_anon_id_emoji_key UNIQUE (item_id, anon_id, emoji);


--
-- Name: favorite_item_reactions favorite_item_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_item_reactions
    ADD CONSTRAINT favorite_item_reactions_pkey PRIMARY KEY (id);


--
-- Name: favorite_items favorite_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_items
    ADD CONSTRAINT favorite_items_pkey PRIMARY KEY (id);


--
-- Name: favorite_items_trash favorite_items_trash_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_items_trash
    ADD CONSTRAINT favorite_items_trash_pkey PRIMARY KEY (id);


--
-- Name: favorite_lists favorite_lists_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_lists
    ADD CONSTRAINT favorite_lists_pkey PRIMARY KEY (id);


--
-- Name: favorite_lists favorite_lists_shared_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_lists
    ADD CONSTRAINT favorite_lists_shared_token_key UNIQUE (shared_token);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: file_scan_logs file_scan_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.file_scan_logs
    ADD CONSTRAINT file_scan_logs_pkey PRIMARY KEY (id);


--
-- Name: follow_up_reminders follow_up_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_up_reminders
    ADD CONSTRAINT follow_up_reminders_pkey PRIMARY KEY (id);


--
-- Name: generated_mockups generated_mockups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.generated_mockups
    ADD CONSTRAINT generated_mockups_pkey PRIMARY KEY (id);


--
-- Name: geo_allowed_countries geo_allowed_countries_country_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_allowed_countries
    ADD CONSTRAINT geo_allowed_countries_country_code_key UNIQUE (country_code);


--
-- Name: geo_allowed_countries geo_allowed_countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_allowed_countries
    ADD CONSTRAINT geo_allowed_countries_pkey PRIMARY KEY (id);


--
-- Name: hardening_health_snapshots hardening_health_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.hardening_health_snapshots
    ADD CONSTRAINT hardening_health_snapshots_pkey PRIMARY KEY (id);


--
-- Name: inbound_webhook_endpoints inbound_webhook_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_webhook_endpoints
    ADD CONSTRAINT inbound_webhook_endpoints_pkey PRIMARY KEY (id);


--
-- Name: inbound_webhook_endpoints inbound_webhook_endpoints_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_webhook_endpoints
    ADD CONSTRAINT inbound_webhook_endpoints_slug_key UNIQUE (slug);


--
-- Name: inbound_webhook_events inbound_webhook_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_webhook_events
    ADD CONSTRAINT inbound_webhook_events_pkey PRIMARY KEY (id);


--
-- Name: integration_credentials integration_credentials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_credentials
    ADD CONSTRAINT integration_credentials_pkey PRIMARY KEY (id);


--
-- Name: integration_credentials integration_credentials_secret_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration_credentials
    ADD CONSTRAINT integration_credentials_secret_name_key UNIQUE (secret_name);


--
-- Name: ip_access_control ip_access_control_ip_address_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_access_control
    ADD CONSTRAINT ip_access_control_ip_address_key UNIQUE (ip_address);


--
-- Name: ip_access_control ip_access_control_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ip_access_control
    ADD CONSTRAINT ip_access_control_pkey PRIMARY KEY (id);


--
-- Name: kit_collaborators kit_collaborators_kit_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_collaborators
    ADD CONSTRAINT kit_collaborators_kit_id_user_id_key UNIQUE (kit_id, user_id);


--
-- Name: kit_collaborators kit_collaborators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_collaborators
    ADD CONSTRAINT kit_collaborators_pkey PRIMARY KEY (id);


--
-- Name: kit_comments kit_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_comments
    ADD CONSTRAINT kit_comments_pkey PRIMARY KEY (id);


--
-- Name: kit_share_tokens kit_share_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_share_tokens
    ADD CONSTRAINT kit_share_tokens_pkey PRIMARY KEY (id);


--
-- Name: kit_share_tokens kit_share_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_share_tokens
    ADD CONSTRAINT kit_share_tokens_token_key UNIQUE (token);


--
-- Name: kit_templates kit_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_templates
    ADD CONSTRAINT kit_templates_pkey PRIMARY KEY (id);


--
-- Name: kit_variants kit_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_variants
    ADD CONSTRAINT kit_variants_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: magic_up_brand_kits magic_up_brand_kits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_brand_kits
    ADD CONSTRAINT magic_up_brand_kits_pkey PRIMARY KEY (id);


--
-- Name: magic_up_brand_kits magic_up_brand_kits_user_id_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_brand_kits
    ADD CONSTRAINT magic_up_brand_kits_user_id_client_id_key UNIQUE (user_id, client_id);


--
-- Name: magic_up_campaigns magic_up_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_campaigns
    ADD CONSTRAINT magic_up_campaigns_pkey PRIMARY KEY (id);


--
-- Name: magic_up_comments magic_up_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_comments
    ADD CONSTRAINT magic_up_comments_pkey PRIMARY KEY (id);


--
-- Name: magic_up_generations magic_up_generations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_generations
    ADD CONSTRAINT magic_up_generations_pkey PRIMARY KEY (id);


--
-- Name: magic_up_public_shares magic_up_public_shares_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_public_shares
    ADD CONSTRAINT magic_up_public_shares_pkey PRIMARY KEY (id);


--
-- Name: magic_up_public_shares magic_up_public_shares_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_public_shares
    ADD CONSTRAINT magic_up_public_shares_share_token_key UNIQUE (share_token);


--
-- Name: magic_up_reactions magic_up_reactions_generation_id_reaction_type_ip_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_reactions
    ADD CONSTRAINT magic_up_reactions_generation_id_reaction_type_ip_hash_key UNIQUE (generation_id, reaction_type, ip_hash);


--
-- Name: magic_up_reactions magic_up_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_reactions
    ADD CONSTRAINT magic_up_reactions_pkey PRIMARY KEY (id);


--
-- Name: mcp_access_violations mcp_access_violations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_access_violations
    ADD CONSTRAINT mcp_access_violations_pkey PRIMARY KEY (id);


--
-- Name: mcp_api_keys mcp_api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_api_keys
    ADD CONSTRAINT mcp_api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: mcp_api_keys mcp_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_api_keys
    ADD CONSTRAINT mcp_api_keys_pkey PRIMARY KEY (id);


--
-- Name: mcp_full_grantors mcp_full_grantors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_full_grantors
    ADD CONSTRAINT mcp_full_grantors_pkey PRIMARY KEY (user_id);


--
-- Name: mcp_key_auto_revocations mcp_key_auto_revocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_key_auto_revocations
    ADD CONSTRAINT mcp_key_auto_revocations_pkey PRIMARY KEY (id);


--
-- Name: mockup_drafts mockup_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mockup_drafts
    ADD CONSTRAINT mockup_drafts_pkey PRIMARY KEY (id);


--
-- Name: mockup_drafts mockup_drafts_user_id_draft_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mockup_drafts
    ADD CONSTRAINT mockup_drafts_user_id_draft_key_key UNIQUE (user_id, draft_key);


--
-- Name: mockup_prompt_configs mockup_prompt_configs_config_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mockup_prompt_configs
    ADD CONSTRAINT mockup_prompt_configs_config_key_key UNIQUE (config_key);


--
-- Name: mockup_prompt_configs mockup_prompt_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mockup_prompt_configs
    ADD CONSTRAINT mockup_prompt_configs_pkey PRIMARY KEY (id);


--
-- Name: mockup_prompt_history mockup_prompt_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mockup_prompt_history
    ADD CONSTRAINT mockup_prompt_history_pkey PRIMARY KEY (id);


--
-- Name: mockup_templates mockup_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mockup_templates
    ADD CONSTRAINT mockup_templates_pkey PRIMARY KEY (id);


--
-- Name: optimization_queue optimization_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_queue
    ADD CONSTRAINT optimization_queue_pkey PRIMARY KEY (id);


--
-- Name: optimization_queue_runs optimization_queue_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_queue_runs
    ADD CONSTRAINT optimization_queue_runs_pkey PRIMARY KEY (id);


--
-- Name: order_item_personalizations order_item_personalizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_personalizations
    ADD CONSTRAINT order_item_personalizations_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: organization_members organization_members_organization_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_user_id_key UNIQUE (organization_id, user_id);


--
-- Name: organization_members organization_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: outbound_webhooks outbound_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.outbound_webhooks
    ADD CONSTRAINT outbound_webhooks_pkey PRIMARY KEY (id);


--
-- Name: ownership_audit_reports ownership_audit_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_audit_reports
    ADD CONSTRAINT ownership_audit_reports_pkey PRIMARY KEY (id);


--
-- Name: ownership_repair_logs ownership_repair_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_repair_logs
    ADD CONSTRAINT ownership_repair_logs_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_code_key UNIQUE (code);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: product_component_locations product_component_locations_component_id_location_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_component_locations
    ADD CONSTRAINT product_component_locations_component_id_location_code_key UNIQUE (component_id, location_code);


--
-- Name: product_component_locations product_component_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_component_locations
    ADD CONSTRAINT product_component_locations_pkey PRIMARY KEY (id);


--
-- Name: product_components product_components_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_components
    ADD CONSTRAINT product_components_pkey PRIMARY KEY (id);


--
-- Name: product_group_members product_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_group_members
    ADD CONSTRAINT product_group_members_pkey PRIMARY KEY (id);


--
-- Name: product_groups product_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_groups
    ADD CONSTRAINT product_groups_pkey PRIMARY KEY (id);


--
-- Name: product_price_freshness_overrides product_price_freshness_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_freshness_overrides
    ADD CONSTRAINT product_price_freshness_overrides_pkey PRIMARY KEY (id);


--
-- Name: product_price_freshness_overrides product_price_freshness_overrides_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_freshness_overrides
    ADD CONSTRAINT product_price_freshness_overrides_product_id_key UNIQUE (product_id);


--
-- Name: product_sync_logs product_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_sync_logs
    ADD CONSTRAINT product_sync_logs_pkey PRIMARY KEY (id);


--
-- Name: product_views product_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_views
    ADD CONSTRAINT product_views_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: public_token_failures public_token_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.public_token_failures
    ADD CONSTRAINT public_token_failures_pkey PRIMARY KEY (id);


--
-- Name: query_telemetry query_telemetry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.query_telemetry
    ADD CONSTRAINT query_telemetry_pkey PRIMARY KEY (id);


--
-- Name: quote_approval_tokens quote_approval_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approval_tokens
    ADD CONSTRAINT quote_approval_tokens_pkey PRIMARY KEY (id);


--
-- Name: quote_approval_tokens quote_approval_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approval_tokens
    ADD CONSTRAINT quote_approval_tokens_token_key UNIQUE (token);


--
-- Name: quote_comments quote_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_comments
    ADD CONSTRAINT quote_comments_pkey PRIMARY KEY (id);


--
-- Name: quote_drafts quote_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_drafts
    ADD CONSTRAINT quote_drafts_pkey PRIMARY KEY (id);


--
-- Name: quote_drafts quote_drafts_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_drafts
    ADD CONSTRAINT quote_drafts_user_id_key UNIQUE (user_id);


--
-- Name: quote_history quote_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_history
    ADD CONSTRAINT quote_history_pkey PRIMARY KEY (id);


--
-- Name: quote_item_personalizations quote_item_personalizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_item_personalizations
    ADD CONSTRAINT quote_item_personalizations_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quote_templates quote_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_templates
    ADD CONSTRAINT quote_templates_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: recently_viewed_products recently_viewed_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recently_viewed_products
    ADD CONSTRAINT recently_viewed_products_pkey PRIMARY KEY (id);


--
-- Name: recently_viewed_products recently_viewed_products_user_id_product_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recently_viewed_products
    ADD CONSTRAINT recently_viewed_products_user_id_product_id_key UNIQUE (user_id, product_id);


--
-- Name: request_rate_limits request_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.request_rate_limits
    ADD CONSTRAINT request_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: rls_denial_log rls_denial_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rls_denial_log
    ADD CONSTRAINT rls_denial_log_pkey PRIMARY KEY (id);


--
-- Name: role_migration_batches role_migration_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_migration_batches
    ADD CONSTRAINT role_migration_batches_pkey PRIMARY KEY (id);


--
-- Name: role_migration_items role_migration_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_migration_items
    ADD CONSTRAINT role_migration_items_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_role_permission_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_permission_code_key UNIQUE (role, permission_code);


--
-- Name: saved_filters saved_filters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_filters
    ADD CONSTRAINT saved_filters_pkey PRIMARY KEY (id);


--
-- Name: saved_trends_views saved_trends_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_trends_views
    ADD CONSTRAINT saved_trends_views_pkey PRIMARY KEY (id);


--
-- Name: scheduled_reports scheduled_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_reports
    ADD CONSTRAINT scheduled_reports_pkey PRIMARY KEY (id);


--
-- Name: search_analytics search_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.search_analytics
    ADD CONSTRAINT search_analytics_pkey PRIMARY KEY (id);


--
-- Name: secret_rotation_log secret_rotation_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.secret_rotation_log
    ADD CONSTRAINT secret_rotation_log_pkey PRIMARY KEY (id);


--
-- Name: seller_cart_items seller_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_cart_items
    ADD CONSTRAINT seller_cart_items_pkey PRIMARY KEY (id);


--
-- Name: seller_carts seller_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_carts
    ADD CONSTRAINT seller_carts_pkey PRIMARY KEY (id);


--
-- Name: seller_discount_limits seller_discount_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_discount_limits
    ADD CONSTRAINT seller_discount_limits_pkey PRIMARY KEY (id);


--
-- Name: seller_discount_limits seller_discount_limits_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_discount_limits
    ADD CONSTRAINT seller_discount_limits_user_id_key UNIQUE (user_id);


--
-- Name: simulator_wizard_drafts simulator_wizard_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.simulator_wizard_drafts
    ADD CONSTRAINT simulator_wizard_drafts_pkey PRIMARY KEY (id);


--
-- Name: step_up_audit_log step_up_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_up_audit_log
    ADD CONSTRAINT step_up_audit_log_pkey PRIMARY KEY (id);


--
-- Name: step_up_challenges step_up_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_up_challenges
    ADD CONSTRAINT step_up_challenges_pkey PRIMARY KEY (id);


--
-- Name: step_up_tokens step_up_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_up_tokens
    ADD CONSTRAINT step_up_tokens_pkey PRIMARY KEY (id);


--
-- Name: step_up_tokens step_up_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_up_tokens
    ADD CONSTRAINT step_up_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: user_search_history unique_user_query_type; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_search_history
    ADD CONSTRAINT unique_user_query_type UNIQUE (user_id, query_text, history_type);


--
-- Name: user_comparisons user_comparisons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_comparisons
    ADD CONSTRAINT user_comparisons_pkey PRIMARY KEY (id);


--
-- Name: user_comparisons user_comparisons_share_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_comparisons
    ADD CONSTRAINT user_comparisons_share_token_key UNIQUE (share_token);


--
-- Name: user_onboarding user_onboarding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_onboarding
    ADD CONSTRAINT user_onboarding_pkey PRIMARY KEY (id);


--
-- Name: user_onboarding user_onboarding_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_onboarding
    ADD CONSTRAINT user_onboarding_user_id_key UNIQUE (user_id);


--
-- Name: user_preferences user_preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_pkey PRIMARY KEY (id);


--
-- Name: user_preferences user_preferences_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_preferences
    ADD CONSTRAINT user_preferences_user_id_key UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_search_history user_search_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_search_history
    ADD CONSTRAINT user_search_history_pkey PRIMARY KEY (id);


--
-- Name: user_token_revocations user_token_revocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_token_revocations
    ADD CONSTRAINT user_token_revocations_pkey PRIMARY KEY (user_id);


--
-- Name: video_variant_links video_variant_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_variant_links
    ADD CONSTRAINT video_variant_links_pkey PRIMARY KEY (id);


--
-- Name: video_variant_links video_variant_links_video_id_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.video_variant_links
    ADD CONSTRAINT video_variant_links_video_id_variant_id_key UNIQUE (video_id, variant_id);


--
-- Name: voice_command_logs voice_command_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.voice_command_logs
    ADD CONSTRAINT voice_command_logs_pkey PRIMARY KEY (id);


--
-- Name: webhook_deliveries webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: workspace_notifications workspace_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.workspace_notifications
    ADD CONSTRAINT workspace_notifications_pkey PRIMARY KEY (id);


--
-- Name: external_connections_type_name_no_env_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX external_connections_type_name_no_env_uidx ON public.external_connections USING btree (type, name) WHERE (env_key IS NULL);


--
-- Name: idx_admin_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log_old USING btree (action);


--
-- Name: idx_admin_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log_old USING btree (created_at DESC);


--
-- Name: idx_admin_audit_log_details_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_details_gin ON public.admin_audit_log_old USING gin (details);


--
-- Name: idx_admin_audit_log_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_request_id ON public.admin_audit_log_old USING btree (request_id) WHERE (request_id IS NOT NULL);


--
-- Name: idx_admin_audit_log_resource_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_resource_lookup ON public.admin_audit_log_old USING btree (resource_type, resource_id, created_at DESC);


--
-- Name: idx_admin_audit_log_role_actions; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_role_actions ON public.admin_audit_log_old USING btree (action, created_at DESC) WHERE (action = ANY (ARRAY['role.granted'::text, 'role.changed'::text, 'role.revoked'::text, 'role.promote'::text, 'role.demote'::text]));


--
-- Name: idx_admin_audit_log_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_source ON public.admin_audit_log_old USING btree (source, created_at DESC) WHERE (source IS NOT NULL);


--
-- Name: idx_admin_audit_log_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_status ON public.admin_audit_log_old USING btree (status, created_at DESC) WHERE (status IS NOT NULL);


--
-- Name: idx_admin_audit_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_user_id ON public.admin_audit_log_old USING btree (user_id);


--
-- Name: idx_ai_insights_cache_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_insights_cache_expires ON public.ai_insights_cache USING btree (expires_at);


--
-- Name: idx_ai_usage_events_fn_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_events_fn_created ON public.ai_usage_events USING btree (function_name, created_at DESC);


--
-- Name: idx_ai_usage_events_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_events_user_created ON public.ai_usage_events USING btree (user_id, created_at DESC);


--
-- Name: idx_ai_usage_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs USING btree (created_at);


--
-- Name: idx_ai_usage_logs_function; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_function ON public.ai_usage_logs USING btree (function_name);


--
-- Name: idx_ai_usage_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs USING btree (user_id);


--
-- Name: idx_ai_usage_logs_user_month; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_usage_logs_user_month ON public.ai_usage_logs USING btree (user_id, created_at);


--
-- Name: idx_app_vitals_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_vitals_created ON public.app_vitals USING btree (created_at DESC);


--
-- Name: idx_app_vitals_metric_name_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_vitals_metric_name_created ON public.app_vitals USING btree (metric_name, created_at DESC);


--
-- Name: idx_app_vitals_name_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_vitals_name_created ON public.app_vitals USING btree (metric_name, created_at DESC);


--
-- Name: idx_app_vitals_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_vitals_request_id ON public.app_vitals USING btree (request_id);


--
-- Name: idx_approval_tokens_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_tokens_quote ON public.quote_approval_tokens USING btree (quote_id);


--
-- Name: idx_approval_tokens_token_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_approval_tokens_token_status ON public.quote_approval_tokens USING btree (token, status) WHERE (status = 'active'::text);


--
-- Name: idx_art_files_mockup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_art_files_mockup ON public.art_file_attachments USING btree (mockup_id);


--
-- Name: idx_art_files_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_art_files_quote ON public.art_file_attachments USING btree (quote_id);


--
-- Name: idx_art_files_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_art_files_user ON public.art_file_attachments USING btree (user_id);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_event_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_event_type ON public.audit_logs USING btree (event_type);


--
-- Name: idx_audit_logs_identifier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_identifier ON public.audit_logs USING btree (identifier);


--
-- Name: idx_auth_login_attempts_email_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_login_attempts_email_created ON public.auth_login_attempts USING btree (email, created_at DESC);


--
-- Name: idx_auth_login_attempts_ip_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_login_attempts_ip_created ON public.auth_login_attempts USING btree (ip_address, created_at DESC);


--
-- Name: idx_bot_log_blocked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_log_blocked ON public.bot_detection_log USING btree (blocked) WHERE (blocked = true);


--
-- Name: idx_bot_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_log_created ON public.bot_detection_log USING btree (created_at DESC);


--
-- Name: idx_bot_log_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bot_log_ip ON public.bot_detection_log USING btree (ip_address);


--
-- Name: idx_cart_templates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cart_templates_user_id ON public.cart_templates USING btree (user_id);


--
-- Name: idx_collection_items_collection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_items_collection ON public.collection_items USING btree (collection_id, sort_order);


--
-- Name: idx_collection_items_collection_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_items_collection_id ON public.collection_items USING btree (collection_id);


--
-- Name: idx_collection_reactions_collection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_reactions_collection ON public.collection_item_reactions USING btree (collection_id);


--
-- Name: idx_collection_reactions_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_reactions_item ON public.collection_item_reactions USING btree (item_id);


--
-- Name: idx_collection_trash_collection; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_trash_collection ON public.collection_items_trash USING btree (collection_id);


--
-- Name: idx_collection_trash_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_trash_expires ON public.collection_items_trash USING btree (expires_at);


--
-- Name: idx_collection_trash_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_trash_user ON public.collection_items_trash USING btree (user_id);


--
-- Name: idx_collections_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_client ON public.collections USING btree (client_id) WHERE (client_id IS NOT NULL);


--
-- Name: idx_collections_share_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_share_token ON public.collections USING btree (share_token) WHERE (share_token IS NOT NULL);


--
-- Name: idx_collections_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collections_user_id ON public.collections USING btree (user_id);


--
-- Name: idx_comparison_reactions_comp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comparison_reactions_comp ON public.comparison_reactions USING btree (comparison_id, created_at DESC);


--
-- Name: idx_connection_test_history_conn_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connection_test_history_conn_time ON public.connection_test_history USING btree (connection_id, tested_at DESC);


--
-- Name: idx_conv_audit_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_audit_session_id ON public.conversation_audit_logs USING btree (session_id);


--
-- Name: idx_conv_audit_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_audit_user_id ON public.conversation_audit_logs USING btree (user_id);


--
-- Name: idx_conv_delivery_event_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_delivery_event_id ON public.conversation_delivery_status USING btree (event_id);


--
-- Name: idx_conv_event_conv_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_conv_event_conv_id ON public.conversation_event_history USING btree (conversation_id);


--
-- Name: idx_cth_triggered_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cth_triggered_by ON public.connection_test_history USING btree (triggered_by);


--
-- Name: idx_custom_kits_tag; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_kits_tag ON public.custom_kits USING btree (tag);


--
-- Name: idx_custom_kits_user_favorite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_kits_user_favorite ON public.custom_kits USING btree (user_id, is_favorite) WHERE (is_favorite = true);


--
-- Name: idx_custom_kits_user_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_kits_user_pinned ON public.custom_kits USING btree (user_id, is_pinned DESC, last_used_at DESC NULLS LAST);


--
-- Name: idx_dar_seller_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dar_seller_created_at ON public.discount_approval_requests USING btree (seller_id, created_at DESC);


--
-- Name: idx_dar_seller_status_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dar_seller_status_created_at ON public.discount_approval_requests USING btree (seller_id, status, created_at DESC);


--
-- Name: idx_discount_approval_requests_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_approval_requests_quote_id ON public.discount_approval_requests USING btree (quote_id);


--
-- Name: idx_discount_approval_requests_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_approval_requests_seller_id ON public.discount_approval_requests USING btree (seller_id);


--
-- Name: idx_discount_approval_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_discount_approval_requests_status ON public.discount_approval_requests USING btree (status);


--
-- Name: idx_e2e_cleanup_audit_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e2e_cleanup_audit_created_at ON public.e2e_cleanup_audit USING btree (created_at DESC);


--
-- Name: idx_e2e_cleanup_audit_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e2e_cleanup_audit_email ON public.e2e_cleanup_audit USING btree (email, created_at DESC);


--
-- Name: idx_e2e_cleanup_audit_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e2e_cleanup_audit_seller_id ON public.e2e_cleanup_audit USING btree (seller_id, created_at DESC) WHERE (seller_id IS NOT NULL);


--
-- Name: idx_e2e_cleanup_audit_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_e2e_cleanup_audit_status ON public.e2e_cleanup_audit USING btree (status, created_at DESC);


--
-- Name: idx_expert_conversations_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_conversations_seller_id ON public.expert_conversations USING btree (seller_id);


--
-- Name: idx_expert_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expert_messages_conversation_id ON public.expert_messages USING btree (conversation_id);


--
-- Name: idx_ext_conn_sync_log_ran_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ext_conn_sync_log_ran_at ON public.external_connections_sync_log USING btree (ran_at DESC);


--
-- Name: idx_ext_conn_sync_log_secret; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ext_conn_sync_log_secret ON public.external_connections_sync_log USING btree (triggered_by_secret_name);


--
-- Name: idx_external_connections_auto_test_enabled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_connections_auto_test_enabled ON public.external_connections USING btree (auto_test_enabled) WHERE (auto_test_enabled = true);


--
-- Name: idx_external_connections_envkey_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_external_connections_envkey_type ON public.external_connections USING btree (env_key, type) WHERE (env_key IS NOT NULL);


--
-- Name: idx_external_connections_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_connections_type ON public.external_connections USING btree (type);


--
-- Name: idx_favorite_items_list; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_items_list ON public.favorite_items USING btree (list_id, "position");


--
-- Name: idx_favorite_items_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_items_product ON public.favorite_items USING btree (product_id);


--
-- Name: idx_favorite_items_trash_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_items_trash_expires ON public.favorite_items_trash USING btree (expires_at);


--
-- Name: idx_favorite_items_trash_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_items_trash_user ON public.favorite_items_trash USING btree (user_id, deleted_at DESC);


--
-- Name: idx_favorite_items_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_favorite_items_unique ON public.favorite_items USING btree (list_id, product_id, COALESCE(variant_id, ''::text));


--
-- Name: idx_favorite_items_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_items_user ON public.favorite_items USING btree (user_id);


--
-- Name: idx_favorite_lists_one_default; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_favorite_lists_one_default ON public.favorite_lists USING btree (user_id) WHERE (is_default = true);


--
-- Name: idx_favorite_lists_shared_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_lists_shared_token ON public.favorite_lists USING btree (shared_token) WHERE (shared_token IS NOT NULL);


--
-- Name: idx_favorite_lists_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_lists_user ON public.favorite_lists USING btree (user_id, "position");


--
-- Name: idx_favorite_reactions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_reactions_created ON public.favorite_item_reactions USING btree (created_at DESC);


--
-- Name: idx_favorite_reactions_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_reactions_item ON public.favorite_item_reactions USING btree (item_id);


--
-- Name: idx_favorite_reactions_list; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_favorite_reactions_list ON public.favorite_item_reactions USING btree (list_id);


--
-- Name: idx_file_scan_logs_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_scan_logs_hash ON public.file_scan_logs USING btree (hash);


--
-- Name: idx_file_scan_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_file_scan_logs_user_id ON public.file_scan_logs USING btree (user_id);


--
-- Name: idx_follow_up_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follow_up_pending ON public.follow_up_reminders USING btree (is_sent, scheduled_for);


--
-- Name: idx_follow_up_reminders_completed; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follow_up_reminders_completed ON public.follow_up_reminders USING btree (is_completed, scheduled_for);


--
-- Name: idx_follow_up_reminders_seller_scheduled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_follow_up_reminders_seller_scheduled ON public.follow_up_reminders USING btree (seller_id, scheduled_for DESC);


--
-- Name: idx_geo_allowed_countries_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_geo_allowed_countries_created_by ON public.geo_allowed_countries USING btree (created_by);


--
-- Name: idx_hardening_snapshots_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_hardening_snapshots_at ON public.hardening_health_snapshots USING btree (snapshot_at DESC);


--
-- Name: idx_inbound_events_endpoint_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_events_endpoint_time ON public.inbound_webhook_events USING btree (endpoint_id, received_at DESC);


--
-- Name: idx_integration_credentials_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_integration_credentials_name ON public.integration_credentials USING btree (secret_name);


--
-- Name: idx_ip_access_control_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_access_control_ip ON public.ip_access_control USING btree (ip_address);


--
-- Name: idx_ip_access_control_type_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ip_access_control_type_expires ON public.ip_access_control USING btree (list_type, expires_at);


--
-- Name: idx_kit_collab_kit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kit_collab_kit ON public.kit_collaborators USING btree (kit_id);


--
-- Name: idx_kit_collab_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kit_collab_user ON public.kit_collaborators USING btree (user_id);


--
-- Name: idx_kit_comments_kit; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kit_comments_kit ON public.kit_comments USING btree (kit_id);


--
-- Name: idx_kit_comments_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kit_comments_parent ON public.kit_comments USING btree (parent_id);


--
-- Name: idx_kit_share_tokens_kit_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kit_share_tokens_kit_id ON public.kit_share_tokens USING btree (kit_id);


--
-- Name: idx_kit_templates_active_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kit_templates_active_category ON public.kit_templates USING btree (is_active, category);


--
-- Name: idx_kit_templates_usage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kit_templates_usage ON public.kit_templates USING btree (usage_count DESC) WHERE (is_active = true);


--
-- Name: idx_kit_variants_master; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kit_variants_master ON public.kit_variants USING btree (kit_master_id);


--
-- Name: idx_login_attempts_email_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_login_attempts_email_created ON public.login_attempts USING btree (email, created_at DESC);


--
-- Name: idx_magic_up_brand_kits_user_client; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_brand_kits_user_client ON public.magic_up_brand_kits USING btree (user_id, client_id);


--
-- Name: idx_magic_up_campaigns_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_campaigns_user_status ON public.magic_up_campaigns USING btree (user_id, status, created_at DESC);


--
-- Name: idx_magic_up_comments_generation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_comments_generation ON public.magic_up_comments USING btree (generation_id, created_at DESC);


--
-- Name: idx_magic_up_generations_campaign; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_generations_campaign ON public.magic_up_generations USING btree (campaign_id, created_at DESC);


--
-- Name: idx_magic_up_generations_tags; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_generations_tags ON public.magic_up_generations USING gin (tags);


--
-- Name: idx_magic_up_generations_user_channel_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_generations_user_channel_status ON public.magic_up_generations USING btree (user_id, channel, status, created_at DESC);


--
-- Name: idx_magic_up_generations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_generations_user_id ON public.magic_up_generations USING btree (user_id);


--
-- Name: idx_magic_up_public_shares_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_public_shares_campaign_id ON public.magic_up_public_shares USING btree (campaign_id);


--
-- Name: idx_magic_up_public_shares_generation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_public_shares_generation_id ON public.magic_up_public_shares USING btree (generation_id);


--
-- Name: idx_magic_up_public_shares_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_public_shares_token ON public.magic_up_public_shares USING btree (share_token);


--
-- Name: idx_magic_up_reactions_generation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_magic_up_reactions_generation ON public.magic_up_reactions USING btree (generation_id, created_at DESC);


--
-- Name: idx_mcp_api_keys_rotated_from; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_api_keys_rotated_from ON public.mcp_api_keys USING btree (rotated_from) WHERE (rotated_from IS NOT NULL);


--
-- Name: idx_mcp_auto_rev_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_auto_rev_key ON public.mcp_key_auto_revocations USING btree (key_id);


--
-- Name: idx_mcp_auto_rev_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_auto_rev_user ON public.mcp_key_auto_revocations USING btree (created_by, revoked_at DESC);


--
-- Name: idx_mcp_violations_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_violations_created ON public.mcp_access_violations USING btree (created_at DESC);


--
-- Name: idx_mcp_violations_ip_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_violations_ip_created ON public.mcp_access_violations USING btree (ip_address, created_at DESC);


--
-- Name: idx_mcp_violations_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mcp_violations_user_created ON public.mcp_access_violations USING btree (user_id, created_at DESC);


--
-- Name: idx_mockup_prompt_configs_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mockup_prompt_configs_key ON public.mockup_prompt_configs USING btree (config_key);


--
-- Name: idx_mockup_prompt_configs_technique; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mockup_prompt_configs_technique ON public.mockup_prompt_configs USING btree (technique_id);


--
-- Name: idx_mockup_prompt_history_config; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mockup_prompt_history_config ON public.mockup_prompt_history USING btree (config_id, changed_at DESC);


--
-- Name: idx_mockup_templates_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mockup_templates_product ON public.mockup_templates USING btree (product_id);


--
-- Name: idx_mockup_templates_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mockup_templates_user ON public.mockup_templates USING btree (user_id);


--
-- Name: idx_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created ON public.workspace_notifications USING btree (created_at DESC);


--
-- Name: idx_optimization_queue_runs_queue; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_queue_runs_queue ON public.optimization_queue_runs USING btree (queue_id, created_at DESC);


--
-- Name: idx_optimization_queue_status_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_optimization_queue_status_priority ON public.optimization_queue USING btree (status, priority, created_at);


--
-- Name: idx_order_item_personalizations_order_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_item_personalizations_order_item_id ON public.order_item_personalizations USING btree (order_item_id);


--
-- Name: idx_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_order_id ON public.order_items USING btree (order_id);


--
-- Name: idx_order_items_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_organization_id ON public.order_items USING btree (organization_id);


--
-- Name: idx_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_order_items_product_id ON public.order_items USING btree (product_id);


--
-- Name: idx_orders_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_client_status ON public.orders USING btree (client_id, status);


--
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at DESC);


--
-- Name: idx_orders_number_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_number_search ON public.orders USING gin (order_number extensions.gin_trgm_ops);


--
-- Name: idx_orders_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_organization_id ON public.orders USING btree (organization_id);


--
-- Name: idx_orders_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_quote_id ON public.orders USING btree (quote_id);


--
-- Name: idx_orders_seller_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_seller_org ON public.orders USING btree (seller_id, organization_id);


--
-- Name: idx_orders_seller_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_seller_status ON public.orders USING btree (seller_id, status);


--
-- Name: idx_orders_seller_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_seller_status_created ON public.orders USING btree (seller_id, status, created_at DESC);


--
-- Name: idx_orders_seller_status_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_seller_status_updated_at ON public.orders USING btree (seller_id, status, updated_at DESC);


--
-- Name: idx_orders_seller_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_orders_seller_updated_at ON public.orders USING btree (seller_id, updated_at DESC);


--
-- Name: idx_org_members_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_members_org_id ON public.organization_members USING btree (organization_id);


--
-- Name: idx_org_members_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_members_user_id ON public.organization_members USING btree (user_id);


--
-- Name: idx_outbound_webhooks_active_events; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_outbound_webhooks_active_events ON public.outbound_webhooks USING gin (events) WHERE (active = true);


--
-- Name: idx_ownership_audit_reports_generated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ownership_audit_reports_generated_at ON public.ownership_audit_reports USING btree (generated_at DESC);


--
-- Name: idx_ownership_repair_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ownership_repair_logs_created_at ON public.ownership_repair_logs USING btree (created_at DESC);


--
-- Name: idx_ownership_repair_logs_report; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ownership_repair_logs_report ON public.ownership_repair_logs USING btree (report_id);


--
-- Name: idx_personalizations_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_personalizations_item ON public.quote_item_personalizations USING btree (quote_item_id);


--
-- Name: idx_pfo_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pfo_product_id ON public.product_price_freshness_overrides USING btree (product_id);


--
-- Name: idx_price_history_product_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_history_product_date ON public.price_history USING btree (product_id, recorded_at DESC);


--
-- Name: idx_product_comp_loc_component; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_comp_loc_component ON public.product_component_locations USING btree (component_id);


--
-- Name: idx_product_group_members_product_group_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_group_members_product_group_id ON public.product_group_members USING btree (product_group_id);


--
-- Name: idx_product_price_freshness_overrides_updated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_price_freshness_overrides_updated_by ON public.product_price_freshness_overrides USING btree (updated_by);


--
-- Name: idx_product_sync_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_sync_logs_created ON public.product_sync_logs USING btree (created_at DESC);


--
-- Name: idx_product_sync_logs_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_sync_logs_source ON public.product_sync_logs USING btree (source, status);


--
-- Name: idx_product_views_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_product_id ON public.product_views USING btree (product_id);


--
-- Name: idx_product_views_seller; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_views_seller ON public.product_views USING btree (seller_id, created_at DESC);


--
-- Name: idx_public_token_failures_ip; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_token_failures_ip ON public.public_token_failures USING btree (ip_address, created_at DESC);


--
-- Name: idx_public_token_failures_resource; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_token_failures_resource ON public.public_token_failures USING btree (resource_type, resource_id, created_at DESC);


--
-- Name: idx_query_telemetry_cache_hit_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_telemetry_cache_hit_created ON public.query_telemetry USING btree (cache_hit, created_at DESC) WHERE (cache_hit = true);


--
-- Name: idx_query_telemetry_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_telemetry_created ON public.query_telemetry USING btree (created_at DESC);


--
-- Name: idx_query_telemetry_error_kind_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_telemetry_error_kind_created ON public.query_telemetry USING btree (error_kind, created_at DESC) WHERE (error_kind IS NOT NULL);


--
-- Name: idx_query_telemetry_op_table_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_telemetry_op_table_created ON public.query_telemetry USING btree (operation, table_name, created_at DESC);


--
-- Name: idx_query_telemetry_platform_failures; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_telemetry_platform_failures ON public.query_telemetry USING btree (created_at DESC) WHERE ((is_503 = true) OR (is_cold_start = true));


--
-- Name: idx_query_telemetry_retry_count_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_telemetry_retry_count_created ON public.query_telemetry USING btree (retry_count, created_at DESC) WHERE (retry_count > 0);


--
-- Name: idx_query_telemetry_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_query_telemetry_severity ON public.query_telemetry USING btree (severity, created_at DESC);


--
-- Name: idx_quote_approval_tokens_quote; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_approval_tokens_quote ON public.quote_approval_tokens USING btree (quote_id, status);


--
-- Name: idx_quote_approval_tokens_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_approval_tokens_seller_id ON public.quote_approval_tokens USING btree (seller_id);


--
-- Name: idx_quote_comments_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_comments_created_at ON public.quote_comments USING btree (created_at DESC);


--
-- Name: idx_quote_comments_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_comments_parent_id ON public.quote_comments USING btree (parent_id);


--
-- Name: idx_quote_comments_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_comments_quote_id ON public.quote_comments USING btree (quote_id);


--
-- Name: idx_quote_comments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_comments_user_id ON public.quote_comments USING btree (user_id);


--
-- Name: idx_quote_history_quote_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_history_quote_created ON public.quote_history USING btree (quote_id, created_at DESC);


--
-- Name: idx_quote_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_history_user_id ON public.quote_history USING btree (user_id);


--
-- Name: idx_quote_item_personalizations_quote_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_item_personalizations_quote_item_id ON public.quote_item_personalizations USING btree (quote_item_id);


--
-- Name: idx_quote_items_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_items_quote_id ON public.quote_items USING btree (quote_id);


--
-- Name: idx_quote_templates_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quote_templates_seller_id ON public.quote_templates USING btree (seller_id);


--
-- Name: idx_quotes_client_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_client_status ON public.quotes USING btree (client_id, status);


--
-- Name: idx_quotes_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_created_at ON public.quotes USING btree (created_at DESC);


--
-- Name: idx_quotes_number_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_number_search ON public.quotes USING gin (quote_number extensions.gin_trgm_ops);


--
-- Name: idx_quotes_organization_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_organization_id ON public.quotes USING btree (organization_id);


--
-- Name: idx_quotes_parent_quote_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_parent_quote_id ON public.quotes USING btree (parent_quote_id);


--
-- Name: idx_quotes_seller_org; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_seller_org ON public.quotes USING btree (seller_id, organization_id);


--
-- Name: idx_quotes_seller_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_seller_status ON public.quotes USING btree (seller_id, status);


--
-- Name: idx_quotes_seller_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_seller_status_created ON public.quotes USING btree (seller_id, status, created_at DESC);


--
-- Name: idx_quotes_seller_status_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_seller_status_updated_at ON public.quotes USING btree (seller_id, status, updated_at DESC);


--
-- Name: idx_quotes_seller_updated_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_seller_updated_at ON public.quotes USING btree (seller_id, updated_at DESC);


--
-- Name: idx_quotes_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quotes_version ON public.quotes USING btree (parent_quote_id, version);


--
-- Name: idx_rate_limits_blocked_until; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_blocked_until ON public.request_rate_limits USING btree (blocked_until) WHERE (blocked_until IS NOT NULL);


--
-- Name: idx_rate_limits_identifier_endpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_rate_limits_identifier_endpoint ON public.request_rate_limits USING btree (identifier, endpoint);


--
-- Name: idx_rate_limits_window_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rate_limits_window_start ON public.request_rate_limits USING btree (window_start);


--
-- Name: idx_recently_viewed_user_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recently_viewed_user_at ON public.recently_viewed_products USING btree (user_id, viewed_at DESC);


--
-- Name: idx_recently_viewed_user_viewed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recently_viewed_user_viewed_at ON public.recently_viewed_products USING btree (user_id, viewed_at DESC);


--
-- Name: idx_rls_denial_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rls_denial_created ON public.rls_denial_log USING btree (created_at DESC);


--
-- Name: idx_rls_denial_table; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rls_denial_table ON public.rls_denial_log USING btree (table_name, created_at DESC);


--
-- Name: idx_rls_denial_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rls_denial_user ON public.rls_denial_log USING btree (user_id, created_at DESC);


--
-- Name: idx_role_mig_batches_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_mig_batches_created_at ON public.role_migration_batches USING btree (created_at DESC);


--
-- Name: idx_role_mig_batches_initiated_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_mig_batches_initiated_by ON public.role_migration_batches USING btree (initiated_by);


--
-- Name: idx_role_mig_items_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_mig_items_batch ON public.role_migration_items USING btree (batch_id);


--
-- Name: idx_role_mig_items_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_mig_items_status ON public.role_migration_items USING btree (status);


--
-- Name: idx_role_mig_items_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_mig_items_user ON public.role_migration_items USING btree (user_id);


--
-- Name: idx_saved_filters_user_context; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_filters_user_context ON public.saved_filters USING btree (user_id, context);


--
-- Name: idx_saved_trends_views_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_trends_views_user ON public.saved_trends_views USING btree (user_id);


--
-- Name: idx_scheduled_reports_next_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_reports_next_run ON public.scheduled_reports USING btree (next_run_at) WHERE (is_active = true);


--
-- Name: idx_search_analytics_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_created_at ON public.search_analytics USING btree (created_at DESC);


--
-- Name: idx_search_analytics_term_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_term_lower ON public.search_analytics USING btree (lower(search_term));


--
-- Name: idx_search_analytics_zero_results; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_search_analytics_zero_results ON public.search_analytics USING btree (created_at DESC) WHERE (results_count = 0);


--
-- Name: idx_secret_rotation_log_name_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_secret_rotation_log_name_time ON public.secret_rotation_log USING btree (secret_name, rotated_at DESC);


--
-- Name: idx_secret_rotation_log_secret_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_secret_rotation_log_secret_action ON public.secret_rotation_log USING btree (secret_name, action_type, rotated_at DESC);


--
-- Name: idx_seller_cart_items_cart_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_cart_items_cart_id ON public.seller_cart_items USING btree (cart_id);


--
-- Name: idx_seller_carts_seller_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_carts_seller_id ON public.seller_carts USING btree (seller_id);


--
-- Name: idx_seller_discount_limits_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_seller_discount_limits_user_id ON public.seller_discount_limits USING btree (user_id);


--
-- Name: idx_step_up_audit_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_step_up_audit_action ON public.step_up_audit_log USING btree (action, created_at DESC);


--
-- Name: idx_step_up_audit_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_step_up_audit_user ON public.step_up_audit_log USING btree (user_id, created_at DESC);


--
-- Name: idx_step_up_challenges_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_step_up_challenges_expires ON public.step_up_challenges USING btree (expires_at) WHERE (consumed = false);


--
-- Name: idx_step_up_challenges_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_step_up_challenges_user ON public.step_up_challenges USING btree (user_id, created_at DESC);


--
-- Name: idx_step_up_tokens_challenge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_step_up_tokens_challenge_id ON public.step_up_tokens USING btree (challenge_id);


--
-- Name: idx_step_up_tokens_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_step_up_tokens_hash ON public.step_up_tokens USING btree (token_hash) WHERE (consumed = false);


--
-- Name: idx_step_up_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_step_up_tokens_user ON public.step_up_tokens USING btree (user_id, created_at DESC);


--
-- Name: idx_user_comparisons_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_comparisons_public ON public.user_comparisons USING btree (is_public, share_expires_at) WHERE (is_public = true);


--
-- Name: idx_user_comparisons_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_comparisons_token ON public.user_comparisons USING btree (share_token) WHERE (share_token IS NOT NULL);


--
-- Name: idx_user_comparisons_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_comparisons_user ON public.user_comparisons USING btree (user_id, updated_at DESC);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_user_search_history_pinned; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_search_history_pinned ON public.user_search_history USING btree (is_pinned);


--
-- Name: idx_user_search_history_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_search_history_type ON public.user_search_history USING btree (history_type);


--
-- Name: idx_user_search_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_search_history_user_id ON public.user_search_history USING btree (user_id);


--
-- Name: idx_voice_command_logs_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_voice_command_logs_user_created ON public.voice_command_logs USING btree (user_id, created_at DESC);


--
-- Name: idx_webhook_deliveries_event_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_event_time ON public.webhook_deliveries USING btree (event, delivered_at DESC);


--
-- Name: idx_webhook_deliveries_webhook_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_deliveries_webhook_time ON public.webhook_deliveries USING btree (webhook_id, delivered_at DESC);


--
-- Name: idx_workspace_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_workspace_notifications_user_unread ON public.workspace_notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: uq_collection_reactions_anon; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_collection_reactions_anon ON public.collection_item_reactions USING btree (item_id, anon_id, emoji);


--
-- Name: uq_comparison_reactions_anon; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_comparison_reactions_anon ON public.comparison_reactions USING btree (comparison_id, item_index, emoji, anon_id);


--
-- Name: ux_ai_insights_cache_user_fn_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_ai_insights_cache_user_fn_key ON public.ai_insights_cache USING btree (user_id, function_name, cache_key);


--
-- Name: admin_audit_log_y2025m12_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.admin_audit_log_new_pkey ATTACH PARTITION public.admin_audit_log_y2025m12_pkey;


--
-- Name: admin_audit_log_y2026m01_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.admin_audit_log_new_pkey ATTACH PARTITION public.admin_audit_log_y2026m01_pkey;


--
-- Name: admin_audit_log_y2026m02_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.admin_audit_log_new_pkey ATTACH PARTITION public.admin_audit_log_y2026m02_pkey;


--
-- Name: admin_audit_log_y2026m03_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.admin_audit_log_new_pkey ATTACH PARTITION public.admin_audit_log_y2026m03_pkey;


--
-- Name: admin_audit_log_y2026m04_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.admin_audit_log_new_pkey ATTACH PARTITION public.admin_audit_log_y2026m04_pkey;


--
-- Name: admin_audit_log_y2026m05_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.admin_audit_log_new_pkey ATTACH PARTITION public.admin_audit_log_y2026m05_pkey;


--
-- Name: admin_audit_log_y2026m06_pkey; Type: INDEX ATTACH; Schema: public; Owner: -
--

ALTER INDEX public.admin_audit_log_new_pkey ATTACH PARTITION public.admin_audit_log_y2026m06_pkey;


--
-- Name: cart_templates cart_templates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cart_templates
    ADD CONSTRAINT cart_templates_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: collection_items collection_items_collection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_items
    ADD CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;


--
-- Name: comparison_reactions comparison_reactions_comparison_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comparison_reactions
    ADD CONSTRAINT comparison_reactions_comparison_id_fkey FOREIGN KEY (comparison_id) REFERENCES public.user_comparisons(id) ON DELETE CASCADE;


--
-- Name: connection_test_history connection_test_history_connection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connection_test_history
    ADD CONSTRAINT connection_test_history_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.external_connections(id) ON DELETE CASCADE;


--
-- Name: conversation_audit_logs conversation_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_audit_logs
    ADD CONSTRAINT conversation_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: conversation_delivery_status conversation_delivery_status_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_delivery_status
    ADD CONSTRAINT conversation_delivery_status_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.conversation_event_history(id) ON DELETE CASCADE;


--
-- Name: conversation_event_history conversation_event_history_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversation_event_history
    ADD CONSTRAINT conversation_event_history_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversation_audit_logs(id) ON DELETE CASCADE;


--
-- Name: discount_approval_requests discount_approval_requests_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.discount_approval_requests
    ADD CONSTRAINT discount_approval_requests_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: expert_conversations expert_conversations_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_conversations
    ADD CONSTRAINT expert_conversations_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: expert_messages expert_messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expert_messages
    ADD CONSTRAINT expert_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.expert_conversations(id) ON DELETE CASCADE;


--
-- Name: favorite_item_reactions favorite_item_reactions_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_item_reactions
    ADD CONSTRAINT favorite_item_reactions_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.favorite_items(id) ON DELETE CASCADE;


--
-- Name: favorite_item_reactions favorite_item_reactions_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_item_reactions
    ADD CONSTRAINT favorite_item_reactions_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.favorite_lists(id) ON DELETE CASCADE;


--
-- Name: favorite_items favorite_items_list_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorite_items
    ADD CONSTRAINT favorite_items_list_id_fkey FOREIGN KEY (list_id) REFERENCES public.favorite_lists(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: follow_up_reminders follow_up_reminders_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_up_reminders
    ADD CONSTRAINT follow_up_reminders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: geo_allowed_countries geo_allowed_countries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.geo_allowed_countries
    ADD CONSTRAINT geo_allowed_countries_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: inbound_webhook_events inbound_webhook_events_endpoint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_webhook_events
    ADD CONSTRAINT inbound_webhook_events_endpoint_id_fkey FOREIGN KEY (endpoint_id) REFERENCES public.inbound_webhook_endpoints(id) ON DELETE CASCADE;


--
-- Name: kit_collaborators kit_collaborators_kit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_collaborators
    ADD CONSTRAINT kit_collaborators_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE;


--
-- Name: kit_comments kit_comments_kit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_comments
    ADD CONSTRAINT kit_comments_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE;


--
-- Name: kit_comments kit_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_comments
    ADD CONSTRAINT kit_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.kit_comments(id) ON DELETE CASCADE;


--
-- Name: kit_share_tokens kit_share_tokens_kit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_share_tokens
    ADD CONSTRAINT kit_share_tokens_kit_id_fkey FOREIGN KEY (kit_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE;


--
-- Name: kit_variants kit_variants_kit_master_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kit_variants
    ADD CONSTRAINT kit_variants_kit_master_id_fkey FOREIGN KEY (kit_master_id) REFERENCES public.custom_kits(id) ON DELETE CASCADE;


--
-- Name: magic_up_comments magic_up_comments_generation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_comments
    ADD CONSTRAINT magic_up_comments_generation_id_fkey FOREIGN KEY (generation_id) REFERENCES public.magic_up_generations(id) ON DELETE CASCADE;


--
-- Name: magic_up_generations magic_up_generations_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_generations
    ADD CONSTRAINT magic_up_generations_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.magic_up_campaigns(id) ON DELETE SET NULL;


--
-- Name: magic_up_generations magic_up_generations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_generations
    ADD CONSTRAINT magic_up_generations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: magic_up_public_shares magic_up_public_shares_campaign_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_public_shares
    ADD CONSTRAINT magic_up_public_shares_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.magic_up_campaigns(id) ON DELETE CASCADE;


--
-- Name: magic_up_public_shares magic_up_public_shares_generation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_public_shares
    ADD CONSTRAINT magic_up_public_shares_generation_id_fkey FOREIGN KEY (generation_id) REFERENCES public.magic_up_generations(id) ON DELETE CASCADE;


--
-- Name: magic_up_reactions magic_up_reactions_generation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_up_reactions
    ADD CONSTRAINT magic_up_reactions_generation_id_fkey FOREIGN KEY (generation_id) REFERENCES public.magic_up_generations(id) ON DELETE CASCADE;


--
-- Name: mcp_api_keys mcp_api_keys_rotated_from_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_api_keys
    ADD CONSTRAINT mcp_api_keys_rotated_from_fkey FOREIGN KEY (rotated_from) REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL;


--
-- Name: mcp_key_auto_revocations mcp_key_auto_revocations_key_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mcp_key_auto_revocations
    ADD CONSTRAINT mcp_key_auto_revocations_key_id_fkey FOREIGN KEY (key_id) REFERENCES public.mcp_api_keys(id) ON DELETE CASCADE;


--
-- Name: mockup_drafts mockup_drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mockup_drafts
    ADD CONSTRAINT mockup_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mockup_prompt_history mockup_prompt_history_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mockup_prompt_history
    ADD CONSTRAINT mockup_prompt_history_config_id_fkey FOREIGN KEY (config_id) REFERENCES public.mockup_prompt_configs(id) ON DELETE CASCADE;


--
-- Name: optimization_queue_runs optimization_queue_runs_queue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.optimization_queue_runs
    ADD CONSTRAINT optimization_queue_runs_queue_id_fkey FOREIGN KEY (queue_id) REFERENCES public.optimization_queue(id) ON DELETE CASCADE;


--
-- Name: order_item_personalizations order_item_personalizations_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_item_personalizations
    ADD CONSTRAINT order_item_personalizations_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- Name: order_items order_items_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: orders orders_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: orders orders_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id);


--
-- Name: organization_members organization_members_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organization_members organization_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organization_members
    ADD CONSTRAINT organization_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: ownership_repair_logs ownership_repair_logs_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ownership_repair_logs
    ADD CONSTRAINT ownership_repair_logs_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.ownership_audit_reports(id) ON DELETE SET NULL;


--
-- Name: product_component_locations product_component_locations_component_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_component_locations
    ADD CONSTRAINT product_component_locations_component_id_fkey FOREIGN KEY (component_id) REFERENCES public.product_components(id) ON DELETE CASCADE;


--
-- Name: product_group_members product_group_members_product_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_group_members
    ADD CONSTRAINT product_group_members_product_group_id_fkey FOREIGN KEY (product_group_id) REFERENCES public.product_groups(id) ON DELETE CASCADE;


--
-- Name: product_price_freshness_overrides product_price_freshness_overrides_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_price_freshness_overrides
    ADD CONSTRAINT product_price_freshness_overrides_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quote_approval_tokens quote_approval_tokens_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approval_tokens
    ADD CONSTRAINT quote_approval_tokens_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: quote_comments quote_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_comments
    ADD CONSTRAINT quote_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.quote_comments(id) ON DELETE CASCADE;


--
-- Name: quote_drafts quote_drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_drafts
    ADD CONSTRAINT quote_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: quote_history quote_history_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_history
    ADD CONSTRAINT quote_history_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_item_personalizations quote_item_personalizations_quote_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_item_personalizations
    ADD CONSTRAINT quote_item_personalizations_quote_item_id_fkey FOREIGN KEY (quote_item_id) REFERENCES public.quote_items(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: quotes quotes_parent_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_parent_quote_id_fkey FOREIGN KEY (parent_quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;


--
-- Name: recently_viewed_products recently_viewed_products_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recently_viewed_products
    ADD CONSTRAINT recently_viewed_products_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: role_migration_items role_migration_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_migration_items
    ADD CONSTRAINT role_migration_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.role_migration_batches(id) ON DELETE CASCADE;


--
-- Name: saved_filters saved_filters_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_filters
    ADD CONSTRAINT saved_filters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: seller_cart_items seller_cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_cart_items
    ADD CONSTRAINT seller_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.seller_carts(id) ON DELETE CASCADE;


--
-- Name: seller_carts seller_carts_seller_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_carts
    ADD CONSTRAINT seller_carts_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: seller_discount_limits seller_discount_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seller_discount_limits
    ADD CONSTRAINT seller_discount_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: step_up_tokens step_up_tokens_challenge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.step_up_tokens
    ADD CONSTRAINT step_up_tokens_challenge_id_fkey FOREIGN KEY (challenge_id) REFERENCES public.step_up_challenges(id) ON DELETE CASCADE;


--
-- Name: user_onboarding user_onboarding_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_onboarding
    ADD CONSTRAINT user_onboarding_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_search_history user_search_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_search_history
    ADD CONSTRAINT user_search_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_token_revocations user_token_revocations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_token_revocations
    ADD CONSTRAINT user_token_revocations_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: webhook_deliveries webhook_deliveries_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.outbound_webhooks(id) ON DELETE CASCADE;


--
-- Name: access_security_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_security_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_audit_log_old; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_audit_log_old ENABLE ROW LEVEL SECURITY;

--
-- Name: admin_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_insights_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_insights_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: ai_usage_quotas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_usage_quotas ENABLE ROW LEVEL SECURITY;

--
-- Name: app_vitals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.app_vitals ENABLE ROW LEVEL SECURITY;

--
-- Name: art_file_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.art_file_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: auth_login_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: bot_detection_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bot_detection_log ENABLE ROW LEVEL SECURITY;

--
-- Name: cart_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cart_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: category_icons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.category_icons ENABLE ROW LEVEL SECURITY;

--
-- Name: collection_item_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collection_item_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: collection_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

--
-- Name: collection_items_trash; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collection_items_trash ENABLE ROW LEVEL SECURITY;

--
-- Name: collections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

--
-- Name: comparison_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comparison_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: component_media; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.component_media ENABLE ROW LEVEL SECURITY;

--
-- Name: connection_test_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connection_test_history ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_delivery_status; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_delivery_status ENABLE ROW LEVEL SECURITY;

--
-- Name: conversation_event_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.conversation_event_history ENABLE ROW LEVEL SECURITY;

--
-- Name: custom_kits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.custom_kits ENABLE ROW LEVEL SECURITY;

--
-- Name: discount_approval_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.discount_approval_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: e2e_cleanup_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.e2e_cleanup_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: e2e_cleanup_rate_limit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.e2e_cleanup_rate_limit ENABLE ROW LEVEL SECURITY;

--
-- Name: expert_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expert_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: expert_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.expert_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: external_connections; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_connections ENABLE ROW LEVEL SECURITY;

--
-- Name: external_connections_sync_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.external_connections_sync_log ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_item_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_item_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_items ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_items_trash; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_items_trash ENABLE ROW LEVEL SECURITY;

--
-- Name: favorite_lists; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorite_lists ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: file_scan_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.file_scan_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: follow_up_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.follow_up_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: generated_mockups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;

--
-- Name: geo_allowed_countries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.geo_allowed_countries ENABLE ROW LEVEL SECURITY;

--
-- Name: hardening_health_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.hardening_health_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: inbound_webhook_endpoints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inbound_webhook_endpoints ENABLE ROW LEVEL SECURITY;

--
-- Name: inbound_webhook_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inbound_webhook_events ENABLE ROW LEVEL SECURITY;

--
-- Name: integration_credentials; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.integration_credentials ENABLE ROW LEVEL SECURITY;

--
-- Name: ip_access_control; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ip_access_control ENABLE ROW LEVEL SECURITY;

--
-- Name: kit_collaborators; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kit_collaborators ENABLE ROW LEVEL SECURITY;

--
-- Name: kit_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kit_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: kit_share_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kit_share_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: kit_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kit_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: kit_variants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kit_variants ENABLE ROW LEVEL SECURITY;

--
-- Name: login_attempts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_up_brand_kits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_up_brand_kits ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_up_campaigns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_up_campaigns ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_up_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_up_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_up_generations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_up_generations ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_up_public_shares; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_up_public_shares ENABLE ROW LEVEL SECURITY;

--
-- Name: magic_up_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.magic_up_reactions ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_access_violations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_access_violations ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_api_keys; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_full_grantors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_full_grantors ENABLE ROW LEVEL SECURITY;

--
-- Name: mcp_key_auto_revocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mcp_key_auto_revocations ENABLE ROW LEVEL SECURITY;

--
-- Name: mockup_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mockup_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: mockup_prompt_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mockup_prompt_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: mockup_prompt_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mockup_prompt_history ENABLE ROW LEVEL SECURITY;

--
-- Name: mockup_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.mockup_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: optimization_queue; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.optimization_queue ENABLE ROW LEVEL SECURITY;

--
-- Name: optimization_queue_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.optimization_queue_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: order_item_personalizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_item_personalizations ENABLE ROW LEVEL SECURITY;

--
-- Name: order_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

--
-- Name: orders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

--
-- Name: organization_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: outbound_webhooks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: ownership_audit_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ownership_audit_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: ownership_repair_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ownership_repair_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: product_component_locations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_component_locations ENABLE ROW LEVEL SECURITY;

--
-- Name: product_components; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_components ENABLE ROW LEVEL SECURITY;

--
-- Name: product_group_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_group_members ENABLE ROW LEVEL SECURITY;

--
-- Name: product_groups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_groups ENABLE ROW LEVEL SECURITY;

--
-- Name: product_price_freshness_overrides; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_price_freshness_overrides ENABLE ROW LEVEL SECURITY;

--
-- Name: product_sync_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_sync_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: product_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: public_token_failures; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.public_token_failures ENABLE ROW LEVEL SECURITY;

--
-- Name: query_telemetry; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.query_telemetry ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_approval_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_approval_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_item_personalizations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_item_personalizations ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

--
-- Name: quote_templates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

--
-- Name: quotes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

--
-- Name: recently_viewed_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recently_viewed_products ENABLE ROW LEVEL SECURITY;

--
-- Name: request_rate_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: rls_denial_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rls_denial_log ENABLE ROW LEVEL SECURITY;

--
-- Name: role_migration_batches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_migration_batches ENABLE ROW LEVEL SECURITY;

--
-- Name: role_migration_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_migration_items ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_filters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;

--
-- Name: saved_trends_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.saved_trends_views ENABLE ROW LEVEL SECURITY;

--
-- Name: scheduled_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: search_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.search_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: secret_rotation_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.secret_rotation_log ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_cart_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_cart_items ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_carts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_carts ENABLE ROW LEVEL SECURITY;

--
-- Name: seller_discount_limits; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.seller_discount_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: simulator_wizard_drafts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.simulator_wizard_drafts ENABLE ROW LEVEL SECURITY;

--
-- Name: step_up_audit_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.step_up_audit_log ENABLE ROW LEVEL SECURITY;

--
-- Name: step_up_challenges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.step_up_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: step_up_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.step_up_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: system_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: user_comparisons; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_comparisons ENABLE ROW LEVEL SECURITY;

--
-- Name: user_onboarding; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

--
-- Name: user_preferences; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_search_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_search_history ENABLE ROW LEVEL SECURITY;

--
-- Name: user_token_revocations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_token_revocations ENABLE ROW LEVEL SECURITY;

--
-- Name: video_variant_links; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.video_variant_links ENABLE ROW LEVEL SECURITY;

--
-- Name: voice_command_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.voice_command_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_delivery_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_delivery_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_delivery_metrics_y2026m05; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_delivery_metrics_y2026m05 ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_delivery_metrics_y2026m06; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.webhook_delivery_metrics_y2026m06 ENABLE ROW LEVEL SECURITY;

--
-- Name: workspace_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.workspace_notifications ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict Ab7r9tvH7UqncqwCpt5168cYaz8FodxlkXPhs5Bz14b0bQvzRhlH3dg0qHUIEkj

