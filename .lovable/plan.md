

# Fix PDF Cropping on Long Invoices, Quotations & Receipts

## Problem
All three document modals (Invoice, Quotation, Receipt) render the entire document as a single image and squeeze it onto one A4 page. When a document has many line items, the content either shrinks to unreadable size or gets cut off at the bottom.

## Solution
Create a shared **multi-page PDF utility** that slices the rendered canvas into A4-sized pages with proper margins, then update all three modals to use it.

## New File: `src/lib/pdf-utils.ts`
A reusable `exportElementToPDF` function that:
1. Clones the target element at a fixed width (600px) for consistent rendering
2. Renders it via `html2canvas` with image preloading
3. Calculates how many A4 pages the content spans
4. Slices the canvas into page-height chunks, adding each as a separate page in jsPDF
5. Returns or saves the PDF

Core logic:
- A4 content area = 210mm wide, 297mm tall, with 10mm margins
- Scale rendered canvas width to fit A4 content width
- Loop through canvas in page-height pixel increments, drawing each slice onto a new PDF page

## Files to Update

### `src/components/dashboard/InvoiceViewModal.tsx`
Replace the `handleDownloadPDF` function (lines 109-159) with a call to the shared utility.

### `src/components/dashboard/QuotationViewModal.tsx`
Replace the `handleDownloadPDF` function (lines 92-131) with a call to the shared utility.

### `src/components/dashboard/SalesReceiptModal.tsx`
Replace the `handleDownloadPDF` function (lines 101-153) with a call to the shared utility.

### Bonus: Other modals using the same broken pattern
The same fix applies to `ExpenseViewModal`, `ForumViewModal`, `DonationRequestViewModal`, `CashFlowStatement`, `ReceiptModal`, and all financial report exports. These will also be updated to use the shared utility, preventing the same cropping issue everywhere.

## No database changes needed.

