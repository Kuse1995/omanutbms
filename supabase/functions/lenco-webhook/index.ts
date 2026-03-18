import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-lenco-signature",
};

// Simple HMAC verification for webhook signatures
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
    
    return computedSignature === signature;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const webhookSecret = Deno.env.get("LENCO_WEBHOOK_SECRET");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const rawBody = await req.text();
    const signature = req.headers.get("x-lenco-signature") || "";

    // Lenient signature verification
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn("⚠️ Webhook signature mismatch - processing anyway (lenient mode)");
        console.warn("Received signature:", signature.substring(0, 16) + "...");
      } else {
        console.log("✅ Webhook signature verified successfully");
      }
    }

    const payload = JSON.parse(rawBody);
    console.log("Lenco webhook received:", JSON.stringify(payload, null, 2));

    const { event, data } = payload;

    // Skip non-payment events (e.g. transaction.debit is an internal ledger event)
    if (event === "transaction.debit" || event === "transaction.credit") {
      console.log("Skipping ledger event:", event);
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "ledger event" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Extract ALL possible identifiers from the webhook payload
    const reference = data?.reference || data?.merchantReference || data?.merchant_reference || null;
    const lencoReference = data?.lencoReference || data?.lenco_reference || null;
    const lencoId = data?.id || null;
    const phone = data?.creditAccount?.phone || data?.phone || null;
    const amount = data?.amount ? parseFloat(data.amount) : null;

    console.log("Extracted identifiers - reference:", reference, "lencoReference:", lencoReference, "lencoId:", lencoId, "phone:", phone, "amount:", amount);

    // Multi-strategy payment lookup
    let payment: any = null;

    // Strategy 1: Match by our merchant reference (best case)
    if (!payment && reference) {
      const { data: found } = await supabase
        .from("subscription_payments")
        .select("*, tenant_id")
        .eq("lenco_reference", reference)
        .single();
      if (found) {
        payment = found;
        console.log("✅ Matched payment by merchant reference:", reference);
      }
    }

    // Strategy 2: Match by payment_reference (Lenco's lencoReference or id stored at creation)
    if (!payment && lencoReference) {
      const { data: found } = await supabase
        .from("subscription_payments")
        .select("*, tenant_id")
        .eq("payment_reference", lencoReference)
        .single();
      if (found) {
        payment = found;
        console.log("✅ Matched payment by lencoReference:", lencoReference);
      }
    }

    if (!payment && lencoId) {
      const { data: found } = await supabase
        .from("subscription_payments")
        .select("*, tenant_id")
        .eq("payment_reference", lencoId)
        .single();
      if (found) {
        payment = found;
        console.log("✅ Matched payment by lencoId:", lencoId);
      }
    }

    // Strategy 3: Search metadata JSON for matching Lenco IDs
    if (!payment && (lencoReference || lencoId)) {
      const searchTerms = [lencoReference, lencoId].filter(Boolean);
      for (const term of searchTerms) {
        // Search in metadata->lenco_full_response for matching id or lencoReference
        const { data: found } = await supabase
          .from("subscription_payments")
          .select("*, tenant_id")
          .or(`metadata->>lenco_collection_id.eq.${term},metadata->>lenco_provider_reference.eq.${term}`)
          .eq("status", "pending")
          .limit(1)
          .maybeSingle();
        if (found) {
          payment = found;
          console.log("✅ Matched payment by metadata search:", term);
          break;
        }
      }
    }

    // Strategy 4: Match by phone number + amount (last resort for pending payments)
    if (!payment && phone && amount) {
      // Normalize phone: strip leading +, leading 260, or leading 0
      const phoneDigits = phone.replace(/\D/g, "");
      const phoneSuffixes: string[] = [];
      if (phoneDigits.length >= 9) {
        // Last 9 digits are the core number
        phoneSuffixes.push(phoneDigits.slice(-9));
      }

      const { data: candidates } = await supabase
        .from("subscription_payments")
        .select("*, tenant_id")
        .eq("status", "pending")
        .eq("amount", amount)
        .order("created_at", { ascending: false })
        .limit(20);

      if (candidates && candidates.length > 0 && phoneSuffixes.length > 0) {
        const suffix = phoneSuffixes[0];
        payment = candidates.find((c: any) => {
          const cDigits = (c.phone_number || "").replace(/\D/g, "");
          return cDigits.endsWith(suffix);
        });
        if (payment) {
          console.log("✅ Matched payment by phone+amount:", phone, amount);
        }
      }
    }

    if (!payment) {
      console.error("❌ Payment not found. reference:", reference, "lencoReference:", lencoReference, "lencoId:", lencoId, "phone:", phone, "amount:", amount);
      return new Response(
        JSON.stringify({ error: "Payment not found", identifiers: { reference, lencoReference, lencoId, phone, amount } }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Backfill payment_reference if we now have one from the webhook
    if (!payment.payment_reference && (lencoReference || lencoId)) {
      await supabase
        .from("subscription_payments")
        .update({ payment_reference: lencoReference || lencoId })
        .eq("id", payment.id);
      console.log("Backfilled payment_reference:", lencoReference || lencoId);
    }

    let newStatus = "pending";
    let failureReason = null;

    // Map Lenco event types to our status
    switch (event) {
      case "collection.successful":
      case "transfer.successful":
        newStatus = "completed";
        break;
      case "collection.failed":
      case "transfer.failed":
        newStatus = "failed";
        failureReason = data?.reasonForFailure || data?.failureReason || data?.message || "Payment failed";
        break;
      case "collection.pending":
      case "transfer.pending":
        newStatus = "pending";
        break;
      case "collection.expired":
        newStatus = "expired";
        failureReason = "Payment request expired";
        break;
      default:
        console.log("Unhandled event type:", event);
        newStatus = payment.status;
    }

    // Update payment record
    const { error: updateError } = await supabase
      .from("subscription_payments")
      .update({
        status: newStatus,
        failure_reason: failureReason,
        verified_at: newStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", payment.id);

    if (updateError) {
      console.error("Failed to update payment:", updateError);
    }

    // If payment successful, activate the subscription
    if (newStatus === "completed" && payment.tenant_id) {
      const billingStartDate = new Date();
      const billingEndDate = new Date();
      
      if (payment.billing_period === "annual") {
        billingEndDate.setFullYear(billingEndDate.getFullYear() + 1);
      } else {
        billingEndDate.setMonth(billingEndDate.getMonth() + 1);
      }

      const { error: profileError } = await supabase
        .from("business_profiles")
        .update({
          billing_status: "active",
          billing_plan: payment.plan_key || "growth",
          billing_start_date: billingStartDate.toISOString(),
          billing_end_date: billingEndDate.toISOString(),
          trial_expires_at: null,
          deactivated_at: null,
        })
        .eq("tenant_id", payment.tenant_id);

      if (profileError) {
        console.error("Failed to update business profile:", profileError);
      } else {
        console.log(`✅ Subscription activated for tenant ${payment.tenant_id} via webhook (event: ${event})`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus, payment_id: payment.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
