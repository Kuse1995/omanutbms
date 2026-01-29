
# Enhanced Usage Analytics for Super Admin

## Overview
This plan implements comprehensive feature usage tracking and advanced analytics to give super admins deep insights into how users interact with the platform, which features are most valuable, and who the most active users are.

## Current State Analysis
- **Existing infrastructure**: `feature_usage_logs` table exists but is not being used (0 records)
- **`useFeatureTracking` hook** exists but isn't integrated into any components
- **`audit_log` table** has rich activity data (5,349+ sales_transactions, 504 receipts, 356 invoices, etc.) with `changed_by` user tracking
- **Current dashboard** shows tenant-level metrics but lacks:
  - Per-user activity tracking
  - Feature usage heatmaps
  - Time-based activity patterns
  - User engagement scoring

## Implementation Plan

### Phase 1: Database Schema Enhancements

Create new tables and views for analytics:

```text
+---------------------------+
| user_activity_summary     |  (materialized view)
+---------------------------+
| user_id                   |
| tenant_id                 |
| total_actions             |
| last_active_at            |
| most_used_feature         |
| engagement_score          |
+---------------------------+

+---------------------------+
| feature_usage_logs        |  (existing - add indexes)
+---------------------------+
| + page_path (new column)  |
| + session_id (new column) |
+---------------------------+
```

**Database changes:**
1. Add `page_path` and `session_id` columns to `feature_usage_logs`
2. Create optimized indexes for analytics queries
3. Create database function to calculate engagement scores

### Phase 2: Feature Tracking Integration

Instrument key components to track usage:

| Module | Events to Track |
|--------|-----------------|
| Dashboard Home | `view`, time spent |
| Sales Recorder | `create`, `view`, `export` |
| Inventory Manager | `create`, `update`, `import` |
| Invoices Manager | `create`, `export`, `send` |
| HR/Payroll | `view`, `run_payroll` |
| Receipts | `create`, `print` |
| AI Advisor | `query`, `import`, `action` |
| Reports | `generate`, `export` |

**Implementation approach:**
- Create a wrapper hook `useTrackedNavigation` that auto-tracks page views
- Add tracking calls to key action handlers (e.g., `recordSale`, `createInvoice`)
- Track export/generate actions separately for engagement scoring

### Phase 3: Enhanced Analytics Dashboard

Add new tabs and visualizations to `UsageAnalyticsDashboard.tsx`:

#### 3.1 New "User Activity" Tab
- **Top Active Users Table**: Ranked list showing:
  - User name, email, tenant
  - Total actions (last 30 days)
  - Primary feature used
  - Last active timestamp
  - Engagement score (calculated metric)

- **User Activity Timeline**: Chart showing daily active users over time

#### 3.2 New "Feature Insights" Tab
- **Feature Usage Heatmap**: Grid showing which features are used when (hour of day vs. day of week)
- **Feature Popularity Ranking**: Bar chart with usage counts per feature
- **Feature Adoption Funnel**: Visualization showing progression from sign-up to feature activation

#### 3.3 Enhanced "Overview" Tab
- **Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)** KPI cards
- **User Retention Rate** metric
- **Feature Stickiness** score (returning users per feature)

### Phase 4: Engagement Scoring System

Create a weighted scoring algorithm:

```text
Engagement Score = 
  (Sales Created × 5) + 
  (Invoices Created × 4) + 
  (Inventory Actions × 3) + 
  (Reports Generated × 4) + 
  (Receipts Issued × 2) + 
  (AI Advisor Queries × 3) + 
  (Days Active × 10)
```

**Score Categories:**
- **Power User**: 500+ points
- **Active User**: 200-499 points  
- **Regular User**: 50-199 points
- **Low Engagement**: <50 points

## Technical Details

### Files to Create
1. `src/components/dashboard/UserActivityTab.tsx` - New user activity analytics component
2. `src/components/dashboard/FeatureInsightsTab.tsx` - Feature usage insights
3. `src/hooks/useTrackedNavigation.ts` - Auto-tracking wrapper hook

### Files to Modify
1. `src/components/dashboard/UsageAnalyticsDashboard.tsx` - Add new tabs and integrate new components
2. `src/hooks/useFeatureTracking.ts` - Enhance with page path and session tracking
3. `src/components/dashboard/DashboardSidebar.tsx` - Integrate navigation tracking
4. `src/components/dashboard/SalesRecorder.tsx` - Add action tracking
5. `src/components/dashboard/InvoicesManager.tsx` - Add action tracking
6. `src/components/dashboard/SmartInventory.tsx` - Add action tracking
7. `src/components/dashboard/OmanutAdvisor.tsx` - Add query tracking

### Database Migrations
1. Add new columns to `feature_usage_logs`
2. Create index for analytics performance
3. Create engagement score calculation function

### Data Flow Diagram

```text
User Action (click, create, export)
       │
       ▼
useFeatureTracking.trackFeatureUsage()
       │
       ▼
feature_usage_logs (insert)
       │
       ▼
Super Admin Dashboard (query with aggregations)
       │
       ▼
Visualizations (charts, tables, scores)
```

## Expected Outcomes

After implementation, super admins will be able to:
1. **Identify power users** - See who uses the system most actively
2. **Understand feature value** - Know which features drive engagement
3. **Spot inactive tenants** - Proactively reach out to re-engage
4. **Optimize the product** - Focus development on high-value features
5. **Track adoption trends** - Monitor feature rollout success over time

## Implementation Order

1. Database schema changes (migration)
2. Enhanced tracking hook
3. Instrument key components with tracking
4. Build User Activity tab
5. Build Feature Insights tab  
6. Add engagement scoring
7. Update Overview tab with new KPIs
