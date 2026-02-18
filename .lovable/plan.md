
# Make the Training Centre More Effective for Teaching

## What's Missing Right Now

The current system is a good **tracker** — you can mark things as taught and add notes. But it doesn't actively help you **teach**. When you sit with a user in front of the system, you need:

1. A step-by-step guide on **what to actually show them** and in what order
2. A way to **verify** the user understood — not just that you covered it
3. Quick reference **talking points** for each feature (so you don't forget anything important)
4. A clear sense of **what to focus on next** based on what's pending

This plan upgrades the Training Session View to be a genuine teaching companion.

---

## The Enhancements

### 1. Teaching Script per Feature (Talking Points)
Each checklist item gets a built-in "trainer guide" — a short expandable panel that shows:
- **What to demo**: The exact steps to walk through (e.g., "Go to Sales → Click New Sale → show the product search, quantity, and payment method")
- **What to ask the user to do**: A hands-on task they should perform themselves to confirm understanding
- **Common mistakes to watch for**

This is stored as static content in the `CORE_FEATURES` / `ADDON_FEATURES` config arrays (no database needed — it's training knowledge, not user data).

### 2. Verification Step — "Did They Do It?"
Currently clicking the status button cycles through: Pending → Taught → Needs Practice → Skipped.

The upgrade: When you click "Mark as Taught", a small confirmation appears inline:
- "Did the user complete the hands-on task?" → **Yes** (marks Taught) / **Needs more time** (marks Needs Practice)

This forces a deliberate decision rather than an accidental click.

### 3. Session Focus Mode
Add a "Start Teaching" mode that:
- Shows one feature at a time, full-width, with the teaching script prominently displayed
- Has Prev / Next navigation between features
- Shows which features are still pending (so you can work through them in order)
- Can be exited back to the checklist overview at any time

This turns the interface from a passive tracker into an active teaching workflow.

### 4. Recommended Teaching Order
Re-order the checklist items so they flow naturally (e.g., Dashboard → Customers → Sales → Receipts → Quotations → Accounting). Currently the order is whatever was inserted first. The fix: add a `sort_order` field to the feature definitions and use it when seeding checklist items.

### 5. Quick-Start Tips Banner
At the top of the session, a collapsible "Trainer Tips" card with practical guidance:
- "Start with a real scenario — use the user's actual business data"
- "Let them navigate, don't click for them"
- "Teach one module fully before moving to the next"
- "End every feature with: Can you show me how to do that again?"

---

## What Does NOT Change

- The database schema stays the same (no migration needed)
- The status cycling system stays
- The notes fields stay
- Export summary stays
- Session history stays
- RLS policies stay

---

## Technical Details

### Files to Modify

**1. `src/components/dashboard/TrainingCoachingCenter.tsx`**
- Add `teachingGuide` field to each feature in `CORE_FEATURES` and `ADDON_FEATURES`:
  ```typescript
  {
    key: "sales_transactions",
    label: "Recording sales & transactions",
    group: "Core",
    sort_order: 2,
    teachingGuide: {
      demo: ["Navigate to Sales in the sidebar", "Click 'New Sale'", "Search for a product, set quantity", "Choose payment method and complete"],
      userTask: "Ask the user to record a sale for any product in their inventory",
      watchFor: "Check they understand the difference between cash and credit sales"
    }
  }
  ```
- Pass the feature guide data into `TrainingSessionView` via a lookup map (keyed by `feature_key`)

**2. `src/components/dashboard/TrainingSessionView.tsx`**
- Accept a `featureGuides` prop (a `Record<string, TeachingGuide>`)
- In the expanded item view, show the teaching guide above the notes fields:
  - Demo steps as a numbered list
  - User task in an amber callout box
  - Watch-for note in a subtle tip
- Add "Focus Mode" — a `focusModeItem` state; when set, renders a single full-width teaching panel instead of the list
- Add Prev / Next buttons in focus mode
- Add the "Trainer Tips" collapsible card at the top of the session
- Replace the current status button click with a two-step: click opens a small inline confirmation (two buttons) instead of cycling immediately

### No Database Migration Required
All teaching guide content is static in the frontend config. No new tables, no new columns.

### Component Structure After Change

```text
TrainingSessionView
├── Trainer Tips Card (collapsible, shown once at session start)
├── Progress Bar Card (unchanged)
├── Overall Notes Card (unchanged)
├── [Focus Mode] Single-feature teaching panel  ← NEW
│   ├── Feature name + status badge
│   ├── Demo steps (numbered list)
│   ├── User Task callout
│   ├── Watch-For tip
│   ├── Notes fields (trainer + improvement)
│   └── Prev / Next / Exit Focus Mode buttons
├── [List Mode] Grouped checklist  ← existing, enhanced
│   └── Each item expanded view now shows teaching guide
└── Action buttons (unchanged)
```

### Teaching Guide Coverage
All 8 core features + all add-on features get a teaching guide. The guide for each covers the real workflow in the actual BMS system, based on the feature's actual navigation path and purpose.
