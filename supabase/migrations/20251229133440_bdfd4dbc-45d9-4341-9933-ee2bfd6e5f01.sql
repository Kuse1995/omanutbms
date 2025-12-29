-- Remove the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can check email authorization" ON public.authorized_emails;

-- Create a new policy that only allows authenticated users to check email authorization
-- This is needed for the login flow to verify if an email is authorized
CREATE POLICY "Authenticated users can check email authorization" 
ON public.authorized_emails 
FOR SELECT 
USING (auth.uid() IS NOT NULL);