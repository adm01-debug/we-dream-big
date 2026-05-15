-- Fix follow_up_reminders FK to cascade on quote delete
ALTER TABLE public.follow_up_reminders
  DROP CONSTRAINT follow_up_reminders_quote_id_fkey;

ALTER TABLE public.follow_up_reminders
  ADD CONSTRAINT follow_up_reminders_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;

-- Also fix orders FK (SET NULL is fine, but let's keep it - confdeltype 'a' = no action, fix it)
ALTER TABLE public.orders
  DROP CONSTRAINT orders_quote_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_quote_id_fkey
  FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE SET NULL;