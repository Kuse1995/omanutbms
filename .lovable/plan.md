

# Make Stock Transfers Editable with Audit Trail

## Current State
- Stock transfers are **read-only** after creation — no way to edit quantity, notes, or locations
- The `audit_log` table already has triggers on `stock_transfers` that capture INSERT/UPDATE/DELETE with old and new data — so **audit tracking is already in place**
- What's missing is the **UI to edit** transfers and a way to **view the edit history**

## What We're Building

### 1. Edit Transfer Modal
Add an "Edit" action to transfers that are in `pending` or `in_transit` status (not completed/cancelled). Editable fields:
- **Quantity** — with validation against available stock
- **Notes** — reason/context updates
- **Target location** — can redirect a transfer before completion
- **Edit reason** (required) — forces the user to explain why they're changing it

Restrictions:
- Only admins/managers or the original requester can edit
- Completed and cancelled transfers are locked
- Source location and product cannot be changed (would require a new transfer)

### 2. Edit History Viewer
A "View History" action on each transfer that opens a dialog showing all changes from the `audit_log` table, displaying:
- What changed (old value → new value)
- Who changed it
- When it was changed

This uses the existing `audit_log` data — no new tables needed.

### Files to Modify
- **`src/components/dashboard/StockTransfersManager.tsx`** — Add "Edit" and "View History" dropdown actions, inline edit modal, and history dialog. Wire up update logic with required edit reason appended to notes.

### No Database Changes
The existing `audit_table_update` trigger on `stock_transfers` already logs `old_data` and `new_data` to `audit_log` on every UPDATE — so every edit is automatically tracked for auditing.

