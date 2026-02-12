
-- Step 1: Fix duplicate invoice numbers by renumbering duplicates
-- Keep the oldest record's number, assign new sequential numbers to newer duplicates
WITH duplicates AS (
  SELECT id, tenant_id, invoice_number, created_at,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, invoice_number ORDER BY created_at) as rn
  FROM public.invoices
),
to_fix AS (
  SELECT d.id, d.tenant_id, d.invoice_number,
    d.invoice_number || '-DUP' || d.rn as new_number
  FROM duplicates d
  WHERE d.rn > 1
)
UPDATE public.invoices i
SET invoice_number = tf.new_number
FROM to_fix tf
WHERE i.id = tf.id;

-- Step 2: Fix duplicate quotation numbers similarly
WITH duplicates AS (
  SELECT id, tenant_id, quotation_number, created_at,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, quotation_number ORDER BY created_at) as rn
  FROM public.quotations
),
to_fix AS (
  SELECT d.id, d.tenant_id, d.quotation_number,
    d.quotation_number || '-DUP' || d.rn as new_number
  FROM duplicates d
  WHERE d.rn > 1
)
UPDATE public.quotations q
SET quotation_number = tf.new_number
FROM to_fix tf
WHERE q.id = tf.id;

-- Step 3: Now add the unique constraints
ALTER TABLE public.invoices ADD CONSTRAINT uq_invoices_tenant_number UNIQUE (tenant_id, invoice_number);
ALTER TABLE public.quotations ADD CONSTRAINT uq_quotations_tenant_number UNIQUE (tenant_id, quotation_number);
