-- Add link from employee to their authorized email entry
ALTER TABLE employees 
ADD COLUMN authorized_email_id uuid REFERENCES authorized_emails(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX idx_employees_authorized_email ON employees(authorized_email_id);