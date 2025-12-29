-- Fix logo upload RLS policies for tenant-based uploads
-- Current policy requires folder = auth.uid(), but code uses tenant_id

-- Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;

-- Create new policies that allow tenant admins to upload to tenant folders
CREATE POLICY "Tenant admins can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
  AND is_tenant_admin((storage.foldername(name))[1]::uuid)
);

CREATE POLICY "Tenant admins can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' 
  AND is_tenant_admin((storage.foldername(name))[1]::uuid)
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND is_tenant_admin((storage.foldername(name))[1]::uuid)
);

-- Keep public read access for avatars
CREATE POLICY "Public can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');