

# Fix Quotation Number Generation

## The Problem

The quotation number generator crashes when trying to create new quotations. The database contains quotation numbers with "-DUP" suffixes (e.g., `Q2026-0001-DUP3`, `Q2026-0001-DUP88`). The current function uses a simple `SUBSTRING` to extract the sequence number, which fails because it tries to cast `0001-DUP3` as an integer.

The receipt (`generate_receipt_number`) and sale (`generate_sale_number`) generators were already updated to handle this using `regexp_replace`, but the quotation generator was missed.

## The Fix

A single database migration to update the `generate_quotation_number` function to use the same robust pattern already in place for receipts and sales:

- Strip the prefix (`Q2026-`) using `regexp_replace`
- Strip any non-digit trailing characters (`-DUP3`, etc.) using a second `regexp_replace`
- Scope the sequence to the current tenant for proper numbering
- Add a guard so manually-set quotation numbers are not overwritten

No frontend code changes needed.

## Technical Details

```text
-- Updated function logic (same pattern as generate_receipt_number)
IF NEW.quotation_number IS NOT NULL AND NEW.quotation_number != '' THEN
  RETURN NEW;  -- Keep manually-set numbers
END IF;

year_prefix := 'Q' || to_char(CURRENT_DATE, 'YYYY');

SELECT COALESCE(MAX(
  CAST(
    regexp_replace(
      regexp_replace(quotation_number, '^Q\d{4}-', ''),
      '[^0-9].*$', ''
    ) AS integer
  )
), 0) + 1
INTO next_number
FROM public.quotations
WHERE quotation_number LIKE year_prefix || '-%'
  AND tenant_id = NEW.tenant_id;

NEW.quotation_number := year_prefix || '-' || LPAD(next_number::text, 4, '0');
```

Similarly, the `generate_invoice_number` function has the same vulnerability and should be updated preventatively.

### Files changed
- One new database migration file (no app code changes)
