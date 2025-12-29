-- Remove old restrictive constraint on inventory category
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_category_check;

-- Add new flexible constraint that supports all business types
ALTER TABLE public.inventory ADD CONSTRAINT inventory_category_check 
CHECK (category = ANY (ARRAY[
  -- Distribution/Retail
  'personal', 'community', 'primary', 'secondary', 'bulk', 'premium', 'wholesale',
  -- School
  'curriculum', 'uniform', 'supplies', 'equipment', 'extra',
  -- NGO
  'relief', 'medical', 'education', 'infrastructure', 'emergency',
  -- Services
  'consultation', 'project', 'retainer', 'training', 'support', 'package',
  -- Fallback
  'other'
]));

-- Fix storage policies for product-documents bucket to use tenant_users instead of user_roles

-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Admins and managers can upload product documents" ON storage.objects;

-- Create new INSERT policy using tenant_users
CREATE POLICY "Admins and managers can upload product documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-documents' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_users.user_id = auth.uid() 
    AND tenant_users.role IN ('admin', 'manager')
  )
);

-- Drop the old DELETE policy
DROP POLICY IF EXISTS "Admins and managers can delete product documents" ON storage.objects;

-- Create new DELETE policy using tenant_users
CREATE POLICY "Admins and managers can delete product documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-documents' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_users.user_id = auth.uid() 
    AND tenant_users.role IN ('admin', 'manager')
  )
);

-- Add UPDATE policy for product documents (was missing)
DROP POLICY IF EXISTS "Admins and managers can update product documents" ON storage.objects;

CREATE POLICY "Admins and managers can update product documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-documents' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE tenant_users.user_id = auth.uid() 
    AND tenant_users.role IN ('admin', 'manager')
  )
);