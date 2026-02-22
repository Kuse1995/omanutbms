const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ReceiptItem {
  product_name: string;
  quantity: number;
  unit_price_zmw: number;
  total_amount_zmw: number;
  item_type: string;
  selected_color?: string | null;
  selected_size?: string | null;
}

interface ReceiptData {
  email: string;
  receiptNumber: string;
  customerName: string | null;
  items: ReceiptItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentDate: string;
  companyName?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: ReceiptData = await req.json();
    const { email, receiptNumber, customerName, items, totalAmount, paymentMethod, paymentDate, companyName } = data;

    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isCredit = paymentMethod === 'credit_invoice';
    const docType = isCredit ? 'Invoice' : 'Receipt';
    const business = companyName || 'Our Store';
    const formattedDate = new Date(paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const itemRows = items.map(item => {
      let desc = item.product_name;
      if (item.selected_color) desc += ` - ${item.selected_color}`;
      if (item.selected_size) desc += ` (${item.selected_size})`;
      return `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${desc}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">K ${item.unit_price_zmw.toLocaleString()}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">K ${item.total_amount_zmw.toLocaleString()}</td>
      </tr>`;
    }).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;margin-bottom:20px;">
          <h2 style="color:#004B8D;margin:0;">${business}</h2>
          <p style="color:#666;margin:5px 0;">Sales ${docType}</p>
        </div>
        <div style="background:${isCredit ? '#FEF3C7' : '#D1FAE5'};padding:15px;border-radius:8px;text-align:center;margin-bottom:20px;">
          <p style="margin:0;color:#666;font-size:14px;">${isCredit ? 'Total Due' : 'Amount Paid'}</p>
          <p style="margin:5px 0;font-size:28px;font-weight:bold;color:${isCredit ? '#D97706' : '#059669'};">K ${totalAmount.toLocaleString()}</p>
        </div>
        <table style="width:100%;margin-bottom:15px;font-size:14px;">
          <tr><td style="color:#666;padding:4px 0;">${docType} #:</td><td style="text-align:right;font-weight:500;">${receiptNumber}</td></tr>
          <tr><td style="color:#666;padding:4px 0;">Customer:</td><td style="text-align:right;">${customerName || 'Walk-in Customer'}</td></tr>
          <tr><td style="color:#666;padding:4px 0;">Date:</td><td style="text-align:right;">${formattedDate}</td></tr>
          <tr><td style="color:#666;padding:4px 0;">Payment:</td><td style="text-align:right;text-transform:capitalize;">${paymentMethod.replace(/_/g, ' ')}</td></tr>
        </table>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#F3F4F6;">
              <th style="padding:8px;text-align:left;">Item</th>
              <th style="padding:8px;text-align:center;">Qty</th>
              <th style="padding:8px;text-align:right;">Price</th>
              <th style="padding:8px;text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="padding:10px 8px;text-align:right;font-weight:bold;">Total:</td>
              <td style="padding:10px 8px;text-align:right;font-weight:bold;color:#059669;">K ${totalAmount.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
        <p style="text-align:center;color:#999;font-size:12px;margin-top:20px;">Thank you for your business!</p>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sales <onboarding@resend.dev>',
        to: [email],
        subject: `${docType} ${receiptNumber} from ${business}`,
        html,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      console.error('Resend error:', result);
      return new Response(JSON.stringify({ error: 'Failed to send email', details: result }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, id: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
