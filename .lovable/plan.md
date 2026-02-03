

# Custom Order Handoff Notification System

## Status: ✅ IMPLEMENTED

## Overview

This plan addressed a critical UX gap in the custom order handoff workflow. The following features have been implemented:

1. **Admin confirmation toast** - When clicking "Save Draft" with handoff enabled, show a toast confirming the order was handed off to the specific operations manager
2. **Operations Manager notification popup** - When the operations manager opens the Custom Orders section, show a prominent alert/dialog about newly assigned orders waiting for them

---

## Current State vs. Proposed

| Scenario | Current | Proposed |
|----------|---------|----------|
| Admin saves with handoff | Generic "Draft Saved" toast | Specific "Order handed off to [Name]" toast |
| Ops Manager opens Custom Orders | No special notification | Welcome dialog showing pending assignments |
| Real-time notification | None | Bell notification via admin_alerts |

---

## Implementation Plan

### 1. Improve Admin Handoff Toast (CustomDesignWizard.tsx)

Update the save draft flow to show a specific handoff confirmation:

**Changes to `handleSaveDraft` function:**
- After successful insert, check if handoff was enabled
- If yes, fetch the assigned ops manager's name from the `officers` list already loaded in `HandoffConfigPanel`
- Show a different toast: "Order handed off to [Name] - They'll receive it in their queue"

**New toast examples:**
- With handoff: `"Order handed off to John Smith - They'll receive it in their queue"`
- Without handoff: `"Draft Saved - You can continue editing it later"` (existing behavior)

---

### 2. Create Admin Alert on Handoff (CustomDesignWizard.tsx)

When saving with handoff enabled, create an entry in `admin_alerts` so the operations manager sees it in their NotificationsCenter:

```typescript
// After successful order insert with handoff
await supabase.from("admin_alerts").insert({
  tenant_id: tenantId,
  alert_type: "order_handoff",
  message: `New order assigned to you: ${orderNumber} for ${customerName}`,
  related_table: "custom_orders",
  related_id: newOrderId,
});
```

**Note:** This requires adding a `target_user_id` column to `admin_alerts` to filter alerts by recipient, or we create a new table `user_notifications`.

---

### 3. Extend admin_alerts Table (Database Migration)

Add a `target_user_id` column to route notifications to specific users:

```sql
ALTER TABLE admin_alerts 
ADD COLUMN target_user_id UUID REFERENCES auth.users(id);

-- Update RLS to allow users to see their own targeted alerts
CREATE POLICY "Users can view their targeted alerts"
  ON admin_alerts FOR SELECT
  USING (
    target_user_id = auth.uid()
    OR target_user_id IS NULL -- Tenant-wide alerts
  );
```

---

### 4. Update NotificationsCenter (NotificationsCenter.tsx)

Modify the fetch query to:
1. Filter `admin_alerts` where `target_user_id = auth.uid()` OR `target_user_id IS NULL`
2. Add handling for `alert_type = 'order_handoff'`
3. Navigate to custom orders when clicked

**New notification type:**
```typescript
type: "handoff" // New type
title: "New Order Assigned"
message: "Order CO-2024-0001 for John Doe assigned to you"
navigate_to: "/bms?tab=fashion&subtab=orders"
```

---

### 5. Create Assignment Welcome Dialog (AssignedOrdersSection.tsx)

When operations manager opens the Custom Orders section and has pending assignments:

1. Check if there are orders with `handoff_status = 'pending_handoff'`
2. If first visit (use localStorage flag), show a welcome dialog:
   - "You have X orders waiting for your attention"
   - List the orders with customer names
   - "Pick Up" button to mark them as in_progress
   - "View All" button to close and see the list

**Dialog Content:**
```text
╔═══════════════════════════════════════════╗
║  📋 Orders Assigned to You                ║
╠═══════════════════════════════════════════╣
║  You have 2 orders waiting:               ║
║                                           ║
║  • CO-2024-0045 - John Doe (Suit)         ║
║    Assigned by: Admin | Due: Feb 10       ║
║                                           ║
║  • CO-2024-0046 - Mary Smith (Dress)      ║
║    Assigned by: Manager | Due: Feb 12     ║
║                                           ║
║  [Pick Up All]      [View Details]        ║
╚═══════════════════════════════════════════╝
```

---

### 6. Add Hand-Back Confirmation (For Operations Manager)

When ops manager completes their steps and hands back to admin:

1. Update `handoff_status` to `'handed_back'`
2. Create notification for the admin:
   ```typescript
   await supabase.from("admin_alerts").insert({
     tenant_id: tenantId,
     target_user_id: order.created_by, // Admin who created the order
     alert_type: "order_handed_back",
     message: `Order ${orderNumber} has been handed back by ${opsManagerName}`,
     related_table: "custom_orders",
     related_id: orderId,
   });
   ```
3. Show confirmation toast to ops manager

---

## Files to Modify

| File | Changes |
|------|---------|
| **Database Migration** | Add `target_user_id` to `admin_alerts`, update RLS |
| `src/components/dashboard/CustomDesignWizard.tsx` | Enhanced handoff toast, create admin_alert on save |
| `src/components/dashboard/NotificationsCenter.tsx` | Handle `order_handoff` type, filter by target_user |
| `src/components/dashboard/AssignedOrdersSection.tsx` | Add welcome dialog for pending assignments |
| **New: `src/components/dashboard/HandoffWelcomeDialog.tsx`** | Reusable dialog for assigned order notifications |

---

## Technical Details

### Database Migration SQL

```sql
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
```

### CustomDesignWizard Changes

1. Pass selected officer name from `HandoffConfigPanel` to parent via callback
2. Update toast message based on handoff configuration
3. Insert admin_alert after successful order creation

### NotificationsCenter Changes

1. Update `getIcon` to handle `"handoff"` type
2. Add routing for `order_handoff` alerts to custom orders
3. Update query to include `target_user_id` filter

### New HandoffWelcomeDialog Component

A dialog that:
- Appears when ops manager has pending assignments
- Uses localStorage to track if shown this session
- Lists pending orders with key details
- Provides quick actions (Pick Up All, View Details)

---

## Collaboration Flow (After Implementation)

```text
ADMIN                                     OPS MANAGER
  │                                           │
  │ 1. Creates order with handoff             │
  │    ↓                                      │
  │ 2. Clicks "Save Draft"                    │
  │    ↓                                      │
  │ 3. Toast: "Handed off to [Name]" ✓        │
  │    ↓                                      │
  │ 4. admin_alert created ────────────────►  │
  │                                           │ 5. Bell notification appears
  │                                           │    ↓
  │                                           │ 6. Opens Custom Orders
  │                                           │    ↓
  │                                           │ 7. Welcome Dialog shows
  │                                           │    ↓
  │                                           │ 8. Picks up order
  │                                           │    ↓
  │ ◄──────────────────────────────────────── │ 9. Completes & hands back
  │                                           │
  │ 10. Bell notification: "Order returned"   │ 10. Toast: "Handed back" ✓
  │    ↓                                      │
  │ 11. Reviews & finalizes                   │
```

---

## Expected User Experience

**For Admin:**
- Clear confirmation when order is handed off
- Notification when ops manager hands it back

**For Operations Manager:**
- Bell notification in header when assigned
- Welcome popup when opening Custom Orders
- Clear indication of which orders are theirs
- Confirmation when handing back

