-- Create a public storage bucket for WhatsApp documents (receipts, invoices, quotations)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-documents',
  'whatsapp-documents',
  true,
  5242880, -- 5MB limit
  ARRAY['application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Allow service role to upload documents (edge functions use service role)
CREATE POLICY "Service role can upload whatsapp documents"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'whatsapp-documents');

-- Allow public read access to documents via URL
CREATE POLICY "Public can read whatsapp documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'whatsapp-documents');

-- Allow service role to delete old documents (cleanup)
CREATE POLICY "Service role can delete whatsapp documents"
ON storage.objects FOR DELETE
TO service_role
USING (bucket_id = 'whatsapp-documents');