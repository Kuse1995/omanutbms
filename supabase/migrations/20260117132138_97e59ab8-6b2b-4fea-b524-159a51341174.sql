-- Fix the receipt number generation trigger to handle malformed receipt numbers with suffixes
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  -- If receipt_number is already set (not empty/null), keep it
  IF NEW.receipt_number IS NOT NULL AND NEW.receipt_number != '' THEN
    RETURN NEW;
  END IF;

  year_prefix := 'R' || to_char(CURRENT_DATE, 'YYYY');
  
  -- Use regexp_replace to extract only digits after the year-prefix
  -- This handles cases like 'R2026-0001', 'R2026-0001-DUP2', etc.
  SELECT COALESCE(MAX(
    CAST(
      regexp_replace(
        regexp_replace(receipt_number, '^R\d{4}-', ''),  -- Remove prefix
        '[^0-9].*$', ''  -- Remove everything after non-digits
      ) AS integer
    )
  ), 0) + 1
  INTO next_number
  FROM public.payment_receipts
  WHERE receipt_number LIKE year_prefix || '-%'
    AND tenant_id = NEW.tenant_id;  -- Scope to tenant for proper sequencing
  
  NEW.receipt_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$function$;

-- Also fix the sale number generation trigger for consistency
CREATE OR REPLACE FUNCTION public.generate_sale_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  -- If sale_number is already set (not empty/null), keep it
  IF NEW.sale_number IS NOT NULL AND NEW.sale_number != '' THEN
    RETURN NEW;
  END IF;

  year_prefix := 'S' || to_char(CURRENT_DATE, 'YYYY');
  
  -- Use regexp_replace to extract only digits after the year-prefix
  SELECT COALESCE(MAX(
    CAST(
      regexp_replace(
        regexp_replace(sale_number, '^S\d{4}-', ''),  -- Remove prefix
        '[^0-9].*$', ''  -- Remove everything after non-digits
      ) AS integer
    )
  ), 0) + 1
  INTO next_number
  FROM public.sales
  WHERE sale_number LIKE year_prefix || '-%'
    AND tenant_id = NEW.tenant_id;  -- Scope to tenant for proper sequencing
  
  NEW.sale_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$function$;

-- Add unique constraint for tenant-scoped receipt numbers to prevent collisions
ALTER TABLE public.payment_receipts 
DROP CONSTRAINT IF EXISTS payment_receipts_tenant_receipt_number_key;

ALTER TABLE public.payment_receipts 
ADD CONSTRAINT payment_receipts_tenant_receipt_number_key UNIQUE (tenant_id, receipt_number);