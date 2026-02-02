-- Phase 4: Add updated_at column to subscription_payments
ALTER TABLE public.subscription_payments 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add trigger for auto-update
CREATE TRIGGER update_subscription_payments_updated_at
BEFORE UPDATE ON public.subscription_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();