
-- Backfill organization_id from parent order
UPDATE public.order_items oi
SET organization_id = o.organization_id
FROM public.orders o
WHERE oi.order_id::uuid = o.id
  AND oi.organization_id IS NULL
  AND o.organization_id IS NOT NULL;

-- For any remaining orphans without a parent order org, we cannot enforce NOT NULL yet
-- So only set NOT NULL if all rows now have a value
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM public.order_items WHERE organization_id IS NULL;
  IF null_count = 0 THEN
    ALTER TABLE public.order_items ALTER COLUMN organization_id SET NOT NULL;
  END IF;
END $$;
