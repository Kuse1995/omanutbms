-- Update existing records from 'distributor' to 'distribution' for consistency
UPDATE public.business_profiles 
SET business_type = 'distribution' 
WHERE business_type = 'distributor';

-- Drop the existing constraint
ALTER TABLE public.business_profiles 
DROP CONSTRAINT IF EXISTS business_profiles_business_type_check;

-- Add new constraint with all 10 business types from the Zambian market configuration
ALTER TABLE public.business_profiles 
ADD CONSTRAINT business_profiles_business_type_check 
CHECK (business_type IS NULL OR business_type = ANY (ARRAY[
  'distribution'::text, 
  'retail'::text, 
  'school'::text, 
  'ngo'::text, 
  'services'::text, 
  'agriculture'::text, 
  'hospitality'::text, 
  'salon'::text, 
  'healthcare'::text, 
  'autoshop'::text
]));