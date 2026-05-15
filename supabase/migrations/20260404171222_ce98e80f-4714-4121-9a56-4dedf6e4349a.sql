-- Trigger to validate email_to matches the user's own email in profiles
CREATE OR REPLACE FUNCTION public.validate_scheduled_report_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF user_email IS NULL OR NEW.email_to != user_email THEN
    RAISE EXCEPTION 'email_to must match your registered email address';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_report_email ON public.scheduled_reports;
CREATE TRIGGER trg_validate_report_email
BEFORE INSERT OR UPDATE ON public.scheduled_reports
FOR EACH ROW
EXECUTE FUNCTION public.validate_scheduled_report_email();