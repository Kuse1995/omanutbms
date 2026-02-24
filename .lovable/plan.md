

# Speed Up the System

## Problem

The application loads all dashboard tab components eagerly at startup and makes redundant/unoptimized database queries, causing slow initial loads and sluggish tab switches -- especially on the inventory page with 3,000+ items.

## Changes

### 1. Lazy-load Dashboard Tab Components

Currently, `Dashboard.tsx` eagerly imports **27 heavy components** (InventoryAgent, SalesRecorder, AccountsAgent, etc.) even though only one tab is visible at a time. Converting these to `React.lazy()` with dynamic imports will dramatically reduce the initial bundle size.

**File:** `src/pages/Dashboard.tsx`
- Replace all static imports of tab components with `React.lazy(() => import(...))` calls
- Wrap `renderContent()` output in `<Suspense>` with a loading spinner fallback

### 2. Lazy-load Page Routes

Similarly, `App.tsx` eagerly imports all 15+ page components. Converting non-critical routes (Blog, Pricing, Donate, etc.) to lazy imports reduces the initial JS payload.

**File:** `src/App.tsx`
- Keep `Index` and `Auth` as eager imports (critical paths)
- Lazy-load everything else: Dashboard, Blog, Products, About, etc.
- Add `<Suspense>` wrapper around `<AnimatedRoutes />`

### 3. Optimize Inventory Queries -- Select Only Needed Columns

The branch inventory query uses `inventory:inventory_id(*)` which fetches **every column** including heavy fields like `features`, `certifications`, `technical_specs`, and `description`. The table only displays a handful of fields.

**File:** `src/components/dashboard/InventoryAgent.tsx`
- Change `inventory:inventory_id(*)` to select only required columns:
  `inventory:inventory_id(id, sku, name, current_stock, wholesale_stock, unit_price, cost_price, original_price, reorder_level, image_url, category, status, item_type, inventory_class, unit_of_measure, default_location_id, is_archived)`
- Same targeted select for the global query (replace `*` with explicit columns)

### 4. Parallelize Independent Queries

`InventoryAgent.fetchInventory()` runs the count query, then the data query, then the variant counts query **sequentially**. These are independent and can run in parallel.

**File:** `src/components/dashboard/InventoryAgent.tsx`
- Use `Promise.all()` to run count + data + variant queries simultaneously
- Same pattern for `DashboardHome.fetchMetrics()` -- parallelize the 6+ independent metric queries with `Promise.all()`

**File:** `src/components/dashboard/DashboardHome.tsx`
- Wrap the independent supabase queries (inventory, invoices, agents, receipts, livestock) in `Promise.all()`

### 5. Prevent Redundant Fetches on Tab Switch

Every time the user switches away from inventory and back, `fetchInventory` re-runs from scratch because the component remounts. Adding a simple cache or using React Query would help, but the quickest win is to keep the component mounted.

**File:** `src/pages/Dashboard.tsx`
- For the active tab rendering, use CSS display toggling (`display: none`) for previously-visited heavy tabs (inventory, sales, accounts) instead of unmounting them, OR simply rely on the lazy loading + Suspense which already provides a much better UX

## Expected Impact

- **Initial load**: ~60-70% less JavaScript parsed upfront (lazy loading)
- **Inventory page**: ~40% faster data fetch (parallel queries + targeted columns)
- **Dashboard home**: ~50% faster metrics load (parallel queries)
- **Tab switching**: Smoother transitions with Suspense fallbacks

## Technical Summary

```
Files to modify:
  src/App.tsx                              - Lazy route imports
  src/pages/Dashboard.tsx                  - Lazy tab imports + Suspense
  src/components/dashboard/InventoryAgent.tsx - Column targeting + Promise.all
  src/components/dashboard/DashboardHome.tsx  - Promise.all for metrics
  src/components/dashboard/SmartInventory.tsx - Column targeting + Promise.all
```

No database migrations needed. No new dependencies.

