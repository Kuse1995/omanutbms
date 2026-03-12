
-- Trigger to prevent UPDATE/DELETE on sales that have been successfully submitted to ZRA
CREATE OR REPLACE FUNCTION public.prevent_zra_submitted_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_table_name text;
  v_record_id uuid;
  v_invoice_num text;
BEGIN
  v_table_name := TG_TABLE_NAME;
  
  IF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id;
    -- Check by related_id
    IF EXISTS (
      SELECT 1 FROM public.zra_invoice_log
      WHERE related_table = v_table_name
        AND related_id = v_record_id::text
        AND status = 'success'
    ) THEN
      RAISE EXCEPTION 'Cannot modify or delete a record that has been submitted to ZRA. Invoice immutability is enforced.';
    END IF;
    -- Check by invoice_num for sales (receipt_number)
    IF v_table_name = 'sales' AND OLD.receipt_number IS NOT NULL THEN
      IF EXISTS (
        SELECT 1 FROM public.zra_invoice_log
        WHERE invoice_num = OLD.receipt_number
          AND status = 'success'
      ) THEN
        RAISE EXCEPTION 'Cannot modify or delete a sale that has been submitted to ZRA. Invoice immutability is enforced.';
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  -- For UPDATE, check both old record
  v_record_id := OLD.id;
  
  -- Prevent changing invoice/sale numbers on ZRA-submitted records
  IF v_table_name = 'invoices' AND OLD.invoice_number IS DISTINCT FROM NEW.invoice_number THEN
    IF EXISTS (
      SELECT 1 FROM public.zra_invoice_log
      WHERE (related_id = v_record_id::text OR invoice_num = OLD.invoice_number)
        AND status = 'success'
    ) THEN
      RAISE EXCEPTION 'Cannot modify invoice number on a ZRA-submitted invoice. Invoice immutability is enforced.';
    END IF;
  END IF;
  
  IF v_table_name = 'sales' AND OLD.receipt_number IS DISTINCT FROM NEW.receipt_number THEN
    IF EXISTS (
      SELECT 1 FROM public.zra_invoice_log
      WHERE invoice_num = OLD.receipt_number
        AND status = 'success'
    ) THEN
      RAISE EXCEPTION 'Cannot modify receipt number on a ZRA-submitted sale. Invoice immutability is enforced.';
    END IF;
  END IF;
  
  -- Allow other field updates (like status changes, payment updates) 
  -- but prevent deletion entirely for ZRA-submitted records
  RETURN NEW;
END;
$$;

-- Apply trigger to sales table
CREATE TRIGGER trg_prevent_zra_sales_modification
  BEFORE UPDATE OR DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_zra_submitted_modification();

-- Apply trigger to invoices table
CREATE TRIGGER trg_prevent_zra_invoices_modification
  BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_zra_submitted_modification();

-- Add print_count column to track reprints for "COPY" watermark (Item 24)
ALTER TABLE public.payment_receipts ADD COLUMN IF NOT EXISTS print_count integer DEFAULT 0;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS print_count integer DEFAULT 0;
