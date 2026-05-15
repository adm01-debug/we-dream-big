-- T33b: Remove PUBLIC default EXECUTE on all public-schema functions,
-- then explicitly grant to authenticated and service_role only.
-- anon role gets no EXECUTE privilege via PUBLIC inheritance either.
-- Advisor target: anon_security_definer_function_executable = 0
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT  EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
