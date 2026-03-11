
Goal: make existing job cards truly editable, especially the Customer and Work sections shown in the screenshot.

What I found:
- The Customer and Work tabs already render editable inputs in `src/components/dashboard/JobCardModal.tsx`.
- The likely reason users feel they “cannot amend” them is that saving an edited job card is broken.
- In the update mutation, the payload always sends:
  - `tenant_id: tenantId`
  - `job_number: ''`
- That is risky for edits because `job_number` is supposed to stay as the database-generated value. Sending an empty string on update can fail the update or break uniqueness logic, so changes made in Customer/Work appear not to save.

Implementation plan:
1. Fix the update payload in `JobCardModal.tsx`
   - Build one base payload for editable fields only.
   - On create: include `tenant_id` and let the database generate the job number.
   - On edit: do not send `job_number` and do not resend immutable system fields unless required.
2. Keep Customer and Work fields fully editable
   - Preserve the current customer override fields (`customer_name`, `customer_phone`).
   - Ensure diagnosis, status, assigned technician, dates, and notes are part of the update payload.
3. Improve error visibility
   - Show the real backend error message in the destructive toast for failed updates so users/admins can tell exactly why a save failed.
4. Validate the manager list view behavior
   - Confirm `JobCardsManager.tsx` continues to read the saved edited values and shows the updated customer/work-related data after refresh.
5. Test flow to verify fix
   - Open an existing job card.
   - Change fields in Customer and Work.
   - Save and confirm values persist after modal close/reopen.

Files to change:
- `src/components/dashboard/JobCardModal.tsx`
- Possibly `src/components/dashboard/JobCardsManager.tsx` only if any displayed fallback logic needs adjustment

Expected result:
- Users will be able to edit existing job cards and successfully save changes made in the Customer and Work tabs.
- The job number remains unchanged during edits, and updates should stop failing silently.
