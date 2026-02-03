
# Itemized Custom Order Tracking for Quotations & Invoices

## Problem Summary

Currently, when a custom order is created:
1. **Materials ARE tracked** in `job_material_usage` table (linked to inventory)
2. **Labor IS tracked** in `custom_orders` (hours, rate, skill level)
3. **BUT quotations/invoices show only 1 summarized line item** like "Suit - CO2026-0001" for the total price

This means the customer and business don't see the itemized breakdown of:
- Individual materials used (fabric, buttons, lining, etc.)
- Labor charges
- Packaging costs
- Company margin

---

## Solution Overview

Modify the quotation/invoice generation to create **multiple line items** that itemize each cost component, while keeping the single-total approach as an option for simpler orders.

### What Will Be Itemized

| Category | Source | Line Item Type |
|----------|--------|----------------|
| **Materials** | `formData.materials[]` from MaterialSelector | `product` or `item` |
| **Labor** | Hours × Hourly Rate from LaborEstimator | `service` |
| **Margin/Overhead** | Calculated percentage | `service` |
| **Custom Add-ons** | New section for packaging, accessories, etc. | `product` or `service` |

---

## Implementation Plan

### 1. Add Custom Order Add-ons Section

Create a new section in the Pricing step (Step 6) for additional costs like:
- Packaging (gift box, garment bag)
- Accessories (extra buttons, care labels)
- Express production fee
- Alterations buffer

```text
┌─────────────────────────────────────────────────────────────┐
│  MATERIALS FROM WAREHOUSE              [AI Estimate] [+ Add]│
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Italian Wool Fabric    2.5m @ K150/m         = K375.00 │ │
│  │ Silk Lining            1.8m @ K45/m          = K81.00  │ │
│  │ Buttons (Pearl)        6 pcs @ K25/pc        = K150.00 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                    Material Total: K606.00  │
│                                                             │
│  LABOR ESTIMATION                                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Senior Tailor × 12 hours @ K75/hr            = K900.00 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ADDITIONAL COSTS (Packaging, Accessories, etc.)   [+ Add] │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ [Garment Bag - Premium      ]     1 × K50    = K50.00  │ │
│  │ [Express Production Fee     ]     1 × K200   = K200.00 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  PRICE BREAKDOWN                                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Materials:         K606.00                             │ │
│  │ Labor:            K900.00                              │ │
│  │ Additional:       K250.00                              │ │
│  │ Base Cost:      K1,756.00                              │ │
│  │ Margin (30%):    +K526.80                              │ │
│  │ ─────────────────────────────────                      │ │
│  │ QUOTED PRICE:  K2,282.80                               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 2. Update Quotation Generation Logic

Modify `CustomDesignWizard.tsx` to create itemized line items instead of a single summarized line:

**Current (Single Line):**
```typescript
await supabase.from('quotation_items').insert({
  description: "Suit - CO2026-0001",
  quantity: 1,
  unit_price: 2282.80,
  amount: 2282.80,
});
```

**New (Multiple Lines):**
```typescript
const quotationItems = [];

// 1. Material line items
for (const material of formData.materials) {
  quotationItems.push({
    quotation_id: quotation.id,
    tenant_id: tenantId,
    description: material.name,
    quantity: material.quantity,
    unit_price: material.unitCost,
    amount: material.quantity * material.unitCost,
    product_id: material.inventoryId, // Link to inventory
  });
}

// 2. Labor line item
if (formData.laborHours > 0) {
  quotationItems.push({
    quotation_id: quotation.id,
    tenant_id: tenantId,
    description: `Tailoring Labor (${formData.skillLevel} Tailor × ${formData.laborHours}hrs)`,
    quantity: formData.laborHours,
    unit_price: formData.hourlyRate,
    amount: formData.laborHours * formData.hourlyRate,
  });
}

// 3. Additional costs (packaging, express fee, etc.)
for (const addon of formData.additionalCosts) {
  quotationItems.push({
    quotation_id: quotation.id,
    tenant_id: tenantId,
    description: addon.description,
    quantity: addon.quantity,
    unit_price: addon.unitPrice,
    amount: addon.quantity * addon.unitPrice,
  });
}

// 4. Margin as a separate line (optional - or can be hidden)
if (marginAmount > 0) {
  quotationItems.push({
    quotation_id: quotation.id,
    tenant_id: tenantId,
    description: "Service & Overhead",
    quantity: 1,
    unit_price: marginAmount,
    amount: marginAmount,
  });
}

await supabase.from('quotation_items').insert(quotationItems);
```

### 3. Update Invoice Generation Logic

Apply the same itemization to `OrderToInvoiceModal.tsx`:

- Fetch stored materials from `job_material_usage` (already linked to inventory)
- Fetch labor from `custom_orders` (hours, rate)
- Create individual `invoice_items` for each component

### 4. Store Additional Costs in custom_order_items

The existing `custom_order_items` table is perfect for storing the additional costs. Currently unused, we'll populate it with:
- Packaging items
- Express fees
- Accessories
- Any custom add-ons

This creates a complete audit trail for every component of the order.

### 5. Add "item_type" Column to quotation_items

Add an `item_type` column to distinguish between materials, labor, and fees:

```sql
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'product';
```

---

## Technical Changes

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/CustomDesignWizard.tsx` | Add additionalCosts state, update quotation generation to create itemized lines |
| `src/components/dashboard/OrderToInvoiceModal.tsx` | Fetch materials from `job_material_usage`, create itemized invoice lines |
| `src/components/dashboard/PricingBreakdown.tsx` | Update to show additional costs section |
| **NEW** `src/components/dashboard/AdditionalCostsSection.tsx` | New component for packaging, fees, accessories |

### Database Migration

Add `item_type` column to `quotation_items` for categorization:

```sql
ALTER TABLE quotation_items 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'product';

COMMENT ON COLUMN quotation_items.item_type IS 
  'Categorizes line items: product, service, material, labor, fee';
```

### Form State Changes

Add to `formData` in CustomDesignWizard:

```typescript
additionalCosts: [] as { 
  id: string; 
  description: string; 
  quantity: number; 
  unitPrice: number;
  itemType: 'packaging' | 'fee' | 'accessory' | 'other';
}[]
```

---

## Benefits

1. **Full Transparency** - Customers see exactly what they're paying for
2. **Accurate Costing** - Business can track material usage per order
3. **Inventory Linkage** - Materials deducted from correct inventory items
4. **Audit Trail** - Complete breakdown stored in `custom_order_items` and `job_material_usage`
5. **Flexible Pricing** - Easy to add packaging, express fees, or accessories
6. **Professional Quotes** - Itemized quotations look more professional

---

## Quotation/Invoice Preview

After implementation, a generated quotation will show:

```text
┌─────────────────────────────────────────────────────────────┐
│  QUOTATION #Q2026-0042                                      │
│  Customer: John Banda                                       │
│  Order: CO2026-0008 (Suit - 2 Piece)                       │
├─────────────────────────────────────────────────────────────┤
│  DESCRIPTION                    QTY    UNIT     AMOUNT     │
│  ─────────────────────────────────────────────────────────  │
│  Italian Wool Fabric (Black)    2.5m   K150.00   K375.00   │
│  Silk Lining                    1.8m   K45.00    K81.00    │
│  Pearl Buttons                  6 pcs  K25.00    K150.00   │
│  Tailoring Labor (Senior)       12 hrs K75.00    K900.00   │
│  Premium Garment Bag            1      K50.00    K50.00    │
│  Express Production Fee         1      K200.00   K200.00   │
│  Service & Overhead             1      K526.80   K526.80   │
│  ─────────────────────────────────────────────────────────  │
│                               SUBTOTAL:        K2,282.80   │
│                               TAX (0%):            K0.00   │
│                               TOTAL:           K2,282.80   │
│                               DEPOSIT PAID:    (K500.00)   │
│                               BALANCE DUE:     K1,782.80   │
└─────────────────────────────────────────────────────────────┘
```
