import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ZraItem {
  ITMREF: string;
  ITMDES: string;
  QUANTITY: number;
  UNITYPRICE: number;
  TAXCODE: string;
}

interface ZraInvoicePayload {
  FLAG: string;
  NUM: string;
  CURRENCY: string;
  COMPUTATION_TYPE: string;
  COMPANY_TIN: string;
  COMPANY_NAMES: string;
  COMPANY_SECURITY_KEY: string;
  CLIENT_NAME?: string;
  CLIENT_TIN?: string;
  item_list: ZraItem[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, tenant_id, ...params } = await req.json();

    // Fetch tenant ZRA config
    const { data: profile, error: profileError } = await supabase
      .from('business_profiles')
      .select('zra_vsdc_enabled, zra_company_tin, zra_company_names, zra_security_key, zra_vsdc_url, tax_enabled, tax_rate')
      .eq('tenant_id', tenant_id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Tenant not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!profile.zra_vsdc_enabled) {
      return new Response(JSON.stringify({ error: 'ZRA VSDC is not enabled for this tenant' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const vsdcUrl = profile.zra_vsdc_url;
    const tin = profile.zra_company_tin;
    const companyNames = profile.zra_company_names;
    const securityKey = profile.zra_security_key;

    if (!vsdcUrl || !tin || !companyNames || !securityKey) {
      return new Response(JSON.stringify({ error: 'ZRA credentials are incomplete' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine default tax code
    const defaultTaxCode = (profile.tax_enabled && profile.tax_rate === 16) ? 'F' : 'A';

    let result: any;

    switch (action) {
      case 'health_check': {
        result = await healthCheck(vsdcUrl, tin, companyNames, securityKey);
        break;
      }
      case 'submit_invoice': {
        result = await submitReceipt(supabase, vsdcUrl, tin, companyNames, securityKey, 'INVOICE', params, defaultTaxCode, tenant_id);
        break;
      }
      case 'submit_refund': {
        result = await submitReceipt(supabase, vsdcUrl, tin, companyNames, securityKey, 'REFUND', params, defaultTaxCode, tenant_id);
        break;
      }
      case 'register_items': {
        result = await registerItems(vsdcUrl, tin, companyNames, securityKey, params.items || []);
        break;
      }
      case 'z_report': {
        result = await getZReport(vsdcUrl, tin, companyNames, securityKey);
        break;
      }
      case 'retry': {
        // Retry a failed submission
        const { log_id } = params;
        const { data: logEntry } = await supabase
          .from('zra_invoice_log')
          .select('*')
          .eq('id', log_id)
          .eq('tenant_id', tenant_id)
          .single();

        if (!logEntry) {
          result = { error: 'Log entry not found' };
          break;
        }

        // Re-fetch the related data and resubmit
        result = await retrySubmission(supabase, vsdcUrl, tin, companyNames, securityKey, logEntry, defaultTaxCode, tenant_id);
        break;
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('ZRA Smart Invoice error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function healthCheck(vsdcUrl: string, tin: string, companyNames: string, securityKey: string) {
  try {
    const response = await fetch(`${vsdcUrl}/health_check_request_JSON.jsp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        COMPANY_TIN: tin,
        COMPANY_NAMES: companyNames,
        COMPANY_SECURITY_KEY: securityKey,
      }),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function submitReceipt(
  supabase: any, vsdcUrl: string, tin: string, companyNames: string,
  securityKey: string, flag: string, params: any, defaultTaxCode: string, tenantId: string
) {
  const { invoice_num, items, client_name, client_tin, related_table, related_id } = params;

  // Map items to ZRA format
  const itemList: ZraItem[] = (items || []).map((item: any) => ({
    ITMREF: item.sku || item.id || 'ITEM',
    ITMDES: item.name || item.product_name || 'Item',
    QUANTITY: item.quantity || 1,
    UNITYPRICE: item.unit_price || 0,
    TAXCODE: item.tax_code || defaultTaxCode,
  }));

  const payload: ZraInvoicePayload = {
    FLAG: flag,
    NUM: invoice_num,
    CURRENCY: 'ZMW',
    COMPUTATION_TYPE: 'INCLUSIVE',
    COMPANY_TIN: tin,
    COMPANY_NAMES: companyNames,
    COMPANY_SECURITY_KEY: securityKey,
    item_list: itemList,
  };

  if (client_name) payload.CLIENT_NAME = client_name;
  if (client_tin) payload.CLIENT_TIN = client_tin;

  // Create log entry
  const { data: logEntry } = await supabase
    .from('zra_invoice_log')
    .insert({
      tenant_id: tenantId,
      invoice_num,
      flag,
      status: 'pending',
      related_table: related_table || null,
      related_id: related_id || null,
    })
    .select()
    .single();

  try {
    // Step 1: POST the receipt
    const postResponse = await fetch(`${vsdcUrl}/post_receipt_Json.jsp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const postData = await postResponse.json();

    // Step 2: GET the signature/QR code
    const sigResponse = await fetch(`${vsdcUrl}/get_Response_JSON.jsp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FLAG: flag,
        NUM: invoice_num,
        COMPANY_TIN: tin,
        COMPANY_NAMES: companyNames,
        COMPANY_SECURITY_KEY: securityKey,
      }),
    });
    const sigData = await sigResponse.json();

    // Extract fiscal data
    const fiscalData = {
      ysdcid: sigData?.YSDCID || null,
      ysdcintdata: sigData?.YSDCINTDATA || null,
      ysdcregsig: sigData?.YSDCREGSIG || null,
      ysdcrecnum: sigData?.YSDCRECNUM || null,
      ysdctime: sigData?.YSDCTIME || null,
      qr_code: sigData?.QR_CODE || null,
    };

    // Update log entry
    if (logEntry) {
      await supabase
        .from('zra_invoice_log')
        .update({
          status: 'success',
          zra_response: { post: postData, signature: sigData },
          fiscal_data: fiscalData,
        })
        .eq('id', logEntry.id);
    }

    return { success: true, fiscal_data: fiscalData, log_id: logEntry?.id };

  } catch (error: any) {
    // Update log with error
    if (logEntry) {
      await supabase
        .from('zra_invoice_log')
        .update({
          status: 'failed',
          error_message: error.message,
        })
        .eq('id', logEntry.id);
    }

    return { success: false, error: error.message, log_id: logEntry?.id };
  }
}

async function retrySubmission(
  supabase: any, vsdcUrl: string, tin: string, companyNames: string,
  securityKey: string, logEntry: any, defaultTaxCode: string, tenantId: string
) {
  // Re-fetch items from the related table
  let items: any[] = [];
  let clientName: string | null = null;

  if (logEntry.related_table === 'sales') {
    const { data: saleItems } = await supabase
      .from('sales')
      .select('product_name, quantity, unit_price_zmw, sku')
      .eq('receipt_number', logEntry.invoice_num)
      .eq('tenant_id', tenantId);
    items = (saleItems || []).map((s: any) => ({
      sku: s.sku || 'ITEM',
      name: s.product_name,
      quantity: s.quantity,
      unit_price: s.unit_price_zmw,
    }));
  } else if (logEntry.related_table === 'invoices') {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', logEntry.related_id)
      .eq('tenant_id', tenantId)
      .single();
    if (invoice) {
      clientName = invoice.client_name;
      items = (invoice.invoice_items || []).map((i: any) => ({
        sku: i.sku || 'ITEM',
        name: i.description,
        quantity: i.quantity,
        unit_price: i.unit_price,
      }));
    }
  }

  return submitReceipt(supabase, vsdcUrl, tin, companyNames, securityKey, logEntry.flag, {
    invoice_num: logEntry.invoice_num,
    items,
    client_name: clientName,
    related_table: logEntry.related_table,
    related_id: logEntry.related_id,
  }, defaultTaxCode, tenantId);
}

async function registerItems(vsdcUrl: string, tin: string, companyNames: string, securityKey: string, items: any[]) {
  try {
    const itemList = items.map((item: any) => ({
      ITMREF: item.sku || item.id,
      ITMDES: item.name,
      TAXCODE: item.tax_code || 'F',
    }));

    const response = await fetch(`${vsdcUrl}/post_item_JSON.jsp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        COMPANY_TIN: tin,
        COMPANY_NAMES: companyNames,
        COMPANY_SECURITY_KEY: securityKey,
        item_list: itemList,
      }),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function getZReport(vsdcUrl: string, tin: string, companyNames: string, securityKey: string) {
  try {
    const response = await fetch(`${vsdcUrl}/requestZd_report_Json.jsp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        COMPANY_TIN: tin,
        COMPANY_NAMES: companyNames,
        COMPANY_SECURITY_KEY: securityKey,
      }),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
