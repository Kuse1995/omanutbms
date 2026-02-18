
-- Create training_sessions table
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  session_date timestamptz DEFAULT now(),
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  overall_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create training_checklist_items table
CREATE TABLE IF NOT EXISTS public.training_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_label text NOT NULL,
  module_group text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'taught', 'needs_practice', 'skipped')),
  trainer_notes text,
  improvement_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies: super admin only for all operations
CREATE POLICY "super_admin_training_sessions_select"
  ON public.training_sessions FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin_training_sessions_insert"
  ON public.training_sessions FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_training_sessions_update"
  ON public.training_sessions FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "super_admin_training_sessions_delete"
  ON public.training_sessions FOR DELETE
  USING (public.is_super_admin());

CREATE POLICY "super_admin_training_items_select"
  ON public.training_checklist_items FOR SELECT
  USING (public.is_super_admin());

CREATE POLICY "super_admin_training_items_insert"
  ON public.training_checklist_items FOR INSERT
  WITH CHECK (public.is_super_admin());

CREATE POLICY "super_admin_training_items_update"
  ON public.training_checklist_items FOR UPDATE
  USING (public.is_super_admin());

CREATE POLICY "super_admin_training_items_delete"
  ON public.training_checklist_items FOR DELETE
  USING (public.is_super_admin());

-- Updated_at trigger for training_sessions
CREATE OR REPLACE FUNCTION public.update_training_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER training_sessions_updated_at
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_training_session_updated_at();

CREATE TRIGGER training_checklist_items_updated_at
  BEFORE UPDATE ON public.training_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_training_session_updated_at();
