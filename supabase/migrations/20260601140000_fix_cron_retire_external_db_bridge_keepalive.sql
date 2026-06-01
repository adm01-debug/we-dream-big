-- A edge function external-db-bridge está aposentada (kill-switch OFF, Caminho B concluído).
-- O cron job 'external-db-bridge-keepalive' (a cada 4 min) tentava fazer net.http_post
-- para essa função, mas 'app.supabase_functions_base_url' nunca foi configurado via
-- ALTER DATABASE → url=NULL → violação NOT NULL em net.http_request_queue → 14+ falhas/hora.
-- Essas falhas derrubavam o smoke test cron_health_1h (conta qualquer falha na última hora).
--
-- Solução: remover o job. A bridge não receberá deploy — não há razão para mantê-la ativa.
-- Idempotente: SELECT cron.unschedule retorna false se o job não existir.

SELECT cron.unschedule('external-db-bridge-keepalive');
