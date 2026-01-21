-- Add stock column to product_variants for per-variant stock tracking
ALTER TABLE public.product_variants 
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- Update existing variants with a default stock value
UPDATE product_variants SET stock = 10 WHERE stock IS NULL;