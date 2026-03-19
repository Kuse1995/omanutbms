import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find all tenants with daily_summary callback enabled
    const { data: configs, error: configErr } = await supabase
      .from('bms_integration_configs')
      .select('id, tenant_id, callback_url, callback_events, api_secret')
      .eq('is_enabled', true)
      .not('callback_url', 'is', null);

    if (configErr || !configs || configs.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No tenants with active callbacks', dispatched: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    let dispatched = 0;
    const errors: string[] = [];

    for (const config of configs) {
      const enabledEvents = Array.isArray(config.callback_events) ? config.callback_events : [];
      
      if (!enabledEvents.includes('daily_summary')) continue;

      try {
        // Gather daily summary data for this tenant
        const [salesResult, expensesResult, attendanceResult] = await Promise.all([
          supabase
            .from('sales')
            .select('total_amount, payment_method')
            .eq('tenant_id', config.tenant_id)
            .gte('sale_date', startOfDay.toISOString()),
          supabase
            .from('expenses')
            .select('amount_zmw')
            .eq('tenant_id', config.tenant_id)
            .gte('date_incurred', today.toISOString().split('T')[0]),
          supabase
            .from('employee_attendance')
            .select('id')
            .eq('tenant_id', config.tenant_id)
            .eq('date', today.toISOString().split('T')[0]),
        ]);

        const sales = salesResult.data || [];
        const expenses = expensesResult.data || [];

        const totalRevenue = sales.reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0);
        const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount_zmw || 0), 0);
        const netProfit = totalRevenue - totalExpenses;

        const summaryData = {
          date: today.toISOString().split('T')[0],
          sales_count: sales.length,
          total_revenue: totalRevenue,
          total_expenses: totalExpenses,
          net_profit: netProfit,
          staff_present: attendanceResult.data?.length || 0,
          cash_sales: sales.filter((s: any) => s.payment_method === 'Cash').reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0),
          mobile_sales: sales.filter((s: any) => s.payment_method === 'Mobile Money').reduce((sum: number, s: any) => sum + Number(s.total_amount || 0), 0),
        };

        // Fire the callback via the dispatcher
        const callbackPayload = {
          event: 'daily_summary',
          tenant_id: config.tenant_id,
          data: summaryData,
          timestamp: new Date().toISOString(),
        };

        const callbackResponse = await fetch(config.callback_url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.api_secret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(callbackPayload),
        });

        const responseText = await callbackResponse.text();

        // Update last_callback_at
        await supabase
          .from('bms_integration_configs')
          .update({ last_callback_at: new Date().toISOString() })
          .eq('id', config.id);

        // Log the callback
        await supabase.from('bms_api_logs').insert({
          tenant_id: config.tenant_id,
          action: 'callback:daily_summary',
          source: 'scheduled',
          response_status: callbackResponse.ok ? 'success' : 'error',
          execution_time_ms: 0,
          error_message: callbackResponse.ok ? null : responseText.substring(0, 500),
        });

        dispatched++;
      } catch (tenantErr) {
        const errMsg = tenantErr instanceof Error ? tenantErr.message : 'Unknown error';
        errors.push(`${config.tenant_id}: ${errMsg}`);
        console.error(`[daily-summary] Tenant ${config.tenant_id} error:`, tenantErr);
      }
    }

    // Also check for overdue invoices and fire invoice_overdue callbacks
    for (const config of configs) {
      const enabledEvents = Array.isArray(config.callback_events) ? config.callback_events : [];
      if (!enabledEvents.includes('invoice_overdue')) continue;

      try {
        const { data: overdueInvoices } = await supabase
          .from('invoices')
          .select('invoice_number, client_name, total_amount, paid_amount, due_date')
          .eq('tenant_id', config.tenant_id)
          .in('status', ['sent', 'unpaid', 'partial'])
          .lt('due_date', today.toISOString().split('T')[0]);

        if (overdueInvoices && overdueInvoices.length > 0) {
          for (const inv of overdueInvoices.slice(0, 10)) {
            const balance = Number(inv.total_amount) - Number(inv.paid_amount || 0);
            const callbackPayload = {
              event: 'invoice_overdue',
              tenant_id: config.tenant_id,
              data: {
                invoice_number: inv.invoice_number,
                client_name: inv.client_name,
                total_amount: inv.total_amount,
                balance_due: balance,
                due_date: inv.due_date,
              },
              timestamp: new Date().toISOString(),
            };

            await fetch(config.callback_url, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${config.api_secret}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(callbackPayload),
            }).catch(() => {});
          }

          // Log batch
          await supabase.from('bms_api_logs').insert({
            tenant_id: config.tenant_id,
            action: `callback:invoice_overdue`,
            source: 'scheduled',
            response_status: 'success',
            execution_time_ms: 0,
          });
        }
      } catch (e) {
        console.error(`[invoice_overdue] Tenant ${config.tenant_id} error:`, e);
      }
    }

    return new Response(
      JSON.stringify({ success: true, dispatched, errors: errors.length > 0 ? errors : undefined }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Daily summary callback error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
