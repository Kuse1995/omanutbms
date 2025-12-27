-- Add initial admin user email
INSERT INTO public.authorized_emails (email, default_role, notes)
VALUES ('abkanyanta@gmail.com', 'admin', 'Initial system administrator')
ON CONFLICT (email) DO UPDATE SET default_role = 'admin', notes = 'Initial system administrator';