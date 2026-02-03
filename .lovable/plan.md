

# Enhanced System Reset Manager: Complete Data Wipe Capability

## Overview

I'll enhance the existing System Reset Manager to include **all business data tables** that are currently missing, organized into logical categories for easy selection.

---

## Current State

The `SystemResetManager.tsx` currently supports 12 data categories covering:
- Sales transactions, invoices, quotations, receipts
- Expenses, payables, agent data
- Payroll, messages, alerts, donations

**Problem:** Many critical tables are NOT included:
- Custom orders (fashion business)
- Job cards & production data
- Customers
- Inventory movements & adjustments
- Stock transfers
- Assets
- Audit logs

---

## Implementation Plan

### New Categories to Add

| Category | Label | Tables | Description |
|----------|-------|--------|-------------|
| `custom_orders` | Custom Orders & Tailoring | `custom_order_adjustments`, `custom_order_items`, `custom_orders` | All custom/made-to-measure orders |
| `job_cards` | Job Cards & Production | `job_material_usage`, `job_cards` | Production floor job cards and materials |
| `customers` | Customer Records | `customers` | All customer information |
| `collections` | Collections | `collections` | Collection/payment records |
| `inventory_movements` | Inventory Movements | `stock_movements`, `inventory_adjustments`, `restock_history` | All stock movement history |
| `stock_transfers` | Stock Transfers | `stock_transfers` | Inter-branch transfers |
| `attendance` | Employee Attendance | `employee_attendance` | Time & attendance records |
| `recurring_expenses` | Recurring Expenses | `recurring_expenses` | Recurring expense templates |
| `financial_reports` | Generated Reports | `financial_reports` | Saved financial reports |
| `vendors` | Vendors/Suppliers | `vendors` | Supplier records |
| `assets` | Assets & Depreciation | `asset_logs`, `assets` | Fixed assets and logs |
| `audit_logs` | Audit Logs | `transaction_audit_log`, `audit_log` | System audit trails |

### Technical Changes

**1. Add new categories to the state array:**

```typescript
const [categories, setCategories] = useState<ResetCategory[]>([
  // Existing categories...
  
  // NEW CATEGORIES:
  {
    id: "custom_orders",
    label: "Custom Orders & Tailoring",
    description: "All custom/made-to-measure orders, items, and adjustments",
    tables: ["custom_order_adjustments", "custom_order_items", "custom_orders"],
    checked: false,
  },
  {
    id: "job_cards",
    label: "Job Cards & Production",
    description: "Production job cards and material usage records",
    tables: ["job_material_usage", "job_cards"],
    checked: false,
  },
  {
    id: "customers",
    label: "Customer Records",
    description: "All customer profiles and contact information",
    tables: ["customers"],
    checked: false,
  },
  {
    id: "collections",
    label: "Collections",
    description: "All payment collection records",
    tables: ["collections"],
    checked: false,
  },
  {
    id: "inventory_movements",
    label: "Inventory Movements",
    description: "Stock movements, adjustments, and restock history",
    tables: ["stock_movements", "inventory_adjustments", "restock_history"],
    checked: false,
  },
  {
    id: "stock_transfers",
    label: "Stock Transfers",
    description: "Inter-branch stock transfer records",
    tables: ["stock_transfers"],
    checked: false,
  },
  {
    id: "attendance",
    label: "Employee Attendance",
    description: "All attendance and time tracking records",
    tables: ["employee_attendance"],
    checked: false,
  },
  {
    id: "recurring_expenses",
    label: "Recurring Expenses",
    description: "Recurring expense templates and schedules",
    tables: ["recurring_expenses"],
    checked: false,
  },
  {
    id: "financial_reports",
    label: "Generated Reports",
    description: "Saved financial and business reports",
    tables: ["financial_reports"],
    checked: false,
  },
  {
    id: "vendors",
    label: "Vendors & Suppliers",
    description: "Supplier and vendor records",
    tables: ["vendors"],
    checked: false,
  },
  {
    id: "assets",
    label: "Assets & Depreciation",
    description: "Fixed assets and depreciation logs",
    tables: ["asset_logs", "assets"],
    checked: false,
  },
  {
    id: "audit_logs",
    label: "Audit Logs",
    description: "System audit trails (transaction and general)",
    tables: ["transaction_audit_log", "audit_log"],
    checked: false,
  },
]);
```

**2. Update `validTables` array for restore functionality:**

```typescript
const validTables = [
  // Existing...
  "sales_transactions", "transactions", "invoice_items", "invoices", 
  "quotation_items", "quotations", "payment_receipts", "expenses", 
  "accounts_payable", "agent_transactions", "agent_inventory", 
  "agent_applications", "payroll_records", "website_contacts",
  "community_messages", "admin_alerts", "donation_requests",
  
  // NEW:
  "custom_order_adjustments", "custom_order_items", "custom_orders",
  "job_material_usage", "job_cards", "customers", "collections",
  "stock_movements", "inventory_adjustments", "restock_history",
  "stock_transfers", "employee_attendance", "recurring_expenses",
  "financial_reports", "vendors", "asset_logs", "assets",
  "transaction_audit_log", "audit_log"
];
```

**3. Add FK constraint handling for new tables:**

Before deleting custom_orders:
```typescript
if (selectedTableNames.includes("custom_orders")) {
  // Delete children first
  await safeDeleteChildren("custom_order_adjustments");
  await safeDeleteChildren("custom_order_items");
}

if (selectedTableNames.includes("job_cards")) {
  await safeDeleteChildren("job_material_usage");
}

if (selectedTableNames.includes("assets")) {
  await safeDeleteChildren("asset_logs");
}

if (selectedTableNames.includes("customers")) {
  // Nullify customer references in related tables
  await safeNullify("invoices", "customer_id");
  await safeNullify("quotations", "customer_id");
  await safeNullify("custom_orders", "customer_id");
  await safeNullify("sales_transactions", "customer_id");
}
```

---

## File Changes

| File | Changes |
|------|---------|
| `src/components/dashboard/SystemResetManager.tsx` | Add 12 new data categories, update FK handling, update validTables array |

---

## UI Result

After implementation, the Settings → System Reset page will show:

```text
┌─────────────────────────────────────────────────────────────┐
│  SELECT DATA TO CLEAR                    [Select All] [×]   │
├─────────────────────────────────────────────────────────────┤
│  ☐ Sales Transactions        ☐ Custom Orders & Tailoring   │
│  ☐ Bank Transactions         ☐ Job Cards & Production      │
│  ☐ Invoices & Items          ☐ Customer Records            │
│  ☐ Quotations & Items        ☐ Collections                 │
│  ☐ Payment Receipts          ☐ Inventory Movements         │
│  ☐ Expenses                  ☐ Stock Transfers             │
│  ☐ Accounts Payable          ☐ Employee Attendance         │
│  ☐ Agent Data                ☐ Recurring Expenses          │
│  ☐ Payroll Records           ☐ Generated Reports           │
│  ☐ Website Messages          ☐ Vendors & Suppliers         │
│  ☐ Admin Alerts              ☐ Assets & Depreciation       │
│  ☐ Donation Requests         ☐ Audit Logs                  │
└─────────────────────────────────────────────────────────────┘
```

**Total: 24 categories** covering all business data that can be safely reset.

---

## Safety Features (Already in Place)

- ✓ Type "RESET DATA" to confirm
- ✓ Optional backup to Excel before reset
- ✓ Dramatic warning animation
- ✓ Shows record counts before deletion
- ✓ Admin-only access

---

## What Will NOT Be Reset

These tables contain system configuration and should never be wiped:
- `tenants`, `tenant_users`, `tenant_addons`
- `profiles`, `authorized_emails`, `user_roles`
- `employees`, `branches`, `inventory`, `product_variants`
- `billing_plan_configs`, `platform_config`
- `company_settings`, `business_profiles`
- `blog_posts`, `wash_forums`, `hero_announcements`

