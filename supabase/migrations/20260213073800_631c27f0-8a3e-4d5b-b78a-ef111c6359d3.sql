
-- 1. payment_receipts.invoice_id: NO ACTION → CASCADE
ALTER TABLE public.payment_receipts
  DROP CONSTRAINT IF EXISTS payment_receipts_invoice_id_fkey,
  ADD CONSTRAINT payment_receipts_invoice_id_fkey
    FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;

-- 2. quotations.converted_to_invoice_id: NO ACTION → SET NULL
ALTER TABLE public.quotations
  DROP CONSTRAINT IF EXISTS quotations_converted_to_invoice_id_fkey,
  ADD CONSTRAINT quotations_converted_to_invoice_id_fkey
    FOREIGN KEY (converted_to_invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- 3. invoices.source_quotation_id: NO ACTION → SET NULL
ALTER TABLE public.invoices
  DROP CONSTRAINT IF EXISTS invoices_source_quotation_id_fkey,
  ADD CONSTRAINT invoices_source_quotation_id_fkey
    FOREIGN KEY (source_quotation_id) REFERENCES public.quotations(id) ON DELETE SET NULL;

-- 4. inventory_adjustments.original_sale_id: NO ACTION → SET NULL
ALTER TABLE public.inventory_adjustments
  DROP CONSTRAINT IF EXISTS inventory_adjustments_original_sale_id_fkey,
  ADD CONSTRAINT inventory_adjustments_original_sale_id_fkey
    FOREIGN KEY (original_sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;

-- 5. custom_orders.original_order_id: NO ACTION → SET NULL
ALTER TABLE public.custom_orders
  DROP CONSTRAINT IF EXISTS custom_orders_original_order_id_fkey,
  ADD CONSTRAINT custom_orders_original_order_id_fkey
    FOREIGN KEY (original_order_id) REFERENCES public.custom_orders(id) ON DELETE SET NULL;

-- 6. custom_orders.assigned_tailor_id: NO ACTION → SET NULL
ALTER TABLE public.custom_orders
  DROP CONSTRAINT IF EXISTS custom_orders_assigned_tailor_id_fkey,
  ADD CONSTRAINT custom_orders_assigned_tailor_id_fkey
    FOREIGN KEY (assigned_tailor_id) REFERENCES public.employees(id) ON DELETE SET NULL;

-- 7. custom_order_adjustments.attended_by: NO ACTION → SET NULL
ALTER TABLE public.custom_order_adjustments
  DROP CONSTRAINT IF EXISTS custom_order_adjustments_attended_by_fkey,
  ADD CONSTRAINT custom_order_adjustments_attended_by_fkey
    FOREIGN KEY (attended_by) REFERENCES public.employees(id) ON DELETE SET NULL;
