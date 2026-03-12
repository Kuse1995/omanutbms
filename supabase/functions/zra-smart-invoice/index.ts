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

interface VsdcCredentials {
  vsdcUrl: string;
  tin: string;
  companyNames: string;
  securityKey: string;
}

// Helper to build standard VSDC auth payload
function authPayload(creds: VsdcCredentials) {
  return {
    COMPANY_TIN: creds.tin,
    COMPANY_NAMES: creds.companyNames,
    COMPANY_SECURITY_KEY: creds.securityKey,
  };
}

// Generic VSDC POST helper
async function vsdcPost(creds: VsdcCredentials, endpoint: string, extraPayload: Record<string, any> = {}) {
  try {
    const response = await fetch(`${creds.vsdcUrl}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...authPayload(creds), ...extraPayload }),
    });
    const data = await response.json();
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
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
      .select('zra_vsdc_enabled, zra_company_tin, zra_company_names, zra_security_key, zra_vsdc_url, tax_enabled, tax_rate, company_name, company_address, tpin_number')
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

    const creds: VsdcCredentials = { vsdcUrl, tin, companyNames, securityKey };
    const defaultTaxCode = (profile.tax_enabled && profile.tax_rate === 16) ? 'F' : 'A';

    let result: any;

    switch (action) {
      // === Item 1: Health Check ===
      case 'health_check':
        result = await vsdcPost(creds, 'health_check_request_JSON.jsp');
        break;

      // === Item 2: Get Code Data (VSDC Constants) ===
      case 'get_code_data':
        result = await vsdcPost(creds, 'get_code_data_JSON.jsp');
        break;

      // === Item 3: Classification Codes ===
      case 'get_classification':
        result = await vsdcPost(creds, 'get_classification_JSON.jsp');
        break;

      // === Items 4-5: Save/Get Branch Customer ===
      case 'save_branch_customer': {
        const { customer_tin, customer_name, customer_address, customer_phone, customer_email } = params;
        result = await vsdcPost(creds, 'save_branch_customer_JSON.jsp', {
          CUSTOMER_TIN: customer_tin || '',
          CUSTOMER_NAME: customer_name,
          CUSTOMER_ADDRESS: customer_address || '',
          CUSTOMER_PHONE: customer_phone || '',
          CUSTOMER_EMAIL: customer_email || '',
        });
        break;
      }
      case 'get_branch_customers':
        result = await vsdcPost(creds, 'get_branch_customer_JSON.jsp');
        break;

      // === Item 6: Save Branch User ===
      case 'save_branch_user': {
        const { user_id: userId, user_name, user_role } = params;
        result = await vsdcPost(creds, 'save_branch_user_JSON.jsp', {
          USER_ID: userId,
          USER_NAME: user_name,
          USER_ROLE: user_role || 'CASHIER',
        });
        break;
      }

      // === Item 7: Get Branch Info ===
      case 'get_branch_info':
        result = await vsdcPost(creds, 'get_branch_info_JSON.jsp');
        break;

      // === Item 8: Save Items (register_items) ===
      case 'register_items': {
        const itemList = (params.items || []).map((item: any) => ({
          ITMREF: item.sku || item.id,
          ITMDES: item.name,
          TAXCODE: item.tax_code || 'F',
        }));
        result = await vsdcPost(creds, 'post_item_JSON.jsp', { item_list: itemList });
        break;
      }

      // === Item 9: Item Composition ===
      case 'save_item_composition': {
        const { item_ref, components } = params;
        result = await vsdcPost(creds, 'post_item_composition_JSON.jsp', {
          ITMREF: item_ref,
          composition_list: components || [],
        });
        break;
      }

      // === Item 10: Get Item List ===
      case 'get_item_list':
        result = await vsdcPost(creds, 'get_item_list_JSON.jsp');
        break;

      // === Item 11: Get Import Items ===
      case 'get_import_items':
        result = await vsdcPost(creds, 'get_import_items_JSON.jsp');
        break;

      // === Item 12: Update Import Item ===
      case 'update_import_item': {
        const { item_ref: importRef, item_name: importName, tax_code: importTax } = params;
        result = await vsdcPost(creds, 'update_import_item_JSON.jsp', {
          ITMREF: importRef,
          ITMDES: importName,
          TAXCODE: importTax || defaultTaxCode,
        });
        break;
      }

      // === Items 13-14: Save/Get Purchases ===
      case 'save_purchase': {
        result = await submitReceipt(supabase, creds, 'PURCHASE', params, defaultTaxCode, tenant_id);
        break;
      }
      case 'get_purchases':
        result = await vsdcPost(creds, 'get_purchases_JSON.jsp');
        break;

      // === Item 16: Upload Sales (submit_invoice) ===
      case 'submit_invoice':
        result = await submitReceipt(supabase, creds, 'INVOICE', params, defaultTaxCode, tenant_id);
        break;

      // === Item 20: Credit Notes (submit_refund) ===
      case 'submit_refund':
        result = await submitReceipt(supabase, creds, 'REFUND', params, defaultTaxCode, tenant_id);
        break;

      // === Item 21: Debit Notes ===
      case 'submit_debit_note':
        result = await submitReceipt(supabase, creds, 'DEBIT', params, defaultTaxCode, tenant_id);
        break;

      // === Items 27-28: Save/Get Stock Items ===
      case 'save_stock_item': {
        const { item_ref: stockRef, item_name: stockName, quantity: stockQty, unit_price: stockPrice } = params;
        result = await vsdcPost(creds, 'post_stock_item_JSON.jsp', {
          ITMREF: stockRef,
          ITMDES: stockName,
          QUANTITY: stockQty || 0,
          UNITYPRICE: stockPrice || 0,
        });
        break;
      }
      case 'get_stock_items':
        result = await vsdcPost(creds, 'get_stock_items_JSON.jsp');
        break;

      // === Item 29: Stock quantity update (re-register stock) ===
      case 'update_stock_quantity': {
        const { item_ref: uRef, item_name: uName, quantity: uQty, unit_price: uPrice } = params;
        result = await vsdcPost(creds, 'post_stock_item_JSON.jsp', {
          ITMREF: uRef,
          ITMDES: uName,
          QUANTITY: uQty || 0,
          UNITYPRICE: uPrice || 0,
        });
        break;
      }

      // === Z Report ===
      case 'z_report':
        result = await vsdcPost(creds, 'requestZd_report_Json.jsp');
        break;

      // === Retry failed submission ===
      case 'retry': {
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
        result = await retrySubmission(supabase, creds, logEntry, defaultTaxCode, tenant_id);
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

// === Receipt submission (INVOICE, REFUND, DEBIT, PURCHASE) ===
async function submitReceipt(
  supabase: any, creds: VsdcCredentials, flag: string, params: any, defaultTaxCode: string, tenantId: string
) {
  const { invoice_num, items, client_name, client_tin, related_table, related_id } = params;

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
    COMPANY_TIN: creds.tin,
    COMPANY_NAMES: creds.companyNames,
    COMPANY_SECURITY_KEY: creds.securityKey,
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
    const postResponse = await fetch(`${creds.vsdcUrl}/post_receipt_Json.jsp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const postData = await postResponse.json();

    // Step 2: GET the signature/QR code
    const sigResponse = await fetch(`${creds.vsdcUrl}/get_Response_JSON.jsp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        FLAG: flag,
        NUM: invoice_num,
        ...authPayload(creds),
      }),
    });
    const sigData = await sigResponse.json();

    const fiscalData = {
      ysdcid: sigData?.YSDCID || null,
      ysdcintdata: sigData?.YSDCINTDATA || null,
      ysdcregsig: sigData?.YSDCREGSIG || null,
      ysdcrecnum: sigData?.YSDCRECNUM || null,
      ysdctime: sigData?.YSDCTIME || null,
      qr_code: sigData?.QR_CODE || null,
    };

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
  supabase: any, creds: VsdcCredentials, logEntry: any, defaultTaxCode: string, tenantId: string
) {
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

  return submitReceipt(supabase, creds, logEntry.flag, {
    invoice_num: logEntry.invoice_num,
    items,
    client_name: clientName,
    related_table: logEntry.related_table,
    related_id: logEntry.related_id,
  }, defaultTaxCode, tenantId);
}
