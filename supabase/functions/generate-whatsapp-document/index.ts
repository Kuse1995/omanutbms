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
  // Create a simple PDF manually (PDF 1.4 format)
  // This is a minimal PDF generator that works in Deno without external dependencies
  
  const title = docType.toUpperCase();
  let docNumber = '';
  let clientName = '';
  let docDate = '';
  let totalAmount = 0;

  if (docType === 'receipt') {
    docNumber = data.receipt_number;
    clientName = data.client_name;
    docDate = new Date(data.payment_date).toLocaleDateString();
    totalAmount = data.amount_paid;
  } else if (docType === 'invoice') {
    docNumber = data.invoice_number;
    clientName = data.client_name;
    docDate = new Date(data.invoice_date).toLocaleDateString();
    totalAmount = data.total_amount;
  } else if (docType === 'quotation') {
    docNumber = data.quotation_number;
    clientName = data.client_name;
    docDate = new Date(data.quotation_date).toLocaleDateString();
    totalAmount = data.total_amount;
  }

  // Build content lines
  const lines: string[] = [
    '═'.repeat(45),
    company.companyName.toUpperCase(),
    '═'.repeat(45),
    company.companyAddress || '',
    company.companyPhone ? `Tel: ${company.companyPhone}` : '',
    company.companyEmail ? `Email: ${company.companyEmail}` : '',
    '',
    '─'.repeat(45),
    `${title}`,
    '─'.repeat(45),
    `Number: ${docNumber}`,
    `Date: ${docDate}`,
    `Client: ${clientName}`,
    '',
  ];

  // Add items
  if (items.length > 0) {
    lines.push('─'.repeat(45));
    lines.push('ITEMS:');
    lines.push('─'.repeat(45));
    items.forEach((item, index) => {
      const qty = item.quantity || 1;
      const price = item.unit_price || item.amount || 0;
      const desc = item.description || item.item_name || 'Item';
      const lineTotal = qty * price;
      lines.push(`${index + 1}. ${desc}`);
      lines.push(`   ${qty} x K${price.toLocaleString()} = K${lineTotal.toLocaleString()}`);
    });
    lines.push('─'.repeat(45));
  }

  lines.push('');
  lines.push('═'.repeat(45));
  lines.push(`TOTAL: K${totalAmount.toLocaleString()}`);
  lines.push('═'.repeat(45));
  
  if (docType === 'receipt') {
    lines.push('');
    lines.push('Payment received with thanks.');
    if (data.payment_method) {
      lines.push(`Payment Method: ${data.payment_method}`);
    }
  }

  if (data.notes) {
    lines.push('');
    lines.push(`Notes: ${data.notes}`);
  }

  lines.push('');
  lines.push('─'.repeat(45));
  lines.push(`Generated: ${new Date().toLocaleString()}`);
  lines.push('Powered by Omanut BMS');

  // Create PDF content
  const content = lines.filter(l => l !== undefined).join('\n');
  const pdfBytes = createSimplePDF(content, title, docNumber);
  
  return pdfBytes;
}

function createSimplePDF(text: string, title: string, docNumber: string): Uint8Array {
  // Create a minimal valid PDF
  const encoder = new TextEncoder();
  
  // Escape special PDF characters and wrap text
  const escapedText = text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/─/g, '-')
    .replace(/═/g, '=');
  
  // Split into lines and format
  const lines = escapedText.split('\n');
  const lineHeight = 14;
  const startY = 750;
  const margin = 50;
  
  // Build text operators for each line
  const textOps = lines.map((line, i) => {
    const y = startY - (i * lineHeight);
    if (y < 50) return ''; // Don't go off page
    return `BT /F1 10 Tf ${margin} ${y} Td (${line}) Tj ET`;
  }).filter(l => l).join('\n');

  const streamContent = `
q
${textOps}
Q
`;

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
