

# AI Advisor: Document Import & Safe Actions
## Intelligent Document Processing via Chat for Pro/Enterprise Users

---

## Overview

This plan enables the Omanut Advisor to help users import documents conversationally. Users can upload documents (Word, PDF, images) directly in the chat, and the AI will extract structured data, show a preview, and let users approve the import - all without leaving the chat interface.

---

## How It Works

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                    CONVERSATIONAL DOCUMENT IMPORT                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  User: "I have a price list from my supplier"                           │
│        [Attaches PDF file]                                              │
│                                                                          │
│  Advisor:                                                                │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │  📄 I found 12 products in your document!                         │ │
│  │                                                                    │ │
│  │  Preview:                                                          │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │ SKU      │ Name           │ Price  │ Stock                   │ │ │
│  │  │──────────│────────────────│────────│───────                  │ │ │
│  │  │ PROD-001 │ Laptop Bag     │ K250   │ 50                      │ │ │
│  │  │ PROD-002 │ USB Cable      │ K35    │ 100                     │ │ │
│  │  │ ...      │ ...            │ ...    │ ...                     │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                    │ │
│  │  [Import to Inventory]  [Edit First]  [Cancel]                    │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
│  User: Clicks "Import to Inventory"                                     │
│                                                                          │
│  Advisor: "Done! I've added 12 products to your inventory. 🎉           │
│           You can find them in Inventory → Shop"                        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Plan-Gated Capabilities

| Capability | Starter | Pro | Enterprise |
|------------|---------|-----|------------|
| **Document Import via Chat** | Upgrade prompt | 5/day | Unlimited |
| **Schema Detection** (auto-detect inventory/employees/expenses) | - | Yes | Yes |
| **Inline Preview & Edit** | - | Yes | Yes |
| **Direct Import to Database** | - | Yes | Yes |
| **Live Business Awareness** (real-time updates) | Basic | Enhanced | Full |
| **Proactive Suggestions** (badge notifications) | - | Yes | Yes |

---

## 1. Chat File Upload Support

### Current State
The advisor chat only accepts text input.

### Enhancement
Add file upload capability to the chat input:

```text
┌────────────────────────────────────────────────────────────────────┐
│  Message input                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ Ask me anything...                           [📎] [➤ Send]  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                     ↑                               │
│                                  Attach file button                 │
│                                                                     │
│  Supported: .docx, .pdf, .jpg, .png                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Document Processing Flow

### Step 1: File Detection
When user attaches a file, the frontend:
1. Validates file type (Word, PDF, image)
2. Checks plan permissions (`document_import` feature)
3. Parses document using existing `parseDocument()` utility

### Step 2: Schema Detection
The AI analyzes the document to determine the target:
- **Inventory**: Product lists, price sheets, catalogs
- **Employees**: Staff rosters, HR documents
- **Customers**: Contact lists, client databases
- **Expenses**: Receipts, invoices, transaction logs

### Step 3: Extraction
Call the existing `document-to-csv` edge function with the detected schema.

### Step 4: Preview in Chat
Display extracted data in a structured card within the chat:
- Table preview of first 5 rows
- Valid/invalid row count
- Schema field labels

### Step 5: User Action
Three options presented as buttons:
1. **Import Now** - Inserts validated rows directly into the database
2. **Edit First** - Opens the full `ImportConverterModal` for detailed editing
3. **Cancel** - Discards the extraction

---

## 3. Inline Import Action Cards

### New Component: AdvisorImportCard

```text
┌─────────────────────────────────────────────────────────────────────┐
│  📄 DOCUMENT IMPORT                                                  │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                      │
│  Source: supplier-prices.pdf                                        │
│  Target: Inventory                                                   │
│  Records: 12 found (11 valid, 1 needs attention)                    │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ SKU        │ Name             │ Price   │ Stock                │ │
│  │────────────│──────────────────│─────────│──────                │ │
│  │ PROD-001   │ Laptop Bag       │ K250    │ 50                   │ │
│  │ PROD-002   │ USB Cable Type-C │ K35     │ 100                  │ │
│  │ PROD-003   │ Phone Case       │ K85     │ 75                   │ │
│  │ ...        │ (+ 9 more)       │         │                      │ │
│  └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ ✓ Import 11  │  │ ✎ Edit First │  │ ✗ Cancel     │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Real-Time Business Awareness

### New Hook: useAdvisorLiveContext

Subscribes to Supabase Realtime for key business events:

| Table | Event | Insight Example |
|-------|-------|-----------------|
| `sales_transactions` | INSERT | "You just made a K5,000 sale!" |
| `inventory` | UPDATE (low stock) | "Laptop bags hit 5 units - reorder?" |
| `invoices` | INSERT/UPDATE | "New invoice created: K12,000" |
| `payment_receipts` | INSERT | "Payment received: K3,500" |
| `custom_orders` | UPDATE | "Order CO2026-0015 moved to Production" |

### Notification Badge
When significant events occur while chat is closed:
- Badge shows count of new events
- Opening chat summarizes recent activity

---

## 5. Database Changes

### New Table: advisor_action_logs

Tracks all advisor-initiated actions for audit and usage limits:

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `tenant_id` | UUID | Tenant scope |
| `user_id` | UUID | Who initiated |
| `action_type` | TEXT | 'document_import', etc. |
| `action_params` | JSONB | File name, schema, row count |
| `action_result` | JSONB | Success/failure details |
| `success` | BOOLEAN | Whether action succeeded |
| `created_at` | TIMESTAMPTZ | Timestamp |

---

## 6. Files to Create

| File | Purpose |
|------|---------|
| `src/components/dashboard/AdvisorImportCard.tsx` | Document import preview card for chat |
| `src/components/dashboard/AdvisorFileUpload.tsx` | File attachment button for chat input |
| `src/hooks/useAdvisorLiveContext.ts` | Real-time business event subscriptions |
| `src/hooks/useAdvisorActions.ts` | Handle action execution and limit checking |
| Migration SQL | Create `advisor_action_logs` table |

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/OmanutAdvisor.tsx` | Add file upload, import cards, live badge |
| `src/lib/billing-plans.ts` | Add `ai_actions_daily` limit to plans |
| `supabase/functions/omanut-advisor/index.ts` | Add file processing context |

---

## 8. Usage Limit Enforcement

### Daily Limits by Plan

| Plan | Document Imports/Day | Other AI Actions |
|------|---------------------|------------------|
| Starter | 0 (upgrade prompt) | Read-only |
| Pro | 5 | 10 |
| Enterprise | Unlimited | Unlimited |

### Checking Limits

```typescript
// In useAdvisorActions.ts
async function canPerformAction(actionType: string): Promise<{
  allowed: boolean;
  remaining?: number;
  reason?: string;
}> {
  const { data: plan } = await supabase
    .from('business_profiles')
    .select('billing_plan')
    .eq('tenant_id', tenantId)
    .single();

  if (plan.billing_plan === 'starter') {
    return {
      allowed: false,
      reason: 'Document import is available on Pro and Enterprise plans'
    };
  }

  if (plan.billing_plan === 'enterprise') {
    return { allowed: true };
  }

  // Pro plan - check daily usage
  const today = new Date().toISOString().split('T')[0];
  const { count } = await supabase
    .from('advisor_action_logs')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('action_type', actionType)
    .gte('created_at', today);

  const limit = ACTION_LIMITS.pro[actionType] || 5;
  
  return {
    allowed: (count || 0) < limit,
    remaining: limit - (count || 0),
    reason: count >= limit ? 'Daily limit reached. Upgrade for unlimited actions.' : undefined
  };
}
```

---

## 9. Direct Import Execution

When user clicks "Import Now", the advisor:

1. **Validates** extracted data against schema
2. **Logs** the action to `advisor_action_logs`
3. **Inserts** records into the target table (inventory, employees, etc.)
4. **Reports** success with count and link to view records

```typescript
// In AdvisorImportCard.tsx
const handleImport = async () => {
  const { allowed, reason } = await canPerformAction('document_import');
  if (!allowed) {
    toast.error(reason);
    return;
  }

  // Insert to target table
  const { data, error } = await supabase
    .from(targetSchema) // 'inventory', 'employees', etc.
    .insert(validRows.map(row => ({
      ...row,
      tenant_id: tenantId,
    })));

  // Log the action
  await supabase.from('advisor_action_logs').insert({
    tenant_id: tenantId,
    user_id: userId,
    action_type: 'document_import',
    action_params: { fileName, schema: targetSchema, rowCount: validRows.length },
    action_result: { success: !error, insertedCount: data?.length || 0 },
    success: !error,
  });

  // Notify user
  onImportComplete(data.length);
};
```

---

## 10. UI Integration

### Chat Input Enhancement

```text
Before:
┌─────────────────────────────────────────────────────────────┐
│ Ask me anything...                                   [Send] │
└─────────────────────────────────────────────────────────────┘

After:
┌─────────────────────────────────────────────────────────────┐
│ Ask me anything...                            [📎]   [Send] │
└─────────────────────────────────────────────────────────────┘
                                                  ↑
                                   File upload (Pro/Enterprise)
```

### File Attachment Flow

1. User clicks 📎 → File picker opens
2. User selects document → Preview thumbnail appears
3. User optionally adds message → Clicks Send
4. Processing indicator shows → Import card appears

---

## 11. Example Conversation Flows

### Flow 1: Basic Document Import

**User**: "Here's my supplier's price list" [attaches price-list.pdf]

**Advisor**: *shows AdvisorImportCard*
"I found 15 products in your supplier's price list! Here's a preview..."
[Import Card with table, buttons]

**User**: Clicks "Import 15"

**Advisor**: "Done! 15 products added to your inventory. View them in Inventory → Shop"

---

### Flow 2: With Schema Detection

**User**: [attaches employee-roster.docx]

**Advisor**: "This looks like an employee list! I found 8 staff members with their roles and contact info. Should I add them to your HR system?"
[Import Card targeting employees table]

---

### Flow 3: Starter Plan User

**User**: [attaches invoice.pdf]

**Advisor**: "I can see you have an invoice document. Document import is available on Pro and Enterprise plans. Would you like to:
- Upgrade to Pro for AI-powered imports
- Add this manually (I'll guide you step by step)"

---

## 12. Testing Checklist

1. Pro user can attach a document in chat
2. Document is processed and preview shown in import card
3. "Import Now" inserts records and logs the action
4. "Edit First" opens ImportConverterModal with extracted data
5. Daily limit enforced for Pro users (5/day)
6. Enterprise users have unlimited imports
7. Starter users see upgrade prompt
8. Real-time badge shows when new events occur
9. Invalid rows are flagged in preview
10. Import success message includes record count

