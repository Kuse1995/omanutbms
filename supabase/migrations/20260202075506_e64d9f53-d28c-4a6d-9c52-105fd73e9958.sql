-- Drop the existing category check constraint
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_category_check;

-- Add updated constraint with all autoshop categories included
ALTER TABLE public.inventory ADD CONSTRAINT inventory_category_check CHECK (
  category IS NULL OR category = ANY (ARRAY[
    -- Distribution
    'primary', 'secondary', 'bulk', 'premium', 'wholesale',
    -- Retail
    'electronics', 'clothing', 'food', 'household', 'health', 'other',
    -- School
    'tuition', 'supplies', 'activity', 'uniform',
    -- NGO
    'relief', 'medical', 'education', 'infrastructure', 'emergency',
    -- Services
    'consultation', 'project', 'retainer', 'training', 'support', 'package',
    -- Agriculture
    'crops', 'livestock', 'seeds', 'fertilizer', 'equipment',
    -- Hospitality
    'food_beverage', 'accommodation', 'events', 'catering', 'bar',
    -- Salon
    'hair', 'nails', 'skincare', 'makeup', 'massage', 'bridal', 'barbering', 'spa',
    -- Healthcare
    'consultation_fee', 'treatment', 'medication', 'procedure', 'test',
    -- Autoshop (NEW - matching business-type-config.ts)
    'engine_parts', 'filters', 'brakes', 'electrical', 'tyres', 'body_parts', 
    'lighting', 'accessories', 'lubricants', 'cooling', 'transmission', 'service_labor',
    -- Legacy autoshop values (keep for backward compatibility)
    'repair', 'parts', 'maintenance_service', 'diagnostics',
    -- Hybrid
    'products', 'services', 'packages', 'bundles'
  ])
);