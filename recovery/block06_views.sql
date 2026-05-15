-- Generated from pg_dump --schema-only --schema=public

-- Name: v_full_scope_grants; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_full_scope_grants WITH (security_invoker='on') AS
 SELECT sual.id AS audit_id,
    sual.created_at AS granted_at,
    sual.user_id AS granted_to_user_id,
    p.full_name AS granted_to_name,
    u.email AS granted_to_email,
    sual.action AS step_up_action,
    (sual.metadata ->> 'operation'::text) AS operation,
    ((sual.metadata ->> 'key_id'::text))::uuid AS key_id,
    (sual.metadata ->> 'key_prefix'::text) AS key_prefix,
    ((sual.metadata ->> 'expires_at'::text))::timestamp with time zone AS key_expires_at,
    (sual.metadata ->> 'justification'::text) AS justification,
    sual.challenge_id,
    sual.token_id,
    sual.ip_address,
    sual.user_agent,
    (sual.metadata ->> 'request_id'::text) AS request_id,
    (sual.metadata -> 'verifications'::text) AS verifications_applied,
    (sual.metadata -> 'extra'::text) AS extra
   FROM ((public.step_up_audit_log sual
     LEFT JOIN public.profiles p ON ((p.id = sual.user_id)))
     LEFT JOIN auth.users u ON ((u.id = sual.user_id)))
  WHERE (sual.event_type = 'full_scope_granted'::text);


--
