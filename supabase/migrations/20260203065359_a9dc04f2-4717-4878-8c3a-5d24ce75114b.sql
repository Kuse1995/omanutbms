-- Add target_user_id for user-specific notifications
ALTER TABLE admin_alerts 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id);

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_admin_alerts_target_user 
ON admin_alerts(target_user_id);

-- Update RLS to filter by target user
DROP POLICY IF EXISTS "Tenant users can view admin_alerts" ON admin_alerts;

CREATE POLICY "Users can view relevant admin_alerts"
  ON admin_alerts FOR SELECT
  USING (
    -- Tenant-wide alerts (no specific target)
    (target_user_id IS NULL AND user_belongs_to_tenant(tenant_id))
    OR
    -- Alerts specifically for this user
    (target_user_id = auth.uid())
  );