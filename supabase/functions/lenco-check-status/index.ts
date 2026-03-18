import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LENCO_BASE_URL = "https://api.lenco.co/access/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const lencoSecretKey = Deno.env.get("LENCO_SECRET_KEY");

    if (!lencoSecretKey) {
      return new Response(
        JSON.stringify({ error: "Payment service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { payment_id, reference } = await req.json();

    if (!payment_id && !reference) {
      return new Response(
        JSON.stringify({ error: "payment_id or reference required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get payment record
    let query = supabase.from("subscription_payments").select("*");
    if (payment_id) {
      query = query.eq("id", payment_id);
    } else {
      query = query.eq("lenco_reference", reference);
    }

    const { data: payment, error: findError } = await query.single();

    if (findError || !payment) {
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If already completed or failed, return current status
    if (payment.status === "completed" || payment.status === "failed") {
      return new Response(
        JSON.stringify({
          status: payment.status,
          payment_id: payment.id,
          failure_reason: payment.failure_reason,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build list of possible IDs to try for Lenco lookup
    const metadata = (payment.metadata || {}) as Record<string, unknown>;
    const fullResponse = (metadata.lenco_full_response || {}) as Record<string, unknown>;
    
    // Collect all possible provider IDs
    const possibleIds: string[] = [];
    
    // Priority 1: payment_reference (best candidate)
    if (payment.payment_reference) possibleIds.push(String(payment.payment_reference));
    
    // Priority 2: metadata fields
    if (metadata.lenco_provider_reference) possibleIds.push(String(metadata.lenco_provider_reference));
    if (metadata.lenco_collection_id) possibleIds.push(String(metadata.lenco_collection_id));
    
    // Priority 3: from full stored response
    if (fullResponse.id) possibleIds.push(String(fullResponse.id));
    if (fullResponse.lencoReference) possibleIds.push(String(fullResponse.lencoReference));
    if (fullResponse.collectionId) possibleIds.push(String(fullResponse.collectionId));
    if (fullResponse.transactionId) possibleIds.push(String(fullResponse.transactionId));
    
    // Deduplicate
    const uniqueIds = [...new Set(possibleIds.filter(Boolean))];
    
    console.log("Payment ID:", payment.id);
    console.log("Possible Lenco IDs to try:", JSON.stringify(uniqueIds));
    console.log("Our reference:", payment.lenco_reference);

    let lencoData: any = null;
    let lookupSuccess = false;

    // Strategy 1: Try direct collection lookup with each possible ID
    for (const lookupId of uniqueIds) {
      try {
        const response = await fetch(
          `${LENCO_BASE_URL}/collections/${encodeURIComponent(lookupId)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${lencoSecretKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();
        console.log(`Lenco lookup by ID '${lookupId}':`, response.status, JSON.stringify(data));

        if (response.ok && data.data) {
          lencoData = data;
          lookupSuccess = true;
          break;
        }
      } catch (e) {
        console.error(`Lenco lookup error for ID '${lookupId}':`, e);
      }
    }

    // Strategy 2: Try listing collections filtered by our merchant reference
    if (!lookupSuccess && payment.lenco_reference) {
      try {
        const listResponse = await fetch(
          `${LENCO_BASE_URL}/collections?reference=${encodeURIComponent(payment.lenco_reference)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${lencoSecretKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        const listData = await listResponse.json();
        console.log("Lenco list by reference:", listResponse.status, JSON.stringify(listData));

        if (listResponse.ok) {
          // Check both array and single-object response shapes
          const collections = Array.isArray(listData.data) ? listData.data : (listData.data ? [listData.data] : []);
          if (collections.length > 0) {
            lencoData = { data: collections[0] };
            lookupSuccess = true;

            // Save the discovered provider ID for future lookups
            const discoveredId = collections[0].id || collections[0].lencoReference;
            if (discoveredId && !payment.payment_reference) {
              const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
              await serviceClient
                .from("subscription_payments")
                .update({ payment_reference: String(discoveredId) })
                .eq("id", payment.id);
              console.log("Backfilled payment_reference:", discoveredId);
            }
          }
        }
      } catch (e) {
        console.error("Lenco list collections error:", e);
      }
    }

    // Strategy 3: If no Lenco lookup succeeded, return current status with diagnostic info
    if (!lookupSuccess) {
      console.warn("All Lenco lookups failed for payment:", payment.id);
      return new Response(
        JSON.stringify({
          status: payment.status,
          payment_id: payment.id,
          failure_reason: null,
          lenco_status: null,
          diagnostic: "Unable to reach payment provider for status update. Will retry on next poll.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Process the Lenco response
    let newStatus = payment.status;
    let failureReason = null;

    const lencoStatus = String(lencoData.data.status || "").toLowerCase();
    console.log("Lenco status:", lencoStatus);

    if (lencoStatus === "successful" || lencoStatus === "completed") {
      newStatus = "completed";
    } else if (lencoStatus === "failed" || lencoStatus === "declined" || lencoStatus === "cancelled" || lencoStatus === "canceled") {
      newStatus = "failed";
      failureReason = lencoData.data.reasonForFailure || lencoData.data.failureReason || lencoData.data.reason || "Payment failed";
    } else if (lencoStatus === "expired" || lencoStatus === "timeout") {
      newStatus = "expired";
      failureReason = "Payment request expired";
    } else if (lencoStatus === "insufficient_funds" || lencoStatus === "insufficient-funds") {
      newStatus = "failed";
      failureReason = "Insufficient balance";
    } else if (lencoStatus === "pay-offline" || lencoStatus === "pending" || lencoStatus === "processing") {
      newStatus = "pending";
    }

    // Check reasonForFailure field even if status is still pending
    if (newStatus === "pending" && (lencoData.data.reasonForFailure || lencoData.data.failureReason)) {
      newStatus = "failed";
      failureReason = lencoData.data.reasonForFailure || lencoData.data.failureReason;
      console.log("Detected failure from reason field:", failureReason);
    }

    // Update payment record if status changed
    if (newStatus !== payment.status) {
      const serviceClient = createClient(
        supabaseUrl,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await serviceClient
        .from("subscription_payments")
        .update({
          status: newStatus,
          failure_reason: failureReason,
          verified_at: newStatus === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", payment.id);

      // If completed, activate subscription
      if (newStatus === "completed") {
        const billingStartDate = new Date();
        const billingEndDate = new Date();

        if (payment.billing_period === "annual") {
          billingEndDate.setFullYear(billingEndDate.getFullYear() + 1);
        } else {
          billingEndDate.setMonth(billingEndDate.getMonth() + 1);
        }

        const { error: activationError } = await serviceClient
          .from("business_profiles")
          .update({
            billing_status: "active",
            billing_plan: payment.plan_key || "growth",
            billing_start_date: billingStartDate.toISOString(),
            billing_end_date: billingEndDate.toISOString(),
            trial_expires_at: null,
            deactivated_at: null, // Clear deactivation / grace period
          })
          .eq("tenant_id", payment.tenant_id);

        if (activationError) {
          console.error("Failed to activate subscription:", activationError);
        } else {
          console.log(`Subscription activated for tenant ${payment.tenant_id}, plan: ${payment.plan_key}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: newStatus,
        payment_id: payment.id,
        failure_reason: failureReason,
        lenco_status: lencoData.data?.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Check status error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
