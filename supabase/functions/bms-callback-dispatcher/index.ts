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
    // Only allow service-role calls (from triggers/scheduled jobs)
    const authHeader = req.headers.get('Authorization');
    const bearer = authHeader?.replace('Bearer ', '');
    if (bearer !== SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { event, tenant_id, data } = await req.json();

    if (!event || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing event or tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get tenant's BMS integration config
    const { data: config, error: configErr } = await supabase
      .from('bms_integration_configs')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_enabled', true)
      .maybeSingle();

    if (configErr || !config) {
      return new Response(
        JSON.stringify({ success: false, error: 'BMS integration not configured or disabled for this tenant' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!config.callback_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'No callback URL configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this event type is enabled
    const enabledEvents = Array.isArray(config.callback_events) ? config.callback_events : [];
    if (!enabledEvents.includes(event)) {
      return new Response(
        JSON.stringify({ success: false, error: `Event "${event}" is not enabled for this tenant` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST the callback to the configured URL
    const callbackPayload = {
      event,
      tenant_id,
      data: data || {},
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
      tenant_id,
      action: `callback:${event}`,
      source: 'callback',
      response_status: callbackResponse.ok ? 'success' : 'error',
      execution_time_ms: 0,
      error_message: callbackResponse.ok ? null : responseText.substring(0, 500),
    });

    return new Response(
      JSON.stringify({
        success: callbackResponse.ok,
        status: callbackResponse.status,
        event,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('BMS Callback Dispatcher error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
