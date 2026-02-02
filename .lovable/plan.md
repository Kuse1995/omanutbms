

# Plan: WhatsApp Document Delivery as PDF Attachments

## Overview

Transform all WhatsApp document responses (payslips, invoices, quotations, receipts) from plain text summaries to proper PDF document attachments. This gives employees and customers professional documents they can save, print, or forward.

## Current Behavior vs. Proposed

| Request | Current Response | New Response |
|---------|-----------------|--------------|
| "my pay" | Text summary only | Text summary + PDF payslip attached |
| "send receipt R2026-0001" | Not implemented | Text + PDF receipt attached |
| "last invoice" | Not implemented | Text + PDF invoice attached |
| "send quotation Q2026-0012" | Not implemented | Text + PDF quotation attached |

---

## Technical Changes

### 1. Add Payslip PDF Generation

**File:** `supabase/functions/generate-whatsapp-document/index.ts`

- Add `payslip` to the supported document types
- Create payslip-specific data fetching from `payroll_records` table
- Build a professional payslip PDF with:
  - Employee name and ID
  - Pay period dates
  - Gross salary, deductions breakdown, net pay
  - Payment status and date
  - Company branding (logo, name, address)

### 2. Update My Pay Handler to Return Payroll ID

**File:** `supabase/functions/bms-api-bridge/index.ts`

Update `handleMyPay` to include `payroll_id` and `tenant_id` in the response data, enabling the handler to generate a PDF.

```typescript
return {
  success: true,
  message: `...`,
  data: { 
    payroll_id: payroll.id,  // NEW
    tenant_id: context.tenant_id,  // NEW
    ...payroll 
  },
};
```

### 3. Auto-Attach Payslip PDF in WhatsApp Handler

**File:** `supabase/functions/whatsapp-bms-handler/index.ts`

Add logic after the bridge call to detect `my_pay` intent success and generate/attach the payslip PDF:

```typescript
// Auto-send payslip for my_pay intent
if (bridgeResult.success && parsedIntent.intent === 'my_pay' && bridgeResult.data?.payroll_id) {
  try {
    const docResponse = await fetch(`${SUPABASE_URL}/functions/v1/generate-whatsapp-document`, {
      method: 'POST',
      headers: { ... },
      body: JSON.stringify({
        document_type: 'payslip',
        document_id: bridgeResult.data.payroll_id,
        tenant_id: mapping.tenant_id,
      }),
    });
    // Attach PDF if successful
  } catch (docError) { ... }
}
```

### 4. Add Document Request Intents (Optional Enhancement)

**File:** `supabase/functions/bms-intent-parser/index.ts`

Add parsing for explicit document requests:
- "send receipt R2026-0001" → `send_receipt` intent
- "last invoice" / "my invoice" → `send_invoice` intent  
- "quotation Q2026-0015" → `send_quotation` intent
- "my payslip" / "payslip for January" → `send_payslip` intent

**File:** `supabase/functions/bms-api-bridge/index.ts`

Add handlers for these intents that look up the document and return it with a media URL.

---

## Payslip PDF Structure

```text
┌───────────────────────────────────────────────────────┐
│                    PAYSLIP                            │
│                   PS-2026-0001                        │
│                                                       │
│              [COMPANY NAME]                           │
│           [Address] • [Phone] • [Email]               │
├───────────────────────────────────────────────────────┤
│  Employee: John Mwanza                                │
│  Employee ID: EMP-0042                                │
│  Pay Period: 1 Jan 2026 - 31 Jan 2026                │
│  Payment Date: 2 Feb 2026                             │
├───────────────────────────────────────────────────────┤
│  EARNINGS                                             │
│  ───────────────────────────────────────────────      │
│  Basic Salary                           K 5,000.00    │
│  Overtime                               K   500.00    │
│  Allowances                             K   300.00    │
│                                                       │
│  GROSS PAY                              K 5,800.00    │
├───────────────────────────────────────────────────────┤
│  DEDUCTIONS                                           │
│  ───────────────────────────────────────────────      │
│  NAPSA (5%)                             K   250.00    │
│  PAYE                                   K   180.00    │
│  Health Insurance                       K    50.00    │
│                                                       │
│  TOTAL DEDUCTIONS                       K   480.00    │
├───────────────────────────────────────────────────────┤
│                                                       │
│     ┌─────────────────────────────────────────┐       │
│     │           NET PAY: K 5,320.00           │       │
│     │              Status: PAID ✓             │       │
│     └─────────────────────────────────────────┘       │
│                                                       │
├───────────────────────────────────────────────────────┤
│  [Company Name] • TPIN: 1234567890                    │
│  Generated: 2 Feb 2026 10:30 AM                       │
│  Powered by Omanut BMS                                │
└───────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/generate-whatsapp-document/index.ts` | Add payslip document type with PDF generation |
| `supabase/functions/bms-api-bridge/index.ts` | Update `handleMyPay` to return payroll_id; optionally add document request handlers |
| `supabase/functions/whatsapp-bms-handler/index.ts` | Auto-attach payslip PDF for `my_pay` intent |
| `supabase/functions/bms-intent-parser/index.ts` | Add parsing for `send_receipt`, `send_invoice`, `send_quotation` intents |

---

## Expected User Experience

**Before:**
```
User: my pay

Bot: 💰 Payslip - Jan 2026

💵 Gross: K 5,800
➖ Deductions: K 480
━━━━━━━━━━━━━━━━
💰 Net Pay: K 5,320

✅ Status: paid
📅 Paid: 02/02/2026
```

**After:**
```
User: my pay

Bot: 💰 Payslip - Jan 2026

💵 Gross: K 5,800
➖ Deductions: K 480
━━━━━━━━━━━━━━━━
💰 Net Pay: K 5,320

✅ Status: paid
📅 Paid: 02/02/2026

📎 [payslip-PS2026-0001.pdf]
```

The user receives the same text summary PLUS a professional PDF attachment they can download, forward, or print.

---

## Implementation Order

1. **Phase 1 - Payslip PDF (Priority)**
   - Add payslip generation to `generate-whatsapp-document`
   - Update `handleMyPay` to return necessary IDs
   - Add auto-attach logic in WhatsApp handler

2. **Phase 2 - On-Demand Document Requests**
   - Add `send_receipt`, `send_invoice`, `send_quotation`, `send_payslip` intents
   - Allow users to explicitly request documents by number

