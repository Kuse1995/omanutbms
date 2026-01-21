-- Create collections table for seasonal drops (tenant-scoped)
CREATE TABLE public.collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collections for their tenant"
ON public.collections FOR SELECT
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Admins and managers can manage collections"
ON public.collections FOR ALL
USING (public.is_tenant_admin_or_manager(tenant_id));

CREATE POLICY "Super admins can view all collections"
ON public.collections FOR SELECT
USING (public.is_super_admin());

-- Add fashion-specific columns to inventory table
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add check constraint for gender
ALTER TABLE public.inventory
ADD CONSTRAINT inventory_gender_check
CHECK (gender IS NULL OR gender = ANY (ARRAY['Men', 'Women', 'Unisex', 'Kids']));

-- Add trigger for updated_at on collections
CREATE TRIGGER update_collections_updated_at
    BEFORE UPDATE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Update business_profiles constraint to include 'fashion' type
ALTER TABLE public.business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_business_type_check;

ALTER TABLE public.business_profiles
ADD CONSTRAINT business_profiles_business_type_check
CHECK (
  business_type IS NULL OR business_type = ANY (ARRAY[
    'distribution', 'retail', 'school', 'ngo', 'services', 
    'agriculture', 'hospitality', 'salon', 'healthcare', 
    'autoshop', 'hybrid', 'fashion'
  ])
);