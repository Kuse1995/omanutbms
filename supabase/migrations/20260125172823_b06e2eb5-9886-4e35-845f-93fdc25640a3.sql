-- Add audit trail and approval workflow columns to employee_attendance
ALTER TABLE employee_attendance
ADD COLUMN IF NOT EXISTS change_log JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS edit_status TEXT DEFAULT 'approved' CHECK (edit_status IN ('approved', 'pending')),
ADD COLUMN IF NOT EXISTS requested_times JSONB,
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ;

-- Create index for pending approvals lookup
CREATE INDEX IF NOT EXISTS idx_attendance_pending_approvals 
ON employee_attendance(tenant_id, edit_status) 
WHERE edit_status = 'pending';

-- Add comment for documentation
COMMENT ON COLUMN employee_attendance.change_log IS 'Array of {old_value, new_value, changed_by, timestamp, field_name} objects for audit trail';
COMMENT ON COLUMN employee_attendance.edit_status IS 'Status of edit request: approved (default) or pending manager approval';
COMMENT ON COLUMN employee_attendance.requested_times IS 'Pending time changes: {clock_in?: string, clock_out?: string}';
COMMENT ON COLUMN employee_attendance.requested_by IS 'User ID who requested the time change';
COMMENT ON COLUMN employee_attendance.requested_at IS 'Timestamp when the change was requested';