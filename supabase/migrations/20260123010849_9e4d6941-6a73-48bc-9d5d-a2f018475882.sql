-- Add GPS coordinates and geofencing to branches
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER DEFAULT 100;

-- Add location tracking to employee attendance
ALTER TABLE employee_attendance
ADD COLUMN IF NOT EXISTS clock_in_latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS clock_in_longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS clock_in_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS clock_in_distance_meters INTEGER,
ADD COLUMN IF NOT EXISTS clock_out_latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS clock_out_longitude NUMERIC(10, 7);

-- Add tenant setting for location requirement
ALTER TABLE business_profiles
ADD COLUMN IF NOT EXISTS attendance_location_required BOOLEAN DEFAULT true;

-- Add index for location queries
CREATE INDEX IF NOT EXISTS idx_employee_attendance_verified ON employee_attendance(clock_in_verified);

-- Add comments for documentation
COMMENT ON COLUMN branches.latitude IS 'GPS latitude for geofencing clock-in verification';
COMMENT ON COLUMN branches.longitude IS 'GPS longitude for geofencing clock-in verification';
COMMENT ON COLUMN branches.geofence_radius_meters IS 'Maximum distance in meters for valid clock-in';
COMMENT ON COLUMN employee_attendance.clock_in_verified IS 'Whether location was verified within geofence';
COMMENT ON COLUMN employee_attendance.clock_in_distance_meters IS 'Distance from office at clock-in time';