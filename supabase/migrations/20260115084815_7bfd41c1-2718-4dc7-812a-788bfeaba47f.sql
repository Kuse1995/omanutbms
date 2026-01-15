-- Add paid_amount column to invoices for partial payment tracking
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS paid_amount numeric NOT NULL DEFAULT 0;

-- Update existing paid invoices to have paid_amount = total_amount
UPDATE public.invoices
SET paid_amount = total_amount
WHERE status = 'paid';

-- Add partial status to invoices by computing based on paid_amount
-- Note: Status will be managed in application logic