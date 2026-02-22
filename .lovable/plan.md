
# Comprehensive Issue Review and Fix Plan

This plan covers 20 issues reported. Some are already resolved, others need fixes.

---

## Issue-by-Issue Assessment

### 1. Low stock alerts are too overwhelming -- ALREADY FIXED
The low stock alerts in `InventoryAgent.tsx` (line 564-597) are already wrapped in a `Collapsible` component, collapsed by default. Users click to expand. No changes needed.

### 2. Upload should have continuity when items are being uploaded -- ALREADY FIXED
The global `UploadContext` and `UploadProgressIndicator` already handle background imports with continuity across navigation. No changes needed.

### 3. Vendor list when restocking + upload invoices/quotations -- ALREADY FIXED
The `RestockModal.tsx` already has vendor selection with inline creation (lines 66-75) and file upload for invoices and quotations (lines 77-80). No changes needed.

### 4. In inventory heading, hide whatever hasn't been entered -- NEEDS FIX
The inventory table currently shows columns for Colors, Sizes, Location, etc. even when empty. The Colors/Sizes columns already hide dynamically (lines 755-766), but the "Type" column and "Location" column always show. Fix: hide the Location column when multi-branch is disabled, and hide the Type column when `showMaterialsAndConsumables` is false (this is already done at line 800 -- verified OK). The main issue is the **table card heading** which reads "Product Products & Spares" for autoshop (because it concatenates `terminology.productLabel` + `terminology.inventoryLabel`). This should just show `terminology.inventoryLabel`.

### 5. Autoshop: show "Inventory/Products" instead of "Auto Parts" -- NEEDS FIX
The autoshop `terminology.inventory` is set to "Products & Spares" (line 969). The sidebar uses `terminology.inventoryLabel` for the menu item. The table heading concatenates `productLabel + inventoryLabel` = "Product Products & Spares". Fix: change the table heading to just use `terminology.inventoryLabel`, and update the autoshop terminology if needed.

### 6. Remove the impact -- NEEDS FIX
The `DashboardHome.tsx` (lines 480-493) shows an "Impact Summary" card when `features.impact` is enabled. The autoshop config already has `impact: { enabled: false }`, so this card should already be hidden. However, the `ImpactReporting` component may still appear in `AccountsAgent`. Need to ensure impact-related UI is fully hidden when `impact.enabled === false`. Also need to check `DashboardSidebar` -- communities and messages are already in `hiddenTabs` for autoshop.

### 7. Only receiving location users can mark transfers complete -- ALREADY FIXED
`StockTransfersManager.tsx` (lines 224-235) already implements `canCompleteTransfer()` which checks if the user is assigned to the receiving branch. No changes needed.

### 8. Users should see all branches in inventory when moving items -- NEEDS FIX
Currently `InventoryAgent.tsx` filters inventory by `currentBranch` (line 173-175). When a user wants to move items between branches, they can only see their own branch's stock. The bulk "Move to Branch" dropdown already shows all branches (lines 698-709), but users can only select items from the currently viewed branch. Fix: add an option to view "All Branches" in the inventory filter for item movement purposes (read-only visibility for other branches' stock).

### 9. Materials and consumable not needed for autoshop -- ALREADY FIXED
Line 130: `const showMaterialsAndConsumables = businessType === 'fashion';` -- this already hides materials/consumables for all business types except fashion. No changes needed.

### 10. Warehouse should show in inventory dropdown (not filtering) -- NEEDS FIX
When a warehouse is created, it should appear as a location option in the inventory branch selector, but currently warehouses are separate from branches. The `BranchSelector` only shows branches, not warehouses. Fix: include warehouses in the location dropdown within `InventoryAgent` so inventory items can be assigned to warehouses.

### 11. HR should only show Employees and Payroll -- NEEDS FIX
`HRAgent.tsx` (lines 301-336) shows 4-6 tabs: BMS Staff, Employees, Attendance, Payroll, and optionally Partners/Applications. For most business types, only Employees and Payroll are needed. Fix: hide BMS Staff tab (move to Settings), hide Attendance tab (make sub-tab of Employees or hide for non-attendance businesses), and hide Partners/Applications when agents feature is disabled (already done with `showAgents` flag).

### 12. User/Profile button in settings has a glitch -- NEEDS FIX
`UserProfileSettings.tsx` initializes state from `profile` (line 31-36), but if `profile` is null on mount and loads later, the form fields stay empty. Fix: add a `useEffect` to sync state when `profile` changes.

### 13. Role changes after creation are not being applied -- NEEDS FIX
`handleUpdateRole` in `AuthorizedEmailsManager.tsx` (lines 205-293) has a flawed approach. It tries to find users by iterating through profiles by name matching, which is unreliable. The actual `tenant_users` update at lines 261-272 uses `.in("user_id", userIds)` without proper filtering -- it updates ALL tenant users' roles. Fix: create a database function that accepts an email and updates the corresponding `tenant_users` and `user_roles` records atomically.

### 14. Branch employees should see other branches' availability (read-only) -- ALREADY HANDLED
The branch isolation guard in `SalesRecorder` prevents cross-branch selling. Inventory visibility is branch-scoped in `InventoryAgent`. This overlaps with issue 8. Fix (combined with 8): allow read-only "All Branches" view in inventory for visibility, while keeping the write restriction.

### 15. Sales agents should create quotations and invoices -- ALREADY FIXED
The `role-config.ts` already grants `sales_rep` and `cashier` access to the `quotations` module. The quotations tab is a top-level dashboard tab. No changes needed.

### 16. Impact summary needs to be removed -- SAME AS ISSUE 6
Duplicate of issue 6. Will be handled there.

### 17. Credit sale invoice should include tax -- NEEDS REVIEW
When a credit sale generates an invoice, the item description should show the tax-inclusive amount. Need to verify the invoice generation logic in `SalesRecorder.tsx` and the `InvoiceFormModal`.

### 18. Credit sale price edit (risk markup) shouldn't show on documents -- ALREADY FIXED
The risk adjustment section in `SalesRecorder.tsx` is labeled "(Optional - Internal only)" and the markup is included in `total_amount` for accounting but not itemized on customer-facing documents. No changes needed.

### 19. WhatsApp isn't working -- NEEDS INVESTIGATION
This is a broad issue. The WhatsApp integration depends on the `whatsapp-bms-handler` edge function and Twilio/WhatsApp Business API configuration. This requires checking secrets (WHATSAPP_VERIFY_TOKEN, etc.) and edge function logs. Marking as needs investigation -- will check secrets and function status.

### 20. WhatsApp numbers from profile not recognized as employees -- NEEDS FIX
`UserProfileSettings.tsx` (lines 176-196) syncs phone to `whatsapp_user_mappings` only if an `employees` record exists with `user_id`. If the employee record doesn't exist or isn't linked, the sync fails silently. Fix: also try matching by phone number or create the mapping regardless of employee linkage.

### 21. Add dark mode -- NEEDS IMPLEMENTATION
No dark mode infrastructure exists. The project uses `next-themes` only for `sonner`. Fix: wrap app in `ThemeProvider`, add a toggle in the dashboard header, and ensure Tailwind dark classes work.

---

## Implementation Plan (Priority Order)

### Phase 1: Quick Fixes (Low Risk)

**1. Fix inventory table heading (Issues 4 & 5)**
- File: `src/components/dashboard/InventoryAgent.tsx` (line 728-729)
- Change `{terminology.productLabel} {terminology.inventoryLabel}` to just `{terminology.inventoryLabel}`

**2. Fix UserProfileSettings glitch (Issue 12)**
- File: `src/components/dashboard/UserProfileSettings.tsx`
- Add `useEffect` to sync `fullName`, `title`, `department`, `phone`, `avatarUrl` when `profile` changes

**3. Simplify HR tabs (Issue 11)**
- File: `src/components/dashboard/HRAgent.tsx`
- Default to "employees" tab instead of "bms-staff"
- Hide BMS Staff tab for non-admin users
- Hide Attendance tab -- fold it into Employees or make it only visible when attendance tracking is actively used

### Phase 2: Role Update Fix (Issue 13)

**4. Fix role change synchronization**
- Create a database function `sync_user_role_by_email(p_email text, p_new_role text, p_tenant_id uuid)` that:
  1. Looks up the user by email in `auth.users`
  2. Updates `tenant_users.role` for that user+tenant
  3. Updates `user_roles` for that user
- File: `src/components/dashboard/AuthorizedEmailsManager.tsx` -- replace `handleUpdateRole` to call this RPC function

### Phase 3: Inventory Visibility (Issues 8, 10, 14)

**5. Allow read-only "All Locations" view in inventory**
- File: `src/components/dashboard/InventoryAgent.tsx`
- Add a toggle or dropdown to view all branches/warehouses inventory (read-only)
- When viewing all locations, disable edit/restock/archive actions for items not in user's branch
- Include warehouses in the location filter options

### Phase 4: Impact Removal (Issues 6, 16)

**6. Ensure impact UI is hidden when disabled**
- File: `src/components/dashboard/DashboardHome.tsx` -- already gated by `features.impact`
- File: `src/components/dashboard/AccountsAgent.tsx` -- check if Impact Reporting tab is hidden when `impact.enabled === false`
- Verify sidebar hides impact-related items (already done via `hiddenTabs`)

### Phase 5: Credit Invoice Tax (Issue 17)

**7. Verify tax inclusion on credit invoices**
- File: `src/components/dashboard/SalesRecorder.tsx` -- check invoice generation logic
- Ensure `total_amount` on auto-generated invoices includes tax
- Ensure item descriptions on invoices show tax-inclusive prices

### Phase 6: WhatsApp Profile Sync (Issue 20)

**8. Fix phone-to-employee mapping**
- File: `src/components/dashboard/UserProfileSettings.tsx`
- When saving phone, also attempt to create `whatsapp_user_mappings` even without an employee record (use `user_id` instead)
- Add `tenant_id` to the mapping for proper scoping

### Phase 7: Dark Mode (Issue 21)

**9. Add dark mode support**
- File: `src/main.tsx` -- wrap app in `ThemeProvider` from `next-themes`
- File: `src/components/dashboard/DashboardHeader.tsx` -- add theme toggle button (Sun/Moon icon)
- File: `src/index.css` -- add CSS variables for dark mode
- Update hardcoded colors in dashboard components to use CSS variables or Tailwind dark: classes
- Note: This is a large change affecting many files. Will implement a basic toggle that switches the root class, and progressively update components.

### Phase 8: WhatsApp Investigation (Issue 19)

**10. Investigate WhatsApp edge function**
- Check secrets configuration for WhatsApp-related keys
- Review edge function logs for `whatsapp-bms-handler`
- This may require external API configuration that can't be fixed in code alone

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/InventoryAgent.tsx` | Fix heading, add all-locations view |
| `src/components/dashboard/UserProfileSettings.tsx` | Fix profile sync glitch, fix phone mapping |
| `src/components/dashboard/HRAgent.tsx` | Simplify tabs |
| `src/components/dashboard/AuthorizedEmailsManager.tsx` | Fix role update logic |
| `src/components/dashboard/DashboardHome.tsx` | Verify impact gating |
| `src/components/dashboard/AccountsAgent.tsx` | Hide impact tab when disabled |
| `src/components/dashboard/SalesRecorder.tsx` | Verify tax on credit invoices |
| `src/components/dashboard/DashboardHeader.tsx` | Add dark mode toggle |
| `src/main.tsx` | Add ThemeProvider |
| `src/index.css` | Dark mode CSS variables |
| New migration | `sync_user_role_by_email` database function |

## Summary

- **Already working (no changes)**: Issues 1, 2, 3, 7, 9, 14, 15, 18
- **Quick fixes**: Issues 4, 5, 12
- **Medium effort**: Issues 6, 8, 10, 11, 13, 17, 20
- **Large effort**: Issue 21 (dark mode)
- **Investigation needed**: Issue 19 (WhatsApp)
