-- Part 3: Add phone column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone text;

-- Part 4: Create helper function for branch-restricted inventory editing
CREATE OR REPLACE FUNCTION public.can_edit_branch_inventory(_tenant_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = auth.uid() 
      AND tenant_id = _tenant_id 
      AND (
        can_access_all_branches = true 
        OR branch_id = _branch_id 
        OR _branch_id IS NULL
        OR role IN ('admin', 'manager')
      )
  )
$$;

-- Drop existing inventory update/delete policies if they exist
DROP POLICY IF EXISTS "Users can update inventory" ON public.inventory;
DROP POLICY IF EXISTS "Users can delete inventory" ON public.inventory;
DROP POLICY IF EXISTS "Branch users can only edit own branch inventory" ON public.inventory;
DROP POLICY IF EXISTS "Branch users can only delete own branch inventory" ON public.inventory;

-- Create new branch-restricted UPDATE policy
CREATE POLICY "Branch users can only edit own branch inventory"
  ON public.inventory 
  FOR UPDATE
  USING (user_belongs_to_tenant(tenant_id))
  WITH CHECK (can_edit_branch_inventory(tenant_id, default_location_id));

-- Create new branch-restricted DELETE policy  
CREATE POLICY "Branch users can only delete own branch inventory"
  ON public.inventory 
  FOR DELETE
  USING (user_belongs_to_tenant(tenant_id) AND can_edit_branch_inventory(tenant_id, default_location_id));

-- Also apply to branch_inventory table
DROP POLICY IF EXISTS "Users can update branch_inventory" ON public.branch_inventory;
DROP POLICY IF EXISTS "Users can delete branch_inventory" ON public.branch_inventory;
DROP POLICY IF EXISTS "Branch users can only edit own branch_inventory" ON public.branch_inventory;
DROP POLICY IF EXISTS "Branch users can only delete own branch_inventory" ON public.branch_inventory;

CREATE POLICY "Branch users can only edit own branch_inventory"
  ON public.branch_inventory 
  FOR UPDATE
  USING (user_belongs_to_tenant(tenant_id))
  WITH CHECK (can_edit_branch_inventory(tenant_id, branch_id));

CREATE POLICY "Branch users can only delete own branch_inventory"
  ON public.branch_inventory 
  FOR DELETE
  USING (user_belongs_to_tenant(tenant_id) AND can_edit_branch_inventory(tenant_id, branch_id));