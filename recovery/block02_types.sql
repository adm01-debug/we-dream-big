-- Generated from pg_dump --schema-only --schema=public

-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'manager',
    'vendedor',
    'supervisor',
    'dev'
);


--
-- Name: conversation_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.conversation_event_type AS ENUM (
    'text',
    'image',
    'file',
    'system',
    'tool_call',
    'tool_result'
);


--
-- Name: org_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_role AS ENUM (
    'owner',
    'admin',
    'member'
);


--
-- Name: role_migration_item_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_migration_item_status AS ENUM (
    'pending',
    'success',
    'failed',
    'skipped',
    'dry_run'
);


--
-- Name: role_migration_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.role_migration_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'partial',
    'dry_run'
);


--
-- Name: step_up_action; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.step_up_action AS ENUM (
    'promote_dev',
    'demote_dev',
    'mcp_full_issue',
    'mcp_full_escalate',
    'secret_rotation',
    'secret_revoke',
    'mcp_key_revoke',
    'mcp_key_rotate'
);


--
