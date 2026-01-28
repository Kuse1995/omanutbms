

# Collaborative Custom Order Workflow
## Admin & Operations Officer Handoff System

---

## Overview

This feature enables **role-based collaboration** on the 7-step Custom Order wizard. An **Admin** can start an order and specify at which step an **Operations Officer** should take over, creating a clear division of labor:

- **Admin**: Handles client intake, pricing, and sign-off (business-facing steps)
- **Operations Officer**: Handles technical work (measurements, production, QC)

---

## How It Works

```text
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOM ORDER WORKFLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Client Info      → Admin fills client details          │
│  Step 2: Work Details     → Admin sets dates & scheduling       │
│  Step 3: Design Details   → Admin captures design requirements  │
│                           ▼                                      │
│              ┌────────────────────────┐                         │
│              │   HANDOFF POINT        │  ← Admin chooses here   │
│              │   (after step 3)       │                         │
│              └────────────────────────┘                         │
│                           ▼                                      │
│  Step 4: Measurements     → Operations Officer takes over       │
│  Step 5: Sketches & Refs  → Operations Officer continues        │
│  Step 6: Smart Pricing    → Could go back to Admin              │
│  Step 7: Review & Sign    → Admin signs off                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

Add new columns to `custom_orders` table:

| Column | Type | Description |
|--------|------|-------------|
| `handoff_step` | INTEGER | Step number (0-6) where Operations takes over |
| `handoff_status` | TEXT | 'pending_handoff', 'in_progress', 'handed_back', 'completed' |
| `assigned_operations_user_id` | UUID | The Operations Officer assigned |
| `handed_off_at` | TIMESTAMPTZ | When the handoff occurred |
| `handed_back_at` | TIMESTAMPTZ | When Ops returned to Admin |
| `handoff_notes` | TEXT | Notes from Admin to Ops |

---

## User Experience

### For Admin (Starting a New Order)

1. Admin creates a new custom order via the wizard
2. **New handoff configuration panel** appears (collapsible):
   - Toggle: "Enable Operations Handoff"
   - Select: "Handoff after step: [Dropdown]"
   - Select: "Assign to: [Operations Officers list]"
   - Textarea: "Notes for Operations"
3. Admin completes steps up to the handoff point
4. Saves order with status `pending_handoff`
5. Operations Officer is notified (visual badge in their dashboard)

### For Operations Officer (Continuing the Order)

1. Sees orders assigned to them in a **"My Assigned Orders"** section
2. Badge shows which step to start from
3. Opens the wizard in "continuation mode":
   - Previous steps are **read-only** (can view but not edit)
   - Current step onwards are editable
4. Completes their assigned steps (e.g., Measurements, Sketches)
5. Option: "Hand back to Admin" or "Continue to next step"

### Handoff Statuses

| Status | Badge Color | Description |
|--------|-------------|-------------|
| `pending_handoff` | Amber | Admin saved, waiting for Ops |
| `in_progress` | Blue | Ops is working on it |
| `handed_back` | Purple | Ops returned to Admin |
| `completed` | Green | Order confirmed |

---

## UI Components

### 1. HandoffConfigPanel (New Component)
Located within the wizard, allows Admin to configure handoff:
- Enable/disable handoff
- Select handoff step (Client Info, Work Details, Design, Measurements, Sketches, Pricing)
- Assign Operations Officer (filtered to `operations_manager` role)
- Add notes

### 2. Wizard Modifications
- **Step indicator**: Shows handoff point with a visual marker
- **Read-only mode**: Lock completed steps when viewing as Ops
- **Continuation banner**: "Continuing from Step X - Assigned by [Admin Name]"

### 3. CustomOrdersManager Enhancements
- New filter: "My Assignments" (for Ops role)
- Badge overlay showing handoff status
- Quick action: "Continue Order" button

### 4. Notification Card
- Visual notification for Operations Officers
- Shows pending assignments count
- Links directly to assigned order

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/HandoffConfigPanel.tsx` | Handoff configuration UI |
| `src/components/dashboard/AssignedOrdersSection.tsx` | Ops view of assigned orders |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/CustomDesignWizard.tsx` | Add handoff config, read-only mode, continuation banner |
| `src/components/dashboard/CustomOrdersManager.tsx` | Add filter for assignments, handoff badges |
| `src/integrations/supabase/types.ts` | (Auto-generated after migration) |
| Migration SQL | Add handoff columns |

---

## Role-Based Access Logic

```text
┌─────────────────────────────────────────────────────────────────┐
│                     PERMISSION MATRIX                            │
├─────────────────┬───────────────────────────────────────────────┤
│     Action      │  Admin  │ Manager │ Ops Manager │ Other       │
├─────────────────┼─────────┼─────────┼─────────────┼─────────────┤
│ Create Order    │   ✓     │    ✓    │      ✓      │    -        │
│ Configure Handoff│   ✓     │    ✓    │      -      │    -        │
│ Assign Ops User │   ✓     │    ✓    │      -      │    -        │
│ Complete Ops Steps│   ✓   │    ✓    │      ✓      │    -        │
│ Hand Back to Admin│   -   │    -    │      ✓      │    -        │
│ Final Sign-off  │   ✓     │    ✓    │      -      │    -        │
└─────────────────┴─────────┴─────────┴─────────────┴─────────────┘
```

---

## Handoff Step Options

Admin can choose to hand off after any of these steps:

| Handoff After | Ops Starts At | Use Case |
|---------------|---------------|----------|
| Client Info (1) | Work Details (2) | Ops handles everything technical |
| Work Details (2) | Design Details (3) | Ops captures design requirements |
| Design Details (3) | Measurements (4) | **Most common** - Ops takes measurements |
| Measurements (4) | Sketches (5) | Ops only does sketches |
| Sketches (5) | Pricing (6) | Ops finalizes pricing (rare) |

---

## Workflow States

```text
Order Created (Draft)
       │
       ▼
   [Admin fills steps 1-N]
       │
       ▼
   pending_handoff ────────► [Ops notified]
       │
       ▼
   in_progress ◄────────────── [Ops picks up]
       │
       ├──► [Ops completes all steps] ──► confirmed (normal flow)
       │
       └──► [Ops hands back] ──► handed_back
                                    │
                                    ▼
                              [Admin reviews]
                                    │
                                    ▼
                                confirmed
```

---

## Technical Details

### Fetching Operations Officers
Query `tenant_users` where `role = 'operations_manager'`:
```typescript
const { data: opsUsers } = await supabase
  .from('tenant_users')
  .select('user_id, profiles(full_name)')
  .eq('tenant_id', tenantId)
  .eq('role', 'operations_manager');
```

### Read-Only Step Detection
```typescript
const isStepReadOnly = (stepIndex: number) => {
  if (!order.handoff_step) return false;
  if (role === 'operations_manager') {
    // Ops can't edit steps before handoff
    return stepIndex < order.handoff_step;
  }
  if (order.handoff_status === 'in_progress' && isAdmin) {
    // Admin can't edit while Ops is working
    return stepIndex >= order.handoff_step;
  }
  return false;
};
```

---

## Testing Checklist

1. Admin creates order, enables handoff after Step 3
2. Assign to an Operations Officer
3. Verify Ops sees the order in "My Assignments"
4. Ops opens order, Steps 1-3 are read-only
5. Ops completes Steps 4-5, hands back
6. Admin sees order in "Handed Back" state
7. Admin completes Step 6-7, signs off
8. Order status changes to `confirmed`

