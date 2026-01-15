-- Add unique constraint on receipt_number to prevent duplicates
-- This fixes the race condition where multiple concurrent sales could generate the same receipt number

ALTER TABLE payment_receipts 
ADD CONSTRAINT unique_receipt_number UNIQUE (receipt_number);

-- Add index for better query performance on receipt_number lookups
CREATE INDEX IF NOT EXISTS idx_payment_receipts_receipt_number 
ON payment_receipts(receipt_number);

-- Add index on created_at for better performance when ordering by creation time
CREATE INDEX IF NOT EXISTS idx_payment_receipts_created_at 
ON payment_receipts(created_at DESC);
