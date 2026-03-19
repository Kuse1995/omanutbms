import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// HMAC-SHA256 signature generation for webhook payload verification
async function generateHmacSignature(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Calculate exponential backoff delay
function getRetryDelay(attempt: number): number {
  // 30s, 2m, 8m, 32m, 2h
  return Math.min(30 * Math.pow(4, attempt), 7200) * 1000;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    const bearer = authHeader?.replace('Bearer ', '');
    if (bearer !== SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Mode 1: Process retry queue
    if (body.mode === 'process_retry_queue') {
      return await processRetryQueue(supabase);
    }

    const { event, tenant_id, data } = body;

    if (!event || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing event or tenant_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Build callback payload
    const callbackPayload = {
      event,
      tenant_id,
      data: data || {},
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(callbackPayload);

    // Generate HMAC-SHA256 signature
    const signature = await generateHmacSignature(config.api_secret, payloadString);

    // POST the callback to the configured URL
    try {
      const callbackResponse = await fetch(config.callback_url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_secret}`,
          'Content-Type': 'application/json',
          'X-BMS-Signature': signature,
          'X-BMS-Event': event,
          'X-BMS-Timestamp': callbackPayload.timestamp,
          'X-BMS-Version': 'v1',
        },
        body: payloadString,
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

      // If callback failed, queue for retry
      if (!callbackResponse.ok) {
        await queueForRetry(supabase, tenant_id, event, callbackPayload, config.callback_url, config.api_secret, responseText);
      }

      return new Response(
        JSON.stringify({
          success: callbackResponse.ok,
          status: callbackResponse.status,
          event,
          signature_header: 'X-BMS-Signature',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (fetchError) {
      // Network error - queue for retry
      const errorMsg = fetchError instanceof Error ? fetchError.message : 'Network error';
      await queueForRetry(supabase, tenant_id, event, callbackPayload, config.callback_url, config.api_secret, errorMsg);

      await supabase.from('bms_api_logs').insert({
        tenant_id,
        action: `callback:${event}`,
        source: 'callback',
        response_status: 'error',
        execution_time_ms: 0,
        error_message: `Queued for retry: ${errorMsg}`,
      });

      return new Response(
        JSON.stringify({ success: false, queued: true, error: errorMsg, event }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('BMS Callback Dispatcher error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Queue a failed callback for retry with exponential backoff
async function queueForRetry(
  supabase: any, tenantId: string, event: string,
  payload: any, callbackUrl: string, apiSecret: string, errorMsg: string
) {
  try {
    const retryDelay = getRetryDelay(0); // First retry delay
    await supabase.from('callback_queue').insert({
      tenant_id: tenantId,
      event,
      payload,
      callback_url: callbackUrl,
      api_secret: apiSecret,
      attempts: 1, // Already attempted once
      status: 'pending',
      last_error: errorMsg.substring(0, 500),
      next_retry_at: new Date(Date.now() + retryDelay).toISOString(),
    });
  } catch (e) {
    console.error('[queueForRetry] Failed to queue:', e);
  }
}

// Process pending items in the retry queue
async function processRetryQueue(supabase: any) {
  const { data: pendingItems, error } = await supabase
    .from('callback_queue')
    .select('*')
    .in('status', ['pending'])
    .lte('next_retry_at', new Date().toISOString())
    .order('next_retry_at', { ascending: true })
    .limit(20);

  if (error || !pendingItems || pendingItems.length === 0) {
    return new Response(
      JSON.stringify({ success: true, processed: 0, message: 'No pending retries' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  for (const item of pendingItems) {
    // Mark as processing
    await supabase.from('callback_queue').update({ status: 'processing' }).eq('id', item.id);

    try {
      const payloadString = JSON.stringify(item.payload);
      const signature = await generateHmacSignature(item.api_secret, payloadString);

      const response = await fetch(item.callback_url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${item.api_secret}`,
          'Content-Type': 'application/json',
          'X-BMS-Signature': signature,
          'X-BMS-Event': item.event,
          'X-BMS-Timestamp': item.payload.timestamp || new Date().toISOString(),
          'X-BMS-Version': 'v1',
          'X-BMS-Retry': String(item.attempts),
        },
        body: payloadString,
      });

      if (response.ok) {
        await supabase.from('callback_queue').update({
          status: 'completed', completed_at: new Date().toISOString(),
        }).eq('id', item.id);
        succeeded++;
      } else {
        const responseText = await response.text();
        const newAttempts = item.attempts + 1;

        if (newAttempts >= item.max_attempts) {
          await supabase.from('callback_queue').update({
            status: 'failed', attempts: newAttempts,
            last_error: responseText.substring(0, 500),
          }).eq('id', item.id);
          failed++;
        } else {
          const nextDelay = getRetryDelay(newAttempts);
          await supabase.from('callback_queue').update({
            status: 'pending', attempts: newAttempts,
            last_error: responseText.substring(0, 500),
            next_retry_at: new Date(Date.now() + nextDelay).toISOString(),
          }).eq('id', item.id);
        }
      }
    } catch (fetchErr) {
      const newAttempts = item.attempts + 1;
      const errMsg = fetchErr instanceof Error ? fetchErr.message : 'Network error';

      if (newAttempts >= item.max_attempts) {
        await supabase.from('callback_queue').update({
          status: 'failed', attempts: newAttempts, last_error: errMsg,
        }).eq('id', item.id);
        failed++;
      } else {
        const nextDelay = getRetryDelay(newAttempts);
        await supabase.from('callback_queue').update({
          status: 'pending', attempts: newAttempts, last_error: errMsg,
          next_retry_at: new Date(Date.now() + nextDelay).toISOString(),
        }).eq('id', item.id);
      }
    }

    processed++;
  }

  // Log summary
  await supabase.from('bms_api_logs').insert({
    tenant_id: pendingItems[0].tenant_id,
    action: 'callback:retry_queue_processed',
    source: 'scheduled',
    response_status: 'success',
    execution_time_ms: 0,
    error_message: failed > 0 ? `${failed} permanently failed` : null,
  });

  return new Response(
    JSON.stringify({ success: true, processed, succeeded, failed }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
