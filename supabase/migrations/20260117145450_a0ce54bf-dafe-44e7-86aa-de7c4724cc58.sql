-- Add 'hybrid' to the business_profiles_business_type_check constraint
ALTER TABLE public.business_profiles
DROP CONSTRAINT IF EXISTS business_profiles_business_type_check;

ALTER TABLE public.business_profiles
ADD CONSTRAINT business_profiles_business_type_check
CHECK (
  business_type IS NULL OR business_type = ANY (ARRAY[
    'distribution', 'retail', 'school', 'ngo', 'services', 
    'agriculture', 'hospitality', 'salon', 'healthcare', 
    'autoshop', 'hybrid'
  ])
);

-- Add hybrid-friendly categories to inventory constraint
ALTER TABLE public.inventory
DROP CONSTRAINT IF EXISTS inventory_category_check;

ALTER TABLE public.inventory
ADD CONSTRAINT inventory_category_check
CHECK (
  category IS NULL OR category = ANY (ARRAY[
    'primary', 'secondary', 'bulk', 'premium', 'wholesale',
    'electronics', 'clothing', 'food', 'household', 'health', 'other',
    'tuition', 'supplies', 'activity', 'uniform',
    'relief', 'medical', 'education', 'infrastructure', 'emergency',
    'consultation', 'project', 'retainer', 'training', 'support', 'package',
    'crops', 'livestock', 'seeds', 'fertilizer', 'equipment',
    'food_beverage', 'accommodation', 'events', 'spa',
    'hair', 'nails', 'skincare', 'makeup', 'massage',
    'consultation_fee', 'treatment', 'medication', 'procedure', 'test',
    'repair', 'parts', 'maintenance_service', 'diagnostics', 'accessories',
    'products', 'services', 'packages', 'bundles'
  ])
);