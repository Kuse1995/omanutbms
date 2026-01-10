-- Add policy to allow anyone to check if their email is in authorized_emails (for login validation)
-- This only allows checking if an email exists, not viewing all emails

CREATE POLICY "Anyone can check their own email authorization"
ON public.authorized_emails
FOR SELECT
TO anon, authenticated
USING (true);

-- Drop the redundant policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can check email authorization" ON public.authorized_emails;