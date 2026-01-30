-- Add risk adjustment columns to invoices table for credit sales
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS risk_adjustment_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS risk_adjustment_notes text;

COMMENT ON COLUMN invoices.risk_adjustment_amount IS 'Internal markup for credit risk - included in total_amount but not itemized on customer documents';