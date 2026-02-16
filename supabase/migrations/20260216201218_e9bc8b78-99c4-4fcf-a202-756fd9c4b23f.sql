
-- Fix generate_quotation_number: use regexp_replace, tenant scoping, and manual-set guard
CREATE OR REPLACE FUNCTION public.generate_quotation_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  IF NEW.quotation_number IS NOT NULL AND NEW.quotation_number != '' THEN
    RETURN NEW;
  END IF;

  year_prefix := 'Q' || to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      regexp_replace(
        regexp_replace(quotation_number, '^Q\d{4}-', ''),
        '[^0-9].*$', ''
      ) AS integer
    )
  ), 0) + 1
  INTO next_number
  FROM public.quotations
  WHERE quotation_number LIKE year_prefix || '-%'
    AND tenant_id = NEW.tenant_id;
  
  NEW.quotation_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$function$;

-- Fix generate_invoice_number: same pattern, preventative fix
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  IF NEW.invoice_number IS NOT NULL AND NEW.invoice_number != '' THEN
    RETURN NEW;
  END IF;

  year_prefix := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      regexp_replace(
        regexp_replace(invoice_number, '^\d{4}-', ''),
        '[^0-9].*$', ''
      ) AS integer
    )
  ), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE invoice_number LIKE year_prefix || '-%'
    AND tenant_id = NEW.tenant_id;
  
  NEW.invoice_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$function$;
