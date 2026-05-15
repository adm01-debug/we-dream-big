-- T33: Remove explicit anon EXECUTE grants on all public-schema functions
-- service_role and authenticated roles are unaffected.
-- Prevents unauthenticated callers from invoking elevated-privilege functions.
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
