

# Fix Upgrade Plan Modal - Downgrade Feature & Badge Overlap

## Issues to Fix

### 1. "Most Popular" and "Current Plan" badges overlap
Looking at the screenshot, when the user is on the Pro plan (which is marked as `popular: true`), both badges render at the same position (`absolute -top-3 left-1/2 -translate-x-1/2`), causing them to overlap.

### 2. No downgrade option
Currently, the downgrade button just says "Downgrade not available" - we need to enable downgrades but show users what features they'll lose.

---

## Solution

### Fix 1: Badge Positioning Logic

Change the badge logic so that:
- If a plan is BOTH popular AND current → show only "Current Plan" badge
- If a plan is popular but not current → show "Most Popular" badge
- If a plan is current but not popular → show "Current Plan" badge

This prevents overlap while prioritizing the "Current Plan" indicator.

```typescript
{/* Popular Badge - Only show if NOT current plan */}
{planData.popular && !isCurrent && (
  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
    Most Popular
  </Badge>
)}

{/* Current Badge */}
{isCurrent && (
  <Badge variant="outline" className="absolute -top-3 left-1/2 -translate-x-1/2 border-primary text-primary">
    Current Plan
  </Badge>
)}
```

### Fix 2: Enable Downgrade with Feature Loss Warning

Replace the disabled "Downgrade not available" button with an actionable flow that:

1. Shows a "Downgrade to X" button
2. Opens a confirmation dialog showing what features they'll lose
3. Lists the specific features/limits that will be reduced
4. Requires confirmation before proceeding

**New UI Flow:**
- Lower-tier plan cards show "Downgrade to {Plan}" button
- Clicking opens a warning modal with:
  - "You'll lose access to:" + list of features
  - "Your limits will be reduced:" + specific numbers
  - Confirm / Cancel buttons

**Feature Comparison Logic:**
```typescript
// Get features the user will LOSE by downgrading
const getLostFeatures = (fromPlan: BillingPlan, toPlan: BillingPlan) => {
  const from = plans[fromPlan];
  const to = plans[toPlan];
  const lost: string[] = [];
  
  // Check features
  Object.entries(from.features).forEach(([key, enabled]) => {
    if (enabled && !to.features[key]) {
      lost.push(featureLabels[key]);
    }
  });
  
  // Check limits
  if (from.limits.users > to.limits.users) {
    lost.push(`Team size reduced from ${from.limits.users} to ${to.limits.users}`);
  }
  if (from.limits.inventoryItems > to.limits.inventoryItems) {
    lost.push(`Inventory limit reduced from ${from.limits.inventoryItems} to ${to.limits.inventoryItems}`);
  }
  
  return lost;
};
```

---

## Implementation Details

### New State for Downgrade Confirmation
```typescript
const [downgradeTarget, setDowngradeTarget] = useState<BillingPlan | null>(null);
const [showDowngradeWarning, setShowDowngradeWarning] = useState(false);
```

### Downgrade Warning Dialog Content
```text
┌────────────────────────────────────────────────┐
│ ⚠️ Confirm Downgrade to Starter               │
│                                                │
│ You'll lose access to:                         │
│ ❌ HR & Payroll (NAPSA, PAYE, NHIMA)          │
│ ❌ Agent network & distribution               │
│ ❌ Impact reporting & certificates            │
│ ❌ Website & CMS management                   │
│ ❌ Advanced accounting suite                  │
│ ❌ AI Teaching Mode                           │
│ ❌ Document import AI                         │
│                                                │
│ Your limits will be reduced:                   │
│ • Team members: 10 → 1                        │
│ • Inventory items: 1,000 → 100                │
│ • WhatsApp messages: 500 → 30/month           │
│                                                │
│ Changes take effect at end of billing cycle.  │
│                                                │
│     [Cancel]     [Confirm Downgrade]          │
└────────────────────────────────────────────────┘
```

### CTA Button Logic Update
```typescript
{isCurrent ? (
  <Button variant="outline" className="w-full" disabled>
    Current Plan
  </Button>
) : planKey === "enterprise" ? (
  <Button onClick={handleContactSales}>Contact Sales</Button>
) : isUpgradeOption ? (
  <Button onClick={() => handleUpgrade(planKey)}>
    Upgrade to {planData.label}
  </Button>
) : (
  // DOWNGRADE - Show warning first
  <Button 
    variant="outline" 
    className="w-full text-amber-600 border-amber-600 hover:bg-amber-50"
    onClick={() => handleDowngradeClick(planKey)}
  >
    <ArrowDown className="w-4 h-4 mr-2" />
    Downgrade to {planData.label}
  </Button>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/UpgradePlanModal.tsx` | Fix badge overlap, add downgrade flow with confirmation dialog |

---

## Technical Summary

1. **Badge fix**: Add `&& !isCurrent` condition to "Most Popular" badge
2. **Downgrade button**: Replace disabled button with actionable "Downgrade to X"
3. **Warning dialog**: New AlertDialog showing lost features and reduced limits
4. **Feature comparison**: Helper function to compute what changes between plans
5. **Proceed flow**: On confirm, navigate to `/pay?plan={planKey}&action=downgrade`

The downgrade itself would be processed the same way as an upgrade (via the payment/subscription system), but users are informed upfront about what they're giving up.

