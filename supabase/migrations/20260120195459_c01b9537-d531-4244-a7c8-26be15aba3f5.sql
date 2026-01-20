-- Fix existing paid invoices where paid_amount doesn't match total_amount
UPDATE public.invoices
SET paid_amount = total_amount
WHERE status = 'paid' AND (paid_amount IS NULL OR paid_amount < total_amount);

-- Fix invoices where paid_amount >= total_amount but status is not 'paid'
UPDATE public.invoices
SET status = 'paid'
WHERE paid_amount >= total_amount AND paid_amount > 0 AND status NOT IN ('paid', 'cancelled');

-- Fix partial payments: if 0 < paid_amount < total_amount, set status to 'partial'
UPDATE public.invoices
SET status = 'partial'
WHERE paid_amount > 0 AND paid_amount < total_amount AND status NOT IN ('partial', 'cancelled', 'paid');