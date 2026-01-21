-- Create storage bucket for design sketches and generated images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'design-assets',
  'design-assets',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their tenant folder
CREATE POLICY "Users can upload design assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'design-assets'
);

-- Allow public read access to design assets
CREATE POLICY "Public can view design assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'design-assets');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own design assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'design-assets');

-- Add generated_images column to custom_orders for storing AI-generated outfit views
ALTER TABLE public.custom_orders 
ADD COLUMN IF NOT EXISTS generated_images jsonb DEFAULT '[]'::jsonb;