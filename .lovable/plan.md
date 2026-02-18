
# Super Admin Training & Coaching Centre

## What This Builds

A dedicated page inside the Super Admin panel (new tab) that allows Abkanyanta — as the platform operator — to run structured training sessions with any tenant's users. The workflow is:

1. Select a tenant (organisation)
2. Select a user within that tenant
3. Walk through a live feature checklist (tailored to that tenant's enabled modules)
4. Mark items as taught / not yet covered
5. Add trainer notes and improvement observations per feature
6. Save the session and review it later

This replaces informal, ad-hoc training with a trackable, structured coaching record.

---

## Where It Lives

This goes inside the existing `SuperAdminPanel.tsx` as a new "Training" tab alongside Platform, Tenants, Users, Plans, Add-ons, Usage, and Overview.

It is **protected to super admins only** — the same RLS-protected space already used by the other admin tabs.

---

## Feature Checklist Structure

The checklist is dynamically built from the tenant's enabled modules and the full module registry. Each item maps to a real BMS feature:

**Core (always shown):**
- Dashboard overview & KPIs
- Recording sales / transactions
- Quotations (create, convert to invoice)
- Payment receipts
- Basic accounting — cashbook, expenses
- Customer management
- Access control — adding users and roles
- Tenant settings — branding, currency

**Add-on modules (shown only if tenant has them enabled):**
- Inventory management — products, stock, reorder alerts
- Returns & damages
- Shop manager & POS mode
- HR & payroll — employees, attendance, payslips, NAPSA/PAYE/NHIMA
- Agents & distribution
- Advanced accounting — general ledger, trial balance, P&L, balance sheet
- Impact & communities
- Website CMS & blog
- Warehouse & stock transfers
- Multi-branch setup
- Custom orders & production floor (fashion/dodo)
- Job cards (autoshop)

---

## Data Flow & Database

A new table `training_sessions` stores each coaching session:

```text
training_sessions
  id              uuid PK
  trainer_id      uuid (references auth.users, always the super admin)
  tenant_id       uuid
  user_id         uuid (the person being trained)
  session_date    timestamptz
  status          text ('in_progress' | 'completed')
  overall_notes   text
  created_at      timestamptz
  updated_at      timestamptz

training_checklist_items
  id              uuid PK
  session_id      uuid FK → training_sessions
  feature_key     text
  feature_label   text
  status          text ('pending' | 'taught' | 'needs_practice' | 'skipped')
  trainer_notes   text
  improvement_notes text
  created_at      timestamptz
```

RLS: Only super admins can INSERT/UPDATE/SELECT on these tables (checked via `is_super_admin()`).

---

## User Experience

### Step 1 — Select Tenant
A searchable dropdown listing all tenants (name + billing plan badge). Shows current plan and user count.

### Step 2 — Select User
Shows users in that tenant (name, email, role badge). Clicking one starts or resumes a session.

### Step 3 — Training Session View
A three-column layout:
- **Left**: Session info panel (tenant, user, date, session status, overall notes textarea)
- **Centre**: Feature checklist — one card per module group, each feature shows:
  - Feature name + description
  - Status toggle: `Pending → Taught → Needs Practice → Skipped`
  - Expandable notes field for trainer observations
  - Improvement suggestion field
- **Right**: Session history — past sessions for this user with completion summaries

### Checklist Item States (colour coded)
- **Pending** — grey — not yet covered in session
- **Taught** — green check — user demonstrated understanding
- **Needs Practice** — amber warning — covered but user needs more time
- **Skipped** — muted — not applicable or deferred

### Progress Bar
At the top of the checklist: `7 of 12 features taught (58%)` — live as items are updated.

### Session Actions
- **Save & Continue** — saves current state without marking complete
- **Complete Session** — marks session as done, shows summary card
- **Export Summary** — generates a printable/shareable text summary of what was covered and notes

### Past Sessions Panel
Shows session history for the selected user:
- Date, trainer name, status badge, completion %
- Click to re-open a past session (read-only view)

---

## Technical Details

### New Files
1. **`src/components/dashboard/TrainingCoachingCenter.tsx`** — Main container
2. **`src/components/dashboard/TrainingSessionView.tsx`** — The active session checklist
3. **`src/components/dashboard/TrainingSessionHistory.tsx`** — Past sessions for a user

### Modified Files
1. **`src/components/dashboard/SuperAdminPanel.tsx`** — Add "Training" tab
2. **`supabase/migrations/`** — New migration for `training_sessions` + `training_checklist_items` tables with RLS

### Key Logic

The feature checklist is built at session-start time by:
1. Fetching the selected tenant's `business_profile` to know which modules are enabled
2. Loading the module definitions from `modules-config.ts` and `business-type-config.ts`
3. Creating checklist items in the DB for each applicable feature (if not already created for this session)

Notes auto-save on blur (debounced 500ms) so the trainer never loses work.

### Database Migration (summary)
```text
CREATE TABLE training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id uuid NOT NULL,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  session_date timestamptz DEFAULT now(),
  status text DEFAULT 'in_progress',
  overall_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE training_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_label text NOT NULL,
  status text DEFAULT 'pending',
  trainer_notes text,
  improvement_notes text,
  created_at timestamptz DEFAULT now()
);

-- RLS: super admin only
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_training_sessions" ON training_sessions
  USING (is_super_admin());

CREATE POLICY "super_admin_training_items" ON training_checklist_items
  USING (is_super_admin());
```

### No New Routes Needed
Everything lives within the existing `/bms?tab=platform-admin` route, inside the SuperAdminPanel tabs. No new URL routes, no new auth wrappers.
