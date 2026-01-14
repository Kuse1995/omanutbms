import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DocumentRequest {
  document_type: 'receipt' | 'invoice' | 'quotation';
  document_id?: string;
  document_number?: string;
  tenant_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { document_type, document_id, document_number, tenant_id }: DocumentRequest = await req.json();

    if (!document_type || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'document_type and tenant_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[generate-whatsapp-document] Generating ${document_type}:`, { document_id, document_number, tenant_id });

    // Fetch the document data based on type
    let documentData: any;
    let items: any[] = [];
    let actualDocNumber: string;

    if (document_type === 'receipt') {
      // First try to find in payment_receipts
      let query = supabase
        .from('payment_receipts')
        .select('*')
        .eq('tenant_id', tenant_id);
      
      if (document_id) {
        query = query.eq('id', document_id);
      } else if (document_number) {
        // Use exact match first, then fallback to ilike
        query = query.eq('receipt_number', document_number);
      } else {
        query = query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query.maybeSingle();
      
      if (data) {
        console.log('[generate-whatsapp-document] Found receipt in payment_receipts:', data.receipt_number);
        documentData = data;
        actualDocNumber = data.receipt_number;

        // If receipt is linked to an invoice, get invoice items
        if (data.invoice_id) {
          const { data: invoiceItems } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', data.invoice_id);
          items = invoiceItems || [];
        } else {
          // Try to get items from sales_transactions with same receipt number
          const { data: salesItems } = await supabase
            .from('sales_transactions')
            .select('product_name, quantity, unit_price_zmw, total_amount_zmw')
            .eq('tenant_id', tenant_id)
            .eq('receipt_number', data.receipt_number);
          
          if (salesItems && salesItems.length > 0) {
            items = salesItems.map((item: any) => ({
              description: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price_zmw,
              amount: item.total_amount_zmw,
            }));
          }
        }
      } else {
        // FALLBACK: Try to find in sales_transactions if no payment_receipt exists
        console.log('[generate-whatsapp-document] Receipt not found in payment_receipts, trying sales_transactions fallback');
        
        let txQuery = supabase
          .from('sales_transactions')
          .select('*')
          .eq('tenant_id', tenant_id);
        
        if (document_number) {
          txQuery = txQuery.eq('receipt_number', document_number);
        } else {
          txQuery = txQuery.order('created_at', { ascending: false }).limit(1);
        }

        const { data: txData, error: txError } = await txQuery;

        if (txError || !txData || txData.length === 0) {
          console.error('[generate-whatsapp-document] Receipt not found in any table:', { document_number, error, txError });
          return new Response(
            JSON.stringify({ error: 'Receipt not found', details: 'No matching receipt in payment_receipts or sales_transactions' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Build receipt data from sales_transactions
        const firstTx = txData[0];
        actualDocNumber = firstTx.receipt_number || `TX-${firstTx.id.substring(0, 8)}`;
        
        const totalAmount = txData.reduce((sum: number, tx: any) => sum + (tx.total_amount_zmw || 0), 0);
        
        documentData = {
          receipt_number: actualDocNumber,
          client_name: firstTx.customer_name || 'Walk-in Customer',
          payment_date: firstTx.created_at,
          amount_paid: totalAmount,
          payment_method: firstTx.payment_method,
          notes: firstTx.notes,
        };

        items = txData.map((tx: any) => ({
          description: tx.product_name,
          quantity: tx.quantity,
          unit_price: tx.unit_price_zmw,
          amount: tx.total_amount_zmw,
        }));

        console.log('[generate-whatsapp-document] Built receipt from sales_transactions:', actualDocNumber);
      }

    } else if (document_type === 'invoice') {
      const query = supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenant_id);
      
      if (document_id) {
        query.eq('id', document_id);
      } else if (document_number) {
        query.ilike('invoice_number', `%${document_number}%`);
      } else {
        query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query.single();
      if (error || !data) {
        console.error('Invoice not found:', error);
        return new Response(
          JSON.stringify({ error: 'Invoice not found', details: error?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      documentData = data;
      actualDocNumber = data.invoice_number;

      // Get invoice items
      const { data: invoiceItems } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', data.id);
      items = invoiceItems || [];

    } else if (document_type === 'quotation') {
      const query = supabase
        .from('quotations')
        .select('*')
        .eq('tenant_id', tenant_id);
      
      if (document_id) {
        query.eq('id', document_id);
      } else if (document_number) {
        query.ilike('quotation_number', `%${document_number}%`);
      } else {
        query.order('created_at', { ascending: false }).limit(1);
      }

      const { data, error } = await query.single();
      if (error || !data) {
        console.error('Quotation not found:', error);
        return new Response(
          JSON.stringify({ error: 'Quotation not found', details: error?.message }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      documentData = data;
      actualDocNumber = data.quotation_number;

      // Get quotation items
      const { data: quotationItems } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', data.id);
      items = quotationItems || [];
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid document_type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch business profile for branding
    const { data: businessProfile } = await supabase
      .from('business_profiles')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single();

    const companyName = businessProfile?.company_name || 'Company';
    const companyAddress = businessProfile?.company_address || '';
    const companyPhone = businessProfile?.company_phone || '';
    const companyEmail = businessProfile?.company_email || '';
    const logoUrl = businessProfile?.logo_url || null;

    console.log('[generate-whatsapp-document] Generating PDF for:', actualDocNumber, 'with', items.length, 'items');

    // Generate PDF content
    const pdfContent = generatePDFContent(
      document_type,
      documentData,
      items,
      { companyName, companyAddress, companyPhone, companyEmail, logoUrl }
    );

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${document_type}-${actualDocNumber}-${timestamp}.pdf`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp-documents')
      .upload(filename, pdfContent, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload document', details: uploadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('whatsapp-documents')
      .getPublicUrl(filename);

    console.log('[generate-whatsapp-document] Document generated successfully:', publicUrl.publicUrl);

    return new Response(
      JSON.stringify({
        success: true,
        document_type,
        document_number: actualDocNumber,
        url: publicUrl.publicUrl,
        filename,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Generate document error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generatePDFContent(
  docType: string,
  data: any,
  items: any[],
  company: { companyName: string; companyAddress: string; companyPhone: string; companyEmail: string; logoUrl?: string | null }
): Uint8Array {
  const title = docType.toUpperCase();
  let docNumber = '';
  let clientName = '';
  let docDate = '';
  let totalAmount = 0;
  let paymentMethod = '';
  let notes = '';

  if (docType === 'receipt') {
    docNumber = data.receipt_number;
    clientName = data.client_name || 'Walk-in Customer';
    docDate = formatDate(data.payment_date);
    totalAmount = data.amount_paid || 0;
    paymentMethod = formatPaymentMethod(data.payment_method);
    notes = data.notes || '';
  } else if (docType === 'invoice') {
    docNumber = data.invoice_number;
    clientName = data.client_name;
    docDate = formatDate(data.invoice_date);
    totalAmount = data.total_amount;
    notes = data.notes || '';
  } else if (docType === 'quotation') {
    docNumber = data.quotation_number;
    clientName = data.client_name;
    docDate = formatDate(data.quotation_date);
    totalAmount = data.total_amount;
    notes = data.notes || '';
  }

  // Generate styled HTML that will look like the BMS receipt
  const html = generateStyledHTML(docType, {
    docNumber,
    clientName,
    docDate,
    totalAmount,
    paymentMethod,
    notes,
    items,
    company
  });

  // Convert HTML to a properly formatted PDF
  const pdfBytes = createHTMLPDF(html, title, docNumber);
  
  return pdfBytes;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function formatPaymentMethod(method: string | null): string {
  if (!method) return 'Cash';
  return method
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function formatCurrency(amount: number): string {
  return `K ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function generateStyledHTML(docType: string, params: {
  docNumber: string;
  clientName: string;
  docDate: string;
  totalAmount: number;
  paymentMethod: string;
  notes: string;
  items: any[];
  company: { companyName: string; companyAddress: string; companyPhone: string; companyEmail: string; logoUrl?: string | null };
}): string {
  const { docNumber, clientName, docDate, totalAmount, paymentMethod, notes, items, company } = params;
  
  const docTitle = docType === 'receipt' ? 'PAYMENT RECEIPT' : 
                   docType === 'invoice' ? 'INVOICE' : 'QUOTATION';
  
  const contactInfo = [company.companyEmail, company.companyPhone].filter(Boolean).join(' | ');
  
  // Build items table rows
  const itemRows = items.length > 0 ? items.map((item, idx) => {
    const qty = item.quantity || 1;
    const price = item.unit_price || item.amount || 0;
    const desc = item.description || item.item_name || 'Item';
    const lineTotal = qty * price;
    return `
      <tr>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e5e7eb; text-align: left;">${desc}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e5e7eb; text-align: center;">${qty}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(price)}</td>
        <td style="padding: 8px 4px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(lineTotal)}</td>
      </tr>
    `;
  }).join('') : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 11px; 
      color: #333; 
      line-height: 1.4;
      padding: 40px;
      max-width: 612px;
    }
    .header { text-align: center; border-bottom: 2px solid #004B8D; padding-bottom: 15px; margin-bottom: 20px; }
    .doc-title { font-size: 20px; font-weight: bold; color: #004B8D; margin-bottom: 5px; }
    .doc-number { font-size: 12px; color: #666; margin-bottom: 10px; }
    .company-name { font-size: 14px; font-weight: bold; color: #333; }
    .company-tagline { font-size: 10px; color: #666; margin-top: 3px; }
    .company-contact { font-size: 9px; color: #888; margin-top: 3px; }
    .amount-box { 
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); 
      text-align: center; 
      padding: 20px; 
      border-radius: 8px; 
      margin: 20px 0; 
    }
    .amount-label { font-size: 11px; color: #666; margin-bottom: 5px; }
    .amount-value { font-size: 28px; font-weight: bold; color: #16a34a; }
    .info-section { margin: 15px 0; }
    .info-row { 
      display: flex; 
      justify-content: space-between; 
      padding: 8px 0; 
      border-bottom: 1px solid #f3f4f6; 
    }
    .info-label { color: #666; }
    .info-value { font-weight: 500; text-align: right; }
    .items-title { font-weight: 600; color: #374151; margin: 15px 0 10px 0; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { 
      background: #f9fafb; 
      padding: 10px 4px; 
      text-align: left; 
      font-weight: 600; 
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    th:nth-child(2), th:nth-child(3), th:nth-child(4) { text-align: center; }
    th:last-child { text-align: right; }
    .total-row { 
      font-weight: bold; 
      font-size: 12px;
    }
    .total-row td { 
      padding: 12px 4px; 
      border-top: 2px solid #e5e7eb;
    }
    .total-value { color: #16a34a; }
    .footer { 
      margin-top: 25px; 
      padding-top: 15px; 
      border-top: 1px solid #e5e7eb; 
      text-align: center; 
      color: #9ca3af; 
      font-size: 9px; 
    }
    .thank-you { color: #666; margin-bottom: 5px; font-size: 10px; }
    .notes-section { 
      background: #f9fafb; 
      padding: 10px; 
      border-radius: 6px; 
      margin-top: 15px; 
      font-size: 10px; 
    }
    .notes-label { font-weight: 600; color: #374151; }
    .notes-text { color: #666; margin-top: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="doc-title">${docTitle}</div>
    <div class="doc-number">${docNumber}</div>
    <div class="company-name">${company.companyName}</div>
    ${company.companyAddress ? `<div class="company-tagline">${company.companyAddress}</div>` : ''}
    ${contactInfo ? `<div class="company-contact">${contactInfo}</div>` : ''}
  </div>

  <div class="amount-box">
    <div class="amount-label">${docType === 'receipt' ? 'Amount Paid' : 'Total Amount'}</div>
    <div class="amount-value">${formatCurrency(totalAmount)}</div>
  </div>

  <div class="info-section">
    <div class="info-row">
      <span class="info-label">${docType === 'receipt' ? 'Receipt Number' : docType === 'invoice' ? 'Invoice Number' : 'Quotation Number'}:</span>
      <span class="info-value">${docNumber}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Customer:</span>
      <span class="info-value">${clientName}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date:</span>
      <span class="info-value">${docDate}</span>
    </div>
    ${paymentMethod && docType === 'receipt' ? `
    <div class="info-row">
      <span class="info-label">Payment Method:</span>
      <span class="info-value">${paymentMethod}</span>
    </div>
    ` : ''}
  </div>

  ${items.length > 0 ? `
  <div class="items-title">Items ${docType === 'receipt' ? 'Purchased' : ''}</div>
  <table>
    <thead>
      <tr>
        <th style="width: 50%;">Description</th>
        <th style="width: 12%;">Qty</th>
        <th style="width: 19%;">Price</th>
        <th style="width: 19%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="3" style="text-align: right; padding-right: 10px;">Total:</td>
        <td class="total-value" style="text-align: right;">${formatCurrency(totalAmount)}</td>
      </tr>
    </tfoot>
  </table>
  ` : ''}

  ${notes ? `
  <div class="notes-section">
    <div class="notes-label">Notes:</div>
    <div class="notes-text">${notes}</div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="thank-you">Thank you for your ${docType === 'receipt' ? 'purchase' : 'business'}!</div>
    <div>${company.companyName}</div>
    <div style="margin-top: 8px; color: #d1d5db;">Generated: ${new Date().toLocaleString()} | Powered by Omanut BMS</div>
  </div>
</body>
</html>
`;
}

function createHTMLPDF(html: string, title: string, docNumber: string): Uint8Array {
  // Since we can't render HTML to PDF directly in Deno without dependencies,
  // we'll create a text-based PDF that mimics the styled layout
  const encoder = new TextEncoder();
  
  // Extract key info from HTML for text-based PDF
  // Parse the HTML to get the content
  const companyMatch = html.match(/class="company-name">([^<]+)/);
  const amountMatch = html.match(/class="amount-value">([^<]+)/);
  const customerMatch = html.match(/Customer:<\/span>\s*<span[^>]*>([^<]+)/);
  const dateMatch = html.match(/Date:<\/span>\s*<span[^>]*>([^<]+)/);
  const paymentMatch = html.match(/Payment Method:<\/span>\s*<span[^>]*>([^<]+)/);
  const docNumMatch = html.match(/class="doc-number">([^<]+)/);
  const docTitleMatch = html.match(/class="doc-title">([^<]+)/);
  
  const companyName = companyMatch?.[1] || 'Company';
  const amount = amountMatch?.[1] || 'K 0';
  const customer = customerMatch?.[1]?.trim() || 'Walk-in Customer';
  const date = dateMatch?.[1]?.trim() || new Date().toLocaleDateString();
  const payment = paymentMatch?.[1]?.trim() || '';
  const docNum = docNumMatch?.[1]?.trim() || docNumber;
  const docTitle = docTitleMatch?.[1]?.trim() || title;

  // Extract items from HTML
  const itemMatches = [...html.matchAll(/<tr>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/g)];
  
  // Build PDF content lines
  const lines: string[] = [];
  
  // Header section with box drawing
  lines.push('+' + '='.repeat(68) + '+');
  lines.push('|' + centerText(companyName.toUpperCase(), 68) + '|');
  lines.push('+' + '='.repeat(68) + '+');
  lines.push('|' + ' '.repeat(68) + '|');
  lines.push('|' + centerText(docTitle, 68) + '|');
  lines.push('|' + centerText(docNum, 68) + '|');
  lines.push('+' + '-'.repeat(68) + '+');
  
  // Amount highlight
  lines.push('|' + ' '.repeat(68) + '|');
  lines.push('|' + centerText('AMOUNT: ' + amount, 68) + '|');
  lines.push('|' + ' '.repeat(68) + '|');
  lines.push('+' + '-'.repeat(68) + '+');
  
  // Details section
  lines.push('|' + padRight('  Customer: ' + customer, 68) + '|');
  lines.push('|' + padRight('  Date: ' + date, 68) + '|');
  if (payment) {
    lines.push('|' + padRight('  Payment Method: ' + payment, 68) + '|');
  }
  
  // Items section
  if (itemMatches.length > 0) {
    lines.push('+' + '-'.repeat(68) + '+');
    lines.push('|  ITEMS:' + ' '.repeat(60) + '|');
    lines.push('+' + '-'.repeat(68) + '+');
    lines.push('|  ' + padRight('Description', 35) + padRight('Qty', 8) + padRight('Price', 12) + padRight('Total', 11) + '|');
    lines.push('|  ' + '-'.repeat(64) + '  |');
    
    itemMatches.forEach((match) => {
      const desc = truncate(match[1].trim(), 33);
      const qty = match[2].trim();
      const price = match[3].trim();
      const total = match[4].trim();
      lines.push('|  ' + padRight(desc, 35) + padRight(qty, 8) + padRight(price, 12) + padRight(total, 11) + '|');
    });
    
    lines.push('|  ' + '-'.repeat(64) + '  |');
    lines.push('|  ' + padRight('', 35) + padRight('', 8) + padRight('TOTAL:', 12) + padRight(amount, 11) + '|');
  }
  
  // Footer
  lines.push('+' + '-'.repeat(68) + '+');
  lines.push('|' + centerText('Thank you for your business!', 68) + '|');
  lines.push('|' + centerText(companyName, 68) + '|');
  lines.push('|' + ' '.repeat(68) + '|');
  lines.push('|' + centerText('Generated: ' + new Date().toLocaleString(), 68) + '|');
  lines.push('|' + centerText('Powered by Omanut BMS', 68) + '|');
  lines.push('+' + '='.repeat(68) + '+');

  // Create PDF with the formatted text
  const escapedLines = lines.map(line => 
    line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
  );
  
  const lineHeight = 12;
  const startY = 750;
  const margin = 40;
  const fontSize = 9;
  
  const textOps = escapedLines.map((line, i) => {
    const y = startY - (i * lineHeight);
    if (y < 50) return '';
    return `BT /F1 ${fontSize} Tf ${margin} ${y} Td (${line}) Tj ET`;
  }).filter(l => l).join('\n');

  const streamContent = `q\n${textOps}\nQ\n`;
  const streamBytes = encoder.encode(streamContent);
  const streamLength = streamBytes.length;

  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
0
%%EOF`;

  return encoder.encode(pdfContent);
}

function centerText(text: string, width: number): string {
  const trimmed = text.substring(0, width);
  const padding = Math.max(0, width - trimmed.length);
  const leftPad = Math.floor(padding / 2);
  const rightPad = padding - leftPad;
  return ' '.repeat(leftPad) + trimmed + ' '.repeat(rightPad);
}

function padRight(text: string, width: number): string {
  const trimmed = text.substring(0, width);
  return trimmed + ' '.repeat(Math.max(0, width - trimmed.length));
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
}
