-- Drop the existing category check constraint
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_category_check;

-- Add the updated category check constraint with new business-type categories
ALTER TABLE public.inventory ADD CONSTRAINT inventory_category_check CHECK (
  category IS NULL OR category IN (
    -- Distribution/Retail categories
    'primary', 'secondary', 'bulk', 'premium', 'wholesale',
    'electronics', 'clothing', 'food', 'household', 'health', 'other',
    -- School categories
    'tuition', 'supplies', 'activity', 'uniform',
    -- NGO categories
    'relief', 'medical', 'education', 'infrastructure', 'emergency',
    -- Services categories
    'consultation', 'project', 'retainer', 'training', 'support', 'package',
    -- Agriculture categories
    'crops', 'livestock', 'poultry', 'dairy', 'seeds', 'feed', 'fertilizer',
    -- Hospitality categories
    'food_beverage', 'accommodation', 'events', 'catering', 'bar',
    -- Salon categories
    'hair', 'nails', 'skincare', 'makeup', 'massage', 'bridal', 'barbering',
    -- Healthcare categories
    'consultation_fee', 'medication', 'lab_test', 'procedure', 'vaccination',
    -- Auto Shop categories
    'repair', 'service_auto', 'parts', 'tyres', 'accessories', 'bodywork'
  )
);