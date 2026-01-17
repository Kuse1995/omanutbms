import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

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

interface CompanyInfo {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  logoUrl: string | null;
  tagline: string | null;
  slogan: string | null;
  impactEnabled: boolean;
  impactUnitLabel: string;
  currencySymbol: string;
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
    let totalLiters = 0;

    if (document_type === 'receipt') {
      // First try to find in payment_receipts
      let query = supabase
        .from('payment_receipts')
        .select('*')
        .eq('tenant_id', tenant_id);
      
      if (document_id) {
        query = query.eq('id', document_id);
      } else if (document_number) {
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
            .select('product_name, quantity, unit_price_zmw, total_amount_zmw, liters_impact')
            .eq('tenant_id', tenant_id)
            .eq('receipt_number', data.receipt_number);
          
          if (salesItems && salesItems.length > 0) {
            items = salesItems.map((item: any) => ({
              description: item.product_name,
              quantity: item.quantity,
              unit_price: item.unit_price_zmw,
              amount: item.total_amount_zmw,
            }));
            totalLiters = salesItems.reduce((sum: number, item: any) => sum + (item.liters_impact || 0), 0);
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
        totalLiters = txData.reduce((sum: number, tx: any) => sum + (tx.liters_impact || 0), 0);
        
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
      .maybeSingle();

    // Prefer business profile company name; fallback to tenant name
    let resolvedCompanyName = (businessProfile?.company_name ?? '').trim();
    if (!resolvedCompanyName) {
      const { data: tenantRow } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', tenant_id)
        .maybeSingle();
      resolvedCompanyName = (tenantRow?.name ?? '').trim() || 'Company';
    }

    const company: CompanyInfo = {
      companyName: resolvedCompanyName,
      companyAddress: businessProfile?.company_address || '',
      companyPhone: businessProfile?.company_phone || '',
      companyEmail: businessProfile?.company_email || '',
      logoUrl: businessProfile?.logo_url || null,
      tagline: businessProfile?.tagline || null,
      slogan: businessProfile?.slogan || null,
      impactEnabled: businessProfile?.impact_enabled ?? false,
      impactUnitLabel: 'Liters of Clean Water',
      currencySymbol: businessProfile?.currency_symbol || 'K',
    };

    console.log('[generate-whatsapp-document] Generating PDF for:', actualDocNumber, 'with', items.length, 'items');

    // Generate professional PDF using pdf-lib
    const pdfBytes = await generateStyledPDF(
      document_type,
      documentData,
      items,
      company,
      totalLiters
    );

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${document_type}-${actualDocNumber}-${timestamp}.pdf`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('whatsapp-documents')
      .upload(filename, pdfBytes, {
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

async function generateStyledPDF(
  docType: string,
  data: any,
  items: any[],
  company: CompanyInfo,
  totalLiters: number
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Letter size
  
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  // Colors (RGB values 0-1)
  const primaryBlue = rgb(0, 75/255, 141/255); // #004B8D
  const greenBg = rgb(220/255, 252/255, 231/255); // #dcfce7
  const greenText = rgb(22/255, 163/255, 74/255); // #16a34a
  const tealBg = rgb(204/255, 251/255, 241/255); // #ccfbf1
  const tealText = rgb(13/255, 148/255, 136/255); // #0d9488
  const grayText = rgb(107/255, 114/255, 128/255); // #6b7280
  const darkText = rgb(55/255, 65/255, 81/255); // #374151
  const lightGray = rgb(243/255, 244/255, 246/255); // #f3f4f6
  const borderGray = rgb(229/255, 231/255, 235/255); // #e5e7eb

  // Extract document data
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

  const docTitle = docType === 'receipt' ? 'PAYMENT RECEIPT' : 
                   docType === 'invoice' ? 'INVOICE' : 'QUOTATION';

  // ============ HEADER SECTION ============
  // Document title
  page.drawText(docTitle, {
    x: width / 2 - helveticaBold.widthOfTextAtSize(docTitle, 20) / 2,
    y: y,
    size: 20,
    font: helveticaBold,
    color: primaryBlue,
  });
  y -= 20;

  // Document number
  page.drawText(docNumber, {
    x: width / 2 - helvetica.widthOfTextAtSize(docNumber, 11) / 2,
    y: y,
    size: 11,
    font: helvetica,
    color: grayText,
  });
  y -= 25;

  // Company name
  page.drawText(company.companyName, {
    x: width / 2 - helveticaBold.widthOfTextAtSize(company.companyName, 14) / 2,
    y: y,
    size: 14,
    font: helveticaBold,
    color: darkText,
  });
  y -= 15;

  // Tagline/slogan
  const tagline = company.slogan || company.tagline || '';
  if (tagline) {
    page.drawText(tagline, {
      x: width / 2 - helvetica.widthOfTextAtSize(tagline, 10) / 2,
      y: y,
      size: 10,
      font: helvetica,
      color: grayText,
    });
    y -= 15;
  }

  // Contact info
  const contactInfo = [company.companyEmail, company.companyPhone].filter(Boolean).join(' | ');
  if (contactInfo) {
    page.drawText(contactInfo, {
      x: width / 2 - helvetica.widthOfTextAtSize(contactInfo, 9) / 2,
      y: y,
      size: 9,
      font: helvetica,
      color: grayText,
    });
    y -= 10;
  }

  // Header underline
  y -= 5;
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: width - margin, y: y },
    thickness: 2,
    color: primaryBlue,
  });
  y -= 20;

  // ============ AMOUNT BOX ============
  const boxWidth = width - (margin * 2);
  const boxHeight = 60;
  
  // Draw green background box
  page.drawRectangle({
    x: margin,
    y: y - boxHeight,
    width: boxWidth,
    height: boxHeight,
    color: greenBg,
  });

  // Amount label
  const amountLabel = docType === 'receipt' ? 'Amount Paid' : 'Total Amount';
  page.drawText(amountLabel, {
    x: width / 2 - helvetica.widthOfTextAtSize(amountLabel, 11) / 2,
    y: y - 20,
    size: 11,
    font: helvetica,
    color: grayText,
  });

  // Amount value
  const amountText = `${company.currencySymbol} ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
  page.drawText(amountText, {
    x: width / 2 - helveticaBold.widthOfTextAtSize(amountText, 26) / 2,
    y: y - 48,
    size: 26,
    font: helveticaBold,
    color: greenText,
  });

  y -= boxHeight + 25;

  // ============ INFO SECTION ============
  const infoItems = [
    { label: docType === 'receipt' ? 'Receipt Number:' : docType === 'invoice' ? 'Invoice Number:' : 'Quotation Number:', value: docNumber },
    { label: 'Customer:', value: clientName },
    { label: 'Date:', value: docDate },
  ];
  
  if (paymentMethod && docType === 'receipt') {
    infoItems.push({ label: 'Payment Method:', value: paymentMethod });
  }

  for (const info of infoItems) {
    // Draw background line
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: boxWidth,
      height: 22,
      color: rgb(1, 1, 1),
    });
    page.drawLine({
      start: { x: margin, y: y - 18 },
      end: { x: width - margin, y: y - 18 },
      thickness: 1,
      color: lightGray,
    });

    page.drawText(info.label, {
      x: margin + 5,
      y: y - 12,
      size: 10,
      font: helvetica,
      color: grayText,
    });

    page.drawText(info.value, {
      x: width - margin - helvetica.widthOfTextAtSize(info.value, 10) - 5,
      y: y - 12,
      size: 10,
      font: helveticaBold,
      color: darkText,
    });

    y -= 22;
  }

  y -= 15;

  // ============ ITEMS TABLE ============
  if (items.length > 0) {
    // Items header
    page.drawText(`Items ${docType === 'receipt' ? 'Purchased' : ''}`, {
      x: margin,
      y: y,
      size: 12,
      font: helveticaBold,
      color: darkText,
    });
    y -= 20;

    // Table header background
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: boxWidth,
      height: 22,
      color: lightGray,
    });

    // Table headers
    const colWidths = { desc: boxWidth * 0.50, qty: boxWidth * 0.12, price: boxWidth * 0.19, total: boxWidth * 0.19 };
    
    page.drawText('Description', { x: margin + 5, y: y - 12, size: 9, font: helveticaBold, color: darkText });
    page.drawText('Qty', { x: margin + colWidths.desc + 5, y: y - 12, size: 9, font: helveticaBold, color: darkText });
    page.drawText('Price', { x: margin + colWidths.desc + colWidths.qty + 5, y: y - 12, size: 9, font: helveticaBold, color: darkText });
    page.drawText('Total', { x: margin + colWidths.desc + colWidths.qty + colWidths.price + 5, y: y - 12, size: 9, font: helveticaBold, color: darkText });

    y -= 22;

    // Table header bottom line
    page.drawLine({
      start: { x: margin, y: y },
      end: { x: width - margin, y: y },
      thickness: 2,
      color: borderGray,
    });

    // Table rows
    for (const item of items) {
      y -= 18;
      const qty = item.quantity || 1;
      const price = item.unit_price || item.amount || 0;
      const desc = truncateText(item.description || item.item_name || 'Item', 40);
      const lineTotal = qty * price;

      page.drawText(desc, { x: margin + 5, y: y, size: 9, font: helvetica, color: darkText });
      page.drawText(qty.toString(), { x: margin + colWidths.desc + 5, y: y, size: 9, font: helvetica, color: darkText });
      page.drawText(formatCurrency(price, company.currencySymbol), { x: margin + colWidths.desc + colWidths.qty + 5, y: y, size: 9, font: helvetica, color: darkText });
      page.drawText(formatCurrency(lineTotal, company.currencySymbol), { x: margin + colWidths.desc + colWidths.qty + colWidths.price + 5, y: y, size: 9, font: helvetica, color: darkText });

      // Row bottom line
      y -= 5;
      page.drawLine({
        start: { x: margin, y: y },
        end: { x: width - margin, y: y },
        thickness: 1,
        color: borderGray,
      });
    }

    // Total row
    y -= 18;
    page.drawLine({
      start: { x: margin, y: y + 15 },
      end: { x: width - margin, y: y + 15 },
      thickness: 2,
      color: borderGray,
    });

    page.drawText('Total:', { 
      x: margin + colWidths.desc + colWidths.qty + colWidths.price - helveticaBold.widthOfTextAtSize('Total:', 10) - 5, 
      y: y, 
      size: 10, 
      font: helveticaBold, 
      color: darkText 
    });
    page.drawText(formatCurrency(totalAmount, company.currencySymbol), { 
      x: margin + colWidths.desc + colWidths.qty + colWidths.price + 5, 
      y: y, 
      size: 10, 
      font: helveticaBold, 
      color: greenText 
    });

    y -= 20;
  }

  // ============ IMPACT SECTION (if enabled) ============
  if (company.impactEnabled && totalLiters > 0 && docType === 'receipt') {
    y -= 10;
    const impactBoxHeight = 50;

    // Draw teal background box
    page.drawRectangle({
      x: margin,
      y: y - impactBoxHeight,
      width: boxWidth,
      height: impactBoxHeight,
      color: tealBg,
    });

    // Impact icon placeholder (water drop emoji equivalent - using text)
    page.drawText('💧', {
      x: margin + 15,
      y: y - 32,
      size: 20,
      font: helvetica,
      color: tealText,
    });

    // Impact label
    page.drawText('Impact Generated', {
      x: margin + 45,
      y: y - 20,
      size: 10,
      font: helvetica,
      color: grayText,
    });

    // Impact value
    const impactValue = `${totalLiters.toLocaleString()} ${company.impactUnitLabel}`;
    page.drawText(impactValue, {
      x: margin + 45,
      y: y - 38,
      size: 14,
      font: helveticaBold,
      color: tealText,
    });

    y -= impactBoxHeight + 10;
  }

  // ============ NOTES SECTION ============
  if (notes) {
    y -= 10;
    page.drawRectangle({
      x: margin,
      y: y - 40,
      width: boxWidth,
      height: 40,
      color: lightGray,
    });

    page.drawText('Notes:', { x: margin + 10, y: y - 15, size: 10, font: helveticaBold, color: darkText });
    page.drawText(truncateText(notes, 80), { x: margin + 10, y: y - 30, size: 9, font: helvetica, color: grayText });

    y -= 50;
  }

  // ============ FOOTER ============
  y -= 20;
  page.drawLine({
    start: { x: margin, y: y },
    end: { x: width - margin, y: y },
    thickness: 1,
    color: borderGray,
  });
  y -= 15;

  const thankYouText = `Thank you for your ${docType === 'receipt' ? 'purchase' : 'business'}!`;
  page.drawText(thankYouText, {
    x: width / 2 - helvetica.widthOfTextAtSize(thankYouText, 10) / 2,
    y: y,
    size: 10,
    font: helvetica,
    color: grayText,
  });
  y -= 12;

  page.drawText(company.companyName, {
    x: width / 2 - helvetica.widthOfTextAtSize(company.companyName, 9) / 2,
    y: y,
    size: 9,
    font: helvetica,
    color: grayText,
  });
  y -= 20;

  const generatedText = `Generated: ${new Date().toLocaleString()}`;
  page.drawText(generatedText, {
    x: width / 2 - helvetica.widthOfTextAtSize(generatedText, 8) / 2,
    y: y,
    size: 8,
    font: helvetica,
    color: rgb(209/255, 213/255, 219/255),
  });
  y -= 10;

  const poweredByText = 'Powered by Omanut BMS';
  page.drawText(poweredByText, {
    x: width / 2 - helvetica.widthOfTextAtSize(poweredByText, 8) / 2,
    y: y,
    size: 8,
    font: helvetica,
    color: rgb(209/255, 213/255, 219/255),
  });

  return await pdfDoc.save();
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

function formatCurrency(amount: number, symbol: string): string {
  return `${symbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function truncateText(text: string, maxLen: number): string {
  return text.length > maxLen ? text.substring(0, maxLen - 2) + '..' : text;
}
