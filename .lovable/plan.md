

# Softer Grace Period Strategy

You're right — permanently deleting all business data after just 5 days is harsh, especially for small businesses in markets where payment delays are common.

## Proposed Changes

### 1. Extend grace period to 30 days
Change from 5 days to 30 days before any data action occurs.

### 2. Replace permanent deletion with soft-archive
Instead of cascading `DELETE`, set an `archived_at` timestamp on the tenant. Archived tenants are invisible but recoverable for 90 days. Only after 90 days of archive does a final purge run.

### 3. Tiered warning system
- **Days 1-14**: Gentle reminder banner, full access continues but read-only after day 14
- **Days 15-30**: Non-dismissible modal, read-only mode (can view/export data but not create new records)
- **Day 30+**: Account archived, login blocked, data preserved 90 more days
- **Day 120**: Permanent purge

### 4. WhatsApp payment reminders
Send WhatsApp messages at day 1, 7, 14, and 25 to the owner's phone via the existing WhatsApp integration.

## Technical Changes

| File | Change |
|------|--------|
| `purge-expired-tenants` edge function | Change from `DELETE` to setting `archived_at`, extend to 30-day threshold. Add separate 120-day final purge. |
| `expire-subscriptions` edge function | Add `deactivated_at` timestamp if not already set |
| `SubscriptionRequiredModal` | Update countdown from 5 days to 30 days, soften language ("archived" not "deleted") |
| `SubscriptionActivationGate` | Add read-only mode for days 15-30 instead of full lockout |
| `TrialBanner` / `RenewalNoticeBanner` | Update messaging to reflect new timeline |
| Migration | Add `archived_at` column to `business_profiles`, add `is_read_only` computed logic |

## Updated Lifecycle

```text
Billing expires
  → Day 0:  Status = inactive, gentle banner
  → Day 14: Read-only mode enforced
  → Day 30: Account archived (hidden, not deleted)
  → Day 120: Permanent purge
```

This gives businesses 30 days to sort out payment issues, plus 90 more days where an admin could manually recover their data if they come back.

