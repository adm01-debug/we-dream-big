DROP TRIGGER IF EXISTS trg_auto_commission_on_order ON public.orders;
DROP FUNCTION IF EXISTS public.auto_create_commission_entry() CASCADE;
DROP FUNCTION IF EXISTS public.validate_commission_status() CASCADE;
DROP TABLE IF EXISTS public.commission_entries CASCADE;
DROP TABLE IF EXISTS public.commission_rules CASCADE;