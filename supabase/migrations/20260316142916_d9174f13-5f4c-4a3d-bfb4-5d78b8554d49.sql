
-- Add deactivated_at column
ALTER TABLE public.business_profiles 
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ DEFAULT NULL;

-- Trigger to auto-manage deactivated_at based on billing_status changes
CREATE OR REPLACE FUNCTION public.manage_deactivated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.billing_status IS DISTINCT FROM OLD.billing_status THEN
    IF NEW.billing_status = 'inactive' THEN
      NEW.deactivated_at := NOW();
    ELSIF NEW.billing_status IN ('active', 'trial') THEN
      NEW.deactivated_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_manage_deactivated_at
BEFORE UPDATE ON public.business_profiles
FOR EACH ROW
EXECUTE FUNCTION public.manage_deactivated_at();

-- Backfill: set deactivated_at for currently inactive tenants
UPDATE public.business_profiles
SET deactivated_at = NOW()
WHERE billing_status = 'inactive' AND deactivated_at IS NULL;
