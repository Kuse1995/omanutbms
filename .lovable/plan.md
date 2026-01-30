
# Unified Employee & Access Control System

## Overview

This plan introduces a unified approach to managing employee identity, BMS account access, and WhatsApp integration from a single location. Instead of managing three separate systems, administrators will be able to configure all access options when creating or editing an employee.

---

## Current Architecture

```text
┌──────────────────┐     ┌─────────────────────┐     ┌────────────────────────┐
│    employees     │     │  authorized_emails   │     │ whatsapp_user_mappings │
├──────────────────┤     ├─────────────────────┤     ├────────────────────────┤
│ id               │     │ id                  │     │ id                     │
│ full_name        │     │ email               │     │ whatsapp_number        │
│ email            │     │ default_role        │     │ user_id (optional)     │
│ phone            │     │ branch_id           │     │ employee_id (optional) │
│ user_id ─────────┼─────│ tenant_id           │     │ role                   │
│ branch_id        │     └─────────────────────┘     │ is_employee_self_svc   │
│ tenant_id        │                                  └────────────────────────┘
└──────────────────┘                                  
         ▲                                                      │
         └──────────────────────────────────────────────────────┘
                    (employee_id FK already exists)
```

**Current Problem**: These three tables are managed in separate locations:
- Employees: HR → Staff panel
- BMS Access: Settings → Authorized Users
- WhatsApp Access: Settings → WhatsApp

---

## Solution: Unified Access Control in Employee Modal

### Part 1: Enhanced Employee Modal

Add a new "Access & Integration" section to the EmployeeModal with two collapsible panels:

**1. BMS Account Access**
- Toggle: "Grant BMS Login Access"
- When enabled, shows:
  - Email field (required, pre-filled from employee email)
  - Role selector (same roles as AuthorizedEmailsManager)
  - Branch assignment (if multi-branch enabled)
- On save: Creates/updates entry in `authorized_emails` table

**2. WhatsApp Access**
- Toggle: "Enable WhatsApp Access"
- When enabled, shows:
  - WhatsApp number field (pre-filled from employee phone if +260 format)
  - Role selector (determines WhatsApp permissions)
  - Self-service checkbox (if no BMS account, limits to clock_in, my_pay, my_tasks)
- On save: Creates/updates entry in `whatsapp_user_mappings` table

### Part 2: Database Relationship Updates

Add an `authorized_email_id` column to the `employees` table to formally link the BMS access record:

```sql
ALTER TABLE employees 
ADD COLUMN authorized_email_id uuid REFERENCES authorized_emails(id) ON DELETE SET NULL;
```

This creates a bidirectional link:
- Employee → Authorized Email (for BMS access tracking)
- Employee → WhatsApp Mapping (already exists via employee_id FK)

### Part 3: Visual Status Indicators

Update the EmployeeManager list view to show access status badges:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 👤 John Mwamba           Office Staff    Active                 │
│    📧 john@company.com   📱 +260977123456                       │
│    ┌──────────┐ ┌───────────────┐ ┌──────────────────┐          │
│    │ 🔐 Admin │ │ 💬 Sales Rep  │ │ 📍 Headquarters  │          │
│    └──────────┘ └───────────────┘ └──────────────────┘          │
│         ↑               ↑                   ↑                   │
│    BMS Access     WhatsApp Role       Branch                    │
└─────────────────────────────────────────────────────────────────┘
```

Badges:
- 🔐 BMS Role badge (Admin, Manager, etc.) - shows if authorized_email exists
- 💬 WhatsApp badge - shows if whatsapp_mapping exists
- 📍 Branch badge (already exists)

### Part 4: Sync Logic

When employee data changes, the system keeps access records aligned:

```text
Employee email changes → Update authorized_emails.email
Employee phone changes → Prompt to update whatsapp_number
Employee deleted → Cascade delete access records (with confirmation)
Employee branch changes → Update authorized_emails.branch_id and whatsapp_mappings.branch_id
```

---

## UI Flow

### Creating a New Employee with Full Access

1. Admin opens "Add New Employee" modal
2. Fills in personal info (name, email, phone, etc.)
3. Expands "BMS Account Access" section
   - Toggles "Grant BMS Login"
   - Selects role: "Sales Rep"
   - Selects branch: "Main Store"
4. Expands "WhatsApp Access" section
   - Toggles "Enable WhatsApp"
   - WhatsApp number pre-filled from phone
   - Role auto-matched to BMS role
5. Clicks "Add Employee"
6. System creates:
   - Employee record
   - Authorized email entry
   - WhatsApp mapping entry

### Editing Existing Employee Access

1. Admin clicks "Edit" on employee card
2. Opens modal with access sections showing current state
3. Can toggle access on/off, change roles
4. Save updates all three tables atomically

---

## Technical Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/EmployeeModal.tsx` | Add Access & Integration section with BMS and WhatsApp panels |
| `src/components/dashboard/EmployeeManager.tsx` | Add access status badges, fetch related access data |
| Database migration | Add `authorized_email_id` column to employees table |

### New Database Column

```sql
-- Add link from employee to their authorized email entry
ALTER TABLE employees 
ADD COLUMN authorized_email_id uuid REFERENCES authorized_emails(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX idx_employees_authorized_email ON employees(authorized_email_id);
```

### Form State Structure

```typescript
interface EmployeeAccessState {
  // BMS Access
  bmsAccessEnabled: boolean;
  bmsEmail: string;
  bmsRole: AppRole;
  bmsBranchId: string | null;
  
  // WhatsApp Access  
  whatsappEnabled: boolean;
  whatsappNumber: string;
  whatsappRole: WhatsAppRole;
  whatsappSelfService: boolean;
}
```

### Save Logic (Pseudo-code)

```typescript
async function saveEmployeeWithAccess(employeeData, accessState) {
  // 1. Save employee record
  const employee = await saveEmployee(employeeData);
  
  // 2. Handle BMS Access
  if (accessState.bmsAccessEnabled) {
    const authEmail = await upsertAuthorizedEmail({
      email: accessState.bmsEmail,
      default_role: accessState.bmsRole,
      branch_id: accessState.bmsBranchId,
      tenant_id
    });
    // Link to employee
    await updateEmployee(employee.id, { authorized_email_id: authEmail.id });
  } else {
    // Remove access if disabled
    await deleteAuthorizedEmailForEmployee(employee.id);
  }
  
  // 3. Handle WhatsApp Access
  if (accessState.whatsappEnabled) {
    await upsertWhatsAppMapping({
      employee_id: employee.id,
      user_id: accessState.bmsAccessEnabled ? authUser?.id : null,
      whatsapp_number: accessState.whatsappNumber,
      role: accessState.whatsappRole,
      is_employee_self_service: !accessState.bmsAccessEnabled
    });
  } else {
    await deleteWhatsAppMappingForEmployee(employee.id);
  }
}
```

---

## Access Control Matrix

| Scenario | BMS Login | WhatsApp | Capabilities |
|----------|-----------|----------|--------------|
| Office Manager | ✅ Admin | ✅ Admin | Full BMS + WhatsApp access |
| Sales Staff | ✅ Sales Rep | ✅ Sales Rep | Sales recording, stock checks |
| Warehouse Worker | ❌ None | ✅ Staff | Clock in/out, view tasks only |
| Cleaner | ❌ None | ✅ Self-Service | Clock in/out, view payslip |

---

## Benefits

1. **Single Source of Truth**: Employee record is the anchor for all access
2. **Reduced Admin Overhead**: One form instead of three separate management panels
3. **Consistent Permissions**: Role/branch automatically aligned across systems
4. **Audit Trail**: Easy to see who has what access from employee list
5. **Onboarding Efficiency**: New staff get all access configured at once
