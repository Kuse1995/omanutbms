
# Transform School Business Type into a Student Management System

## Overview

Currently, the "School" business type is just a terminology overlay on the retail engine. This plan transforms it into a purpose-built **Student Information & Fee Management System** with dedicated modules for student profiles, fee tracking, balance management, and academic records.

---

## What Changes

### 1. Student Profiles (Replace Measurements with Academic Info)

When `businessType === 'school'`, the `CustomerModal` will replace the "Measurements" tab with an **"Academic & Guardian"** tab containing:

| Field | Storage | Description |
|-------|---------|-------------|
| Grade / Level | `measurements.grade` | e.g., Grade 1-12 |
| Class / Section | `measurements.section` | e.g., 1A, 2B |
| Student ID Number | `measurements.student_id` | School-issued ID |
| Guardian Name | `measurements.guardian_name` | Parent/guardian |
| Guardian Phone | `measurements.guardian_phone` | Contact number |
| Guardian Relationship | `measurements.guardian_relationship` | Father, Mother, etc. |
| Enrollment Status | `measurements.enrollment_status` | Enrolled, Suspended, Graduated |
| Enrollment Date | `measurements.enrollment_date` | When student joined |

All stored in the existing `measurements` JSONB column -- no database migration needed.

### 2. Student List View (Replace Measurements Column)

The `CustomersManager` table columns will change for schools:

| Current (All Types) | School Version |
|---------------------|----------------|
| Name | Student Name |
| Contact | Guardian Contact |
| Measurements (X recorded) | Grade / Class |
| Actions | Actions |

The subtitle will change from "Manage customer profiles and body measurements" to "Manage student enrollment and academic records."

### 3. Fee Management Tab (New Component)

Create a dedicated **Student Fees Manager** (`StudentFeesManager.tsx`) that replaces the generic inventory tab for schools. This provides:

- **Fee Structure Setup**: Define fee types (Tuition, Exam, Uniform, Transport, Boarding) with amounts per term/grade
- **Fee Allocation**: Assign fees to individual students or bulk-assign by grade
- **Balance Tracking**: Real-time view of each student's total fees, payments made, and outstanding balance
- **Payment Recording**: Quick fee collection linked to the student
- **Fee Statements**: Generate per-student statements showing all charges and payments

Data model uses existing tables:
- `inventory` table stores fee types (Tuition K5,000, Exam Fee K200, etc.) with `hideStock: true`
- `invoices` table tracks fee statements per student (linked via `client_name`)
- `payment_receipts` tracks payments against fee statements

### 4. Student Dashboard Tab (New Component)

Create `StudentDashboard.tsx` to replace the `communities` tab for schools, providing:

- **Enrollment Summary**: Total students by grade, new enrollments this term
- **Fee Collection Overview**: Total expected vs. collected, collection rate percentage
- **Outstanding Balances**: Top students with highest balances, overdue fees
- **Quick Actions**: Collect Fee, Generate Statements, View Debtors List

### 5. Navigation & Config Updates

Update `business-type-config.ts` for schools:

| Setting | Current | New |
|---------|---------|-----|
| `tabOrder` | `[..., 'communities', ...]` | `[..., 'customers', ...]` (Students tab) |
| Quick Action "Student Records" | targets `communities` | targets `customers` |
| `inventory.enabled` | `false` | `true` (for fee type setup) |
| New quick action | -- | "View Balances" targeting accounts |
| `hiddenTabs` | `['inventory', 'shop', 'agents', 'messages']` | `['shop', 'agents', 'messages']` (show inventory as "Fee Structure") |

### 6. Fee Categories Update

Expand the school fee categories in `formFields.categories`:

```text
Current: Tuition, Supplies, Activity Fee, Uniform, Other
New:     Tuition, Exam Fee, Boarding, Transport, Uniform, Lab Fee, Library, Activity Fee, PTA Levy, Other
```

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/StudentFeesManager.tsx` | Fee structure, allocation, and balance tracking |
| `src/components/dashboard/StudentDashboard.tsx` | School-specific dashboard with enrollment and fee KPIs |
| `src/components/dashboard/StudentAcademicForm.tsx` | Academic info form (replaces MeasurementsForm for schools) |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/CustomerModal.tsx` | Conditionally show Academic tab instead of Measurements for schools |
| `src/components/dashboard/CustomersManager.tsx` | Show Grade/Class columns instead of Measurements for schools |
| `src/lib/business-type-config.ts` | Fix tab order, enable inventory, update categories, fix quick actions |
| `src/pages/Dashboard.tsx` | Route `communities` tab to `StudentDashboard` when school type |
| `src/components/dashboard/DashboardSidebar.tsx` | Show "Fee Structure" label for inventory tab when school type |

### No Database Migration Needed

- Student academic data stored in `measurements` JSONB on `customers` table
- Fee types use the existing `inventory` table (with `hideStock: true`)
- Fee statements use the existing `invoices` table
- Payments use the existing `payment_receipts` table

---

## User Experience After Changes

### School Admin Dashboard
1. **Dashboard** -- Fee collection KPIs, enrollment stats, outstanding balances
2. **Fees** (Sales tab) -- Record fee payments from students
3. **Receipts** -- View/print payment receipts
4. **Fee Statements** (Accounts tab) -- Generate and manage per-student fee statements
5. **Students** (Customers tab) -- Manage student profiles with grade, class, guardian info
6. **Fee Structure** (Inventory tab) -- Define fee types and amounts
7. **HR** -- Staff management and payroll

### Student Profile View
- Personal details (name, student ID, address)
- Guardian information (name, phone, relationship)
- Academic info (grade, class, enrollment status, enrollment date)
- Fee balance summary (total owed, total paid, outstanding)

### Fee Balance Tracking Flow
1. Admin sets up fee types in "Fee Structure" (e.g., Tuition K5,000/term)
2. Admin creates fee statements for students (individually or bulk by grade)
3. When student pays, admin records payment in "Fees" tab
4. Balance automatically updates across all views
5. Admin can generate a statement showing all charges and payments for any student
