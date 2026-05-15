-- Function to purge old audit logs
CREATE OR REPLACE FUNCTION public.purge_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    retention_days INT := 90;
    row_limit INT := 100000;
    current_count INT;
BEGIN
    -- 1. Remove logs older than the retention period
    DELETE FROM public.audit_logs
    WHERE created_at < now() - (retention_days || ' days')::interval;

    -- 2. Check total row count and trim if it exceeds the hard limit
    SELECT count(*) INTO current_count FROM public.audit_logs;
    
    IF current_count > row_limit THEN
        DELETE FROM public.audit_logs
        WHERE id IN (
            SELECT id
            FROM public.audit_logs
            ORDER BY created_at ASC
            LIMIT (current_count - row_limit)
        );
    END IF;
END;
$$;

-- Schedule the purge to run daily at 3:00 AM
-- Note: pg_cron is available in Supabase/Lovable Cloud environments
SELECT cron.schedule(
    'purge-audit-logs-daily',
    '0 3 * * *',
    'SELECT public.purge_old_audit_logs()'
);
