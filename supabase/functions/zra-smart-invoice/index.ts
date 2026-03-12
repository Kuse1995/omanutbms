import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * ZRA VSDC API Integration — aligned with VSDC API Specification v1.0.7
 * 
 * Official endpoint paths use REST-style routes:
 *   /initializer/selectInitInfo
 *   /code/selectCodes
 *   /itemClass/selectItemsClass
 *   /notices/selectNotices
 *   /branches/saveBrancheUser
 *   /branches/selectBranches
 *   /bhfCustomer/saveBhfCustomer
 *   /bhfCustomer/selectBhfCustomer
 *   /items/saveItem
 *   /items/updateItem
 *   /items/selectItems
 *   /items/selectItem
 *   /items/saveItemComposition
 *   /imports/selectImportItems
 *   /imports/updateImportItems
 *   /trnsSales/saveSales
 *   /trnsSales/selectTrnsSalesOsList
 *   /trnsPurchase/savePurchase
 *   /trnsPurchase/selectTrnsPurchaseSalesList
 *   /stock/saveStockItems
 *   /stock/selectStockItems
 *   /stockMaster/saveStockMaster
 *
 * All requests use POST with JSON body containing `tpin` and `bhfId`.
 */

interface VsdcCredentials {
  vsdcUrl: string;
  tpin: string;
  bhfId: string;
  dvcSrlNo?: string;
}

// Generic VSDC POST helper
async function vsdcPost(creds: VsdcCredentials, endpoint: string, extraPayload: Record<string, any> = {}) {
  try {
    const url = `${creds.vsdcUrl}/${endpoint}`;
    console.log(`VSDC POST: ${url}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tpin: creds.tpin, bhfId: creds.bhfId, ...extraPayload }),
    });
    const data = await response.json();
    return { success: data?.resultCd === '000', data };
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
      return jsonResponse({ error: 'Tenant not found' }, 404);
    }

    if (!profile.zra_vsdc_enabled) {
      return jsonResponse({ error: 'ZRA VSDC is not enabled for this tenant' }, 400);
    }

    const vsdcUrl = profile.zra_vsdc_url;
    const tpin = profile.zra_company_tin;

    if (!vsdcUrl || !tpin) {
      return jsonResponse({ error: 'ZRA credentials are incomplete. TPIN and VSDC URL are required.' }, 400);
    }

    // bhfId defaults to "000" (Headquarters) per ZRA spec
    const creds: VsdcCredentials = { vsdcUrl, tpin, bhfId: params.bhf_id || '000' };

    // Default tax type: "A" = Standard Rated (16% VAT in Zambia)
    const defaultTaxTyCd = (profile.tax_enabled && profile.tax_rate === 16) ? 'A' : 'D';

    let result: any;

    switch (action) {
      // =====================================================
      // 5.1 Device Initialization
      // =====================================================
      case 'init_device': {
        const { dvc_serial_no } = params;
        result = await vsdcPost(creds, 'initializer/selectInitInfo', {
          dvcSrlNo: dvc_serial_no || '',
        });
        break;
      }

      // =====================================================
      // 5.2 Standard Codes (Constants)
      // =====================================================
      case 'get_codes': {
        result = await vsdcPost(creds, 'code/selectCodes', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      // =====================================================
      // 5.3 Classification Codes
      // =====================================================
      case 'get_classification': {
        result = await vsdcPost(creds, 'itemClass/selectItemsClass', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      // =====================================================
      // 5.3.1 Notices (Optional)
      // =====================================================
      case 'get_notices': {
        result = await vsdcPost(creds, 'notices/selectNotices', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      // =====================================================
      // 5.4 Branch Information
      // =====================================================
      case 'save_branch_user': {
        const { user_id: userId, user_name, user_role, address, contact, email } = params;
        result = await vsdcPost(creds, 'branches/saveBrancheUser', {
          userId: userId,
          userNm: user_name,
          adrs: address || null,
          cntctNo: contact || null,
          authYn: 'Y',
          remark: user_role || 'CASHIER',
          useYn: 'Y',
          regrNm: user_name,
          regrId: userId,
          modrNm: user_name,
          modrId: userId,
        });
        break;
      }

      case 'get_branches': {
        result = await vsdcPost(creds, 'branches/selectBranches', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      // =====================================================
      // 5.5 Customer Information
      // =====================================================
      case 'save_customer': {
        const { customer_no, customer_tpin, customer_name, address: custAddr, email: custEmail } = params;
        result = await vsdcPost(creds, 'bhfCustomer/saveBhfCustomer', {
          custNo: customer_no || customer_tpin || '',
          custTpin: customer_tpin || '',
          custNm: customer_name,
          adrs: custAddr || null,
          email: custEmail || null,
          faxNo: null,
          useYn: 'Y',
          remark: null,
          regrNm: 'Admin',
          regrId: 'Admin',
          modrNm: 'Admin',
          modrId: 'Admin',
        });
        break;
      }

      case 'get_customers': {
        result = await vsdcPost(creds, 'bhfCustomer/selectBhfCustomer', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      // =====================================================
      // 5.6 Item Information
      // =====================================================
      case 'save_item': {
        const item = params;
        result = await vsdcPost(creds, 'items/saveItem', {
          itemCd: item.item_code,
          itemClsCd: item.item_class_code || '46181500', // default UNSPSC
          itemTyCd: item.item_type_code || '2', // 2 = Finished Product
          itemNm: item.item_name,
          itemStdNm: item.item_std_name || item.item_name,
          orgnNatCd: item.origin_country || 'ZM',
          pkgUnitCd: item.pkg_unit || 'NT', // NT = Not applicable
          qtyUnitCd: item.qty_unit || 'U', // U = Unit
          vatCatCd: item.vat_cat || defaultTaxTyCd,
          iplCatCd: item.ipl_cat || null,
          tlCatCd: item.tl_cat || null,
          exciseTxCatCd: item.excise_cat || null,
          btchNo: item.batch_no || null,
          bcd: item.barcode || null,
          dftPrc: item.default_price || 0,
          addInfo: item.additional_info || null,
          sftyQty: item.safety_qty || 0,
          isrcAplcbYn: 'N',
          useYn: 'Y',
          regrNm: item.user_name || 'Admin',
          regrId: item.user_id || 'Admin',
          modrNm: item.user_name || 'Admin',
          modrId: item.user_id || 'Admin',
        });
        break;
      }

      case 'update_item': {
        const uItem = params;
        result = await vsdcPost(creds, 'items/updateItem', {
          itemCd: uItem.item_code,
          itemClsCd: uItem.item_class_code || '46181500',
          itemTyCd: uItem.item_type_code || '2',
          itemNm: uItem.item_name,
          itemStdNm: uItem.item_std_name || uItem.item_name,
          orgnNatCd: uItem.origin_country || 'ZM',
          pkgUnitCd: uItem.pkg_unit || 'NT',
          qtyUnitCd: uItem.qty_unit || 'U',
          vatCatCd: uItem.vat_cat || defaultTaxTyCd,
          iplCatCd: uItem.ipl_cat || null,
          tlCatCd: uItem.tl_cat || null,
          exciseTxCatCd: uItem.excise_cat || null,
          btchNo: uItem.batch_no || null,
          bcd: uItem.barcode || null,
          dftPrc: uItem.default_price || 0,
          addInfo: uItem.additional_info || null,
          sftyQty: uItem.safety_qty || 0,
          isrcAplcbYn: 'N',
          useYn: 'Y',
          regrNm: uItem.user_name || 'Admin',
          regrId: uItem.user_id || 'Admin',
          modrNm: uItem.user_name || 'Admin',
          modrId: uItem.user_id || 'Admin',
        });
        break;
      }

      case 'get_items': {
        result = await vsdcPost(creds, 'items/selectItems', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      case 'get_item': {
        result = await vsdcPost(creds, 'items/selectItem', {
          itemCd: params.item_code,
        });
        break;
      }

      case 'save_item_composition': {
        result = await vsdcPost(creds, 'items/saveItemComposition', {
          itemCd: params.item_code,
          cpstItemCd: params.composition_item_code,
          cpstQty: params.composition_qty || 1,
          regrId: params.user_id || 'Admin',
          regrNm: params.user_name || 'Admin',
        });
        break;
      }

      // =====================================================
      // 5.7 Import Information
      // =====================================================
      case 'get_imports': {
        result = await vsdcPost(creds, 'imports/selectImportItems', {
          lastReqDt: params.last_req_dt || '20231215000000',
          dclRefNum: params.declaration_ref || null,
        });
        break;
      }

      case 'update_import_item': {
        result = await vsdcPost(creds, 'imports/updateImportItems', {
          taskCd: params.task_code,
          dclDe: params.declaration_date,
          importItemList: params.import_items || [],
        });
        break;
      }

      // =====================================================
      // 5.8 Sales Information — saveSales
      // =====================================================
      case 'save_sale': {
        result = await submitSale(supabase, creds, params, defaultTaxTyCd, tenant_id, profile);
        break;
      }

      // Alias for backward compatibility
      case 'submit_invoice': {
        result = await submitSale(supabase, creds, { ...params, receipt_type: 'S' }, defaultTaxTyCd, tenant_id, profile);
        break;
      }

      case 'submit_refund': {
        result = await submitSale(supabase, creds, { ...params, receipt_type: 'R' }, defaultTaxTyCd, tenant_id, profile);
        break;
      }

      case 'submit_debit_note': {
        result = await submitSale(supabase, creds, { ...params, receipt_type: 'D' }, defaultTaxTyCd, tenant_id, profile);
        break;
      }

      // =====================================================
      // 5.8 Sales — selectTrnsSalesOsList (lookup)
      // =====================================================
      case 'get_sales': {
        result = await vsdcPost(creds, 'trnsSales/selectTrnsSalesOsList', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      // =====================================================
      // 5.9 Purchase Information
      // =====================================================
      case 'save_purchase': {
        result = await submitSale(supabase, creds, { ...params, receipt_type: 'P' }, defaultTaxTyCd, tenant_id, profile);
        break;
      }

      case 'get_purchases': {
        result = await vsdcPost(creds, 'trnsPurchase/selectTrnsPurchaseSalesList', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      // =====================================================
      // 5.10 Stock Information
      // =====================================================
      case 'save_stock_item': {
        result = await vsdcPost(creds, 'stock/saveStockItems', {
          itemCd: params.item_code,
          rsdQty: params.quantity || 0,
          pchsStkQty: params.purchase_qty || 0,
          saleQty: params.sale_qty || 0,
          adjQty: params.adj_qty || 0,
          stockItemList: params.stock_items || [],
          regrNm: params.user_name || 'Admin',
          regrId: params.user_id || 'Admin',
          modrNm: params.user_name || 'Admin',
          modrId: params.user_id || 'Admin',
        });
        break;
      }

      case 'get_stock_items': {
        result = await vsdcPost(creds, 'stock/selectStockItems', {
          lastReqDt: params.last_req_dt || '20231215000000',
        });
        break;
      }

      case 'save_stock_master': {
        result = await vsdcPost(creds, 'stockMaster/saveStockMaster', {
          itemCd: params.item_code,
          rsdQty: params.residual_qty || 0,
          pchsStkQty: params.purchase_stock_qty || 0,
          saleQty: params.sale_qty || 0,
          adjQty: params.adjustment_qty || 0,
          regrNm: params.user_name || 'Admin',
          regrId: params.user_id || 'Admin',
          modrNm: params.user_name || 'Admin',
          modrId: params.user_id || 'Admin',
        });
        break;
      }

      // =====================================================
      // Legacy: Health Check (kept for backward compat)
      // =====================================================
      case 'health_check': {
        // The official spec uses init_device for health; we try a lightweight call
        result = await vsdcPost(creds, 'initializer/selectInitInfo', {
          dvcSrlNo: params.dvc_serial_no || '',
        });
        break;
      }

      // =====================================================
      // Retry failed submission
      // =====================================================
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
        result = await retrySubmission(supabase, creds, logEntry, defaultTaxTyCd, tenant_id, profile);
        break;
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400);
    }

    return jsonResponse(result);

  } catch (error: any) {
    console.error('ZRA Smart Invoice error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
});

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Submit a sale/refund/debit/purchase to ZRA via /trnsSales/saveSales
 * 
 * Per ZRA spec v1.0.7:
 * - rcptTyCd: "S" = Sale, "R" = Credit Note (Refund), "D" = Debit Note, "P" = Purchase
 * - salesTyCd: "N" = Normal Sale, "C" = Copy, "T" = Training, "P" = Proforma
 * - Each item needs: itemCd, itemClsCd, itemNm, qty, prc, splyAmt, vatTaxblAmt, vatAmt, etc.
 */
async function submitSale(
  supabase: any, creds: VsdcCredentials, params: any, defaultTaxTyCd: string, tenantId: string, profile: any
) {
  const {
    invoice_num, items, client_name, client_tpin,
    related_table, related_id, receipt_type, sales_type,
    original_receipt_no, credit_note_reason, payment_method,
  } = params;

  // Map receipt type codes per ZRA spec 6.8
  const rcptTyCd = receipt_type || 'S'; // S=Sale, R=CreditNote, D=DebitNote, P=Purchase

  // Map sales type per ZRA spec 6.7
  const salesTyCd = sales_type || 'N'; // N=Normal, C=Copy, T=Training, P=Proforma

  // Payment type code per ZRA spec 6.9
  const pmtTyCd = mapPaymentMethod(payment_method);

  // Build item list per ZRA spec
  const itemList = (items || []).map((item: any, idx: number) => {
    const qty = item.quantity || 1;
    const prc = item.unit_price || 0;
    const splyAmt = qty * prc;
    // For standard rated (A), VAT is inclusive at 16%
    const vatRate = item.tax_rate || (defaultTaxTyCd === 'A' ? 16 : 0);
    const taxblAmt = vatRate > 0 ? Math.round((splyAmt / (1 + vatRate / 100)) * 100) / 100 : splyAmt;
    const vatAmt = vatRate > 0 ? Math.round((splyAmt - taxblAmt) * 100) / 100 : 0;

    return {
      itemSeq: idx + 1,
      itemCd: item.item_code || item.sku || item.id || `ITEM${idx + 1}`,
      itemClsCd: item.item_class_code || '46181500',
      itemNm: item.name || item.product_name || 'Item',
      bcd: item.barcode || null,
      pkgUnitCd: item.pkg_unit || 'NT',
      qtyUnitCd: item.qty_unit || 'U',
      qty: qty,
      prc: prc,
      splyAmt: splyAmt,
      dcRt: item.discount_rate || 0,
      dcAmt: item.discount_amount || 0,
      vatCatCd: item.vat_cat || defaultTaxTyCd,
      iplCatCd: item.ipl_cat || null,
      tlCatCd: item.tl_cat || null,
      exciseTxCatCd: item.excise_cat || null,
      vatTaxblAmt: taxblAmt,
      vatAmt: vatAmt,
      iplTaxblAmt: 0,
      iplAmt: 0,
      tlTaxblAmt: 0,
      tlAmt: 0,
      exciseTaxblAmt: 0,
      exciseAmt: 0,
      totAmt: splyAmt,
    };
  });

  // Calculate totals
  const totItemCnt = itemList.length;
  const taxblAmtA = itemList.filter((i: any) => i.vatCatCd === 'A').reduce((s: number, i: any) => s + i.vatTaxblAmt, 0);
  const taxAmtA = itemList.filter((i: any) => i.vatCatCd === 'A').reduce((s: number, i: any) => s + i.vatAmt, 0);
  const taxblAmtD = itemList.filter((i: any) => i.vatCatCd === 'D').reduce((s: number, i: any) => s + i.splyAmt, 0);
  const totTaxblAmt = itemList.reduce((s: number, i: any) => s + i.vatTaxblAmt, 0);
  const totTaxAmt = itemList.reduce((s: number, i: any) => s + i.vatAmt, 0);
  const totAmt = itemList.reduce((s: number, i: any) => s + i.totAmt, 0);

  const now = new Date();
  const salesDt = formatZraDate(now);

  const salePayload: Record<string, any> = {
    tpin: creds.tpin,
    bhfId: creds.bhfId,
    orgInvcNo: original_receipt_no ? Number(original_receipt_no) : 0,
    cisInvcNo: invoice_num || '',
    custTpin: client_tpin || null,
    custNm: client_name || 'Walk-in Customer',
    salesTyCd: salesTyCd,
    rcptTyCd: rcptTyCd,
    pmtTyCd: pmtTyCd,
    salesSttsCd: '02', // 02 = Approved
    cfmDt: salesDt,
    salesDt: salesDt,
    stockRlsDt: null,
    cnclReqDt: null,
    cnclDt: null,
    rfdDt: rcptTyCd === 'R' ? salesDt : null,
    rfdRsnCd: credit_note_reason || (rcptTyCd === 'R' ? '01' : null),
    totItemCnt: totItemCnt,
    taxblAmtA: taxblAmtA,
    taxblAmtB: 0,
    taxblAmtC1: 0,
    taxblAmtC2: 0,
    taxblAmtC3: 0,
    taxblAmtD: taxblAmtD,
    taxblAmtE: 0,
    taxblAmtRvat: 0,
    taxRtA: 16,
    taxRtB: 16,
    taxRtC1: 0,
    taxRtC2: 0,
    taxRtC3: 0,
    taxRtD: 0,
    taxRtRvat: 16,
    taxAmtA: taxAmtA,
    taxAmtB: 0,
    taxAmtC1: 0,
    taxAmtC2: 0,
    taxAmtC3: 0,
    taxAmtD: 0,
    taxAmtE: 0,
    taxAmtRvat: 0,
    totTaxblAmt: totTaxblAmt,
    totTaxAmt: totTaxAmt,
    totAmt: totAmt,
    prchrAcptcYn: rcptTyCd === 'P' ? 'Y' : 'N',
    remark: params.remark || null,
    regrNm: params.user_name || 'Admin',
    regrId: params.user_id || 'Admin',
    modrNm: params.user_name || 'Admin',
    modrId: params.user_id || 'Admin',
    receipt: {
      custTpin: client_tpin || null,
      custMblNo: params.client_phone || null,
      rptNo: 0,
      trdeNm: profile.company_name || creds.tpin,
      adrs: profile.company_address || null,
      topMsg: 'Thank you for your purchase',
      btmMsg: 'Goods once sold are not returnable',
      prchrAcptcYn: rcptTyCd === 'P' ? 'Y' : 'N',
    },
    itemList: itemList,
  };

  // Create log entry
  const flagMap: Record<string, string> = { 'S': 'INVOICE', 'R': 'REFUND', 'D': 'DEBIT', 'P': 'PURCHASE' };
  const { data: logEntry } = await supabase
    .from('zra_invoice_log')
    .insert({
      tenant_id: tenantId,
      invoice_num: invoice_num || '',
      flag: flagMap[rcptTyCd] || rcptTyCd,
      status: 'pending',
      related_table: related_table || null,
      related_id: related_id || null,
    })
    .select()
    .single();

  try {
    const response = await fetch(`${creds.vsdcUrl}/trnsSales/saveSales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(salePayload),
    });
    const responseData = await response.json();

    const isSuccess = responseData?.resultCd === '000';

    // Extract fiscal data from response
    const fiscalData = {
      ysdcid: responseData?.data?.sdcId || null,
      ysdcintdata: responseData?.data?.intrlData || null,
      ysdcregsig: responseData?.data?.rcptSign || null,
      ysdcrecnum: responseData?.data?.rcptNo?.toString() || null,
      ysdctime: responseData?.data?.sdcDateTime || null,
      qr_code: responseData?.data?.qrCodeUrl || null,
    };

    if (logEntry) {
      await supabase
        .from('zra_invoice_log')
        .update({
          status: isSuccess ? 'success' : 'failed',
          zra_response: responseData,
          fiscal_data: isSuccess ? fiscalData : null,
          error_message: isSuccess ? null : (responseData?.resultMsg || 'Unknown error'),
        })
        .eq('id', logEntry.id);
    }

    return {
      success: isSuccess,
      fiscal_data: isSuccess ? fiscalData : null,
      log_id: logEntry?.id,
      zra_message: responseData?.resultMsg,
      result_code: responseData?.resultCd,
    };

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
  supabase: any, creds: VsdcCredentials, logEntry: any, defaultTaxTyCd: string, tenantId: string, profile: any
) {
  let items: any[] = [];
  let clientName: string | null = null;
  let clientTpin: string | null = null;

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

  const receiptTypeMap: Record<string, string> = { 'INVOICE': 'S', 'REFUND': 'R', 'DEBIT': 'D', 'PURCHASE': 'P' };

  return submitSale(supabase, creds, {
    invoice_num: logEntry.invoice_num,
    items,
    client_name: clientName,
    client_tpin: clientTpin,
    related_table: logEntry.related_table,
    related_id: logEntry.related_id,
    receipt_type: receiptTypeMap[logEntry.flag] || 'S',
  }, defaultTaxTyCd, tenantId, profile);
}

/** Map our payment methods to ZRA payment type codes (spec 6.9) */
function mapPaymentMethod(method: string | undefined): string {
  switch (method) {
    case 'cash': return '01';
    case 'credit': case 'credit_invoice': return '02';
    case 'bank_transfer': case 'bank': return '03';
    case 'mobile_money': case 'momo': return '04';
    case 'card': case 'debit_card': case 'credit_card': return '05';
    default: return '01'; // Default to cash
  }
}

/** Format date to ZRA format: YYYYMMDDHHmmss */
function formatZraDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${y}${m}${d}${h}${min}${s}`;
}
