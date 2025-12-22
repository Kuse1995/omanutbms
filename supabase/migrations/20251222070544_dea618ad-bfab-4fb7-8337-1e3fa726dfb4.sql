
-- =====================================================
-- OMANUT BMS - NEW TABLES ONLY
-- =====================================================

-- 1. COMPANY SETTINGS (Single Row Enforcement)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Omanut BMS',
  currency_symbol text NOT NULL DEFAULT 'ZMW',
  primary_color text DEFAULT '#3B82F6',
  logo_url text,
  tax_rate numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Trigger to enforce single row
CREATE OR REPLACE FUNCTION public.enforce_single_company_settings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM public.company_settings) >= 1 THEN
    RAISE EXCEPTION 'Only one company settings row is allowed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_single_row ON public.company_settings;
CREATE TRIGGER enforce_single_row
  BEFORE INSERT ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_company_settings();

-- Insert default company settings (only if empty)
INSERT INTO public.company_settings (company_name, currency_symbol, primary_color, tax_rate)
SELECT 'Omanut BMS', 'ZMW', '#3B82F6', 0
WHERE NOT EXISTS (SELECT 1 FROM public.company_settings);

-- Company settings RLS
DROP POLICY IF EXISTS "Anyone can view company settings" ON public.company_settings;
CREATE POLICY "Anyone can view company settings"
  ON public.company_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can update company settings" ON public.company_settings;
CREATE POLICY "Admins can update company settings"
  ON public.company_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. SALES TABLE (new, separate from existing sales_transactions)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_number text NOT NULL UNIQUE,
  customer_name text,
  customer_phone text,
  customer_email text,
  payment_method text NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'Mobile Money', 'Card')),
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  recorded_by uuid REFERENCES auth.users(id),
  sale_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Auto-generate sale number
CREATE OR REPLACE FUNCTION public.generate_sale_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  year_prefix text;
  next_number integer;
BEGIN
  year_prefix := 'S' || to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM 6) AS integer)), 0) + 1
  INTO next_number
  FROM public.sales
  WHERE sale_number LIKE year_prefix || '-%';
  
  NEW.sale_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS generate_sale_number_trigger ON public.sales;
CREATE TRIGGER generate_sale_number_trigger
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  WHEN (NEW.sale_number IS NULL)
  EXECUTE FUNCTION public.generate_sale_number();

-- Sales RLS
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
CREATE POLICY "Authenticated users can view sales"
  ON public.sales FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Managers and admins can insert sales" ON public.sales;
CREATE POLICY "Managers and admins can insert sales"
  ON public.sales FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can update sales" ON public.sales;
CREATE POLICY "Admins can update sales"
  ON public.sales FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete sales" ON public.sales;
CREATE POLICY "Admins can delete sales"
  ON public.sales FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. SALE ITEMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  inventory_id uuid REFERENCES public.inventory(id),
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view sale items" ON public.sale_items;
CREATE POLICY "Authenticated users can view sale items"
  ON public.sale_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Managers and admins can insert sale items" ON public.sale_items;
CREATE POLICY "Managers and admins can insert sale items"
  ON public.sale_items FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager'));

DROP POLICY IF EXISTS "Admins can update sale items" ON public.sale_items;
CREATE POLICY "Admins can update sale items"
  ON public.sale_items FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete sale items" ON public.sale_items;
CREATE POLICY "Admins can delete sale items"
  ON public.sale_items FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Updated_at triggers for new tables
-- =====================================================

DROP TRIGGER IF EXISTS update_company_settings_updated_at ON public.company_settings;
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_sales_updated_at ON public.sales;
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
