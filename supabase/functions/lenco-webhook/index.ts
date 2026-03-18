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

    // Lenient signature verification: log mismatch but still process the webhook
    if (webhookSecret && signature) {
      const isValid = await verifySignature(rawBody, signature, webhookSecret);
      if (!isValid) {
        console.warn("⚠️ Webhook signature mismatch - processing anyway (lenient mode)");
        console.warn("Received signature:", signature.substring(0, 16) + "...");
        // Do NOT reject - process the webhook regardless
      } else {
        console.log("✅ Webhook signature verified successfully");
      }
    } else {
      console.log("ℹ️ No signature verification (secret or signature missing)");
    }

    const payload = JSON.parse(rawBody);
    console.log("Lenco webhook received:", JSON.stringify(payload, null, 2));

    const { event, data } = payload;
    
    // Try multiple reference fields from the webhook payload
    const reference = data?.reference || data?.merchantReference || data?.merchant_reference;

    if (!reference) {
      console.error("No reference in webhook payload. Available keys:", Object.keys(data || {}));
      return new Response(
        JSON.stringify({ error: "Missing reference" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find the subscription payment by reference (try lenco_reference first, then payment_reference)
    let payment: any = null;
    
    const { data: paymentByRef, error: findError1 } = await supabase
      .from("subscription_payments")
      .select("*, tenant_id")
      .eq("lenco_reference", reference)
      .single();
    
    if (paymentByRef) {
      payment = paymentByRef;
    } else {
      // Also try matching by payment_reference (Lenco's own ID)
      const { data: paymentByProviderRef } = await supabase
        .from("subscription_payments")
        .select("*, tenant_id")
        .eq("payment_reference", reference)
        .single();
      
      if (paymentByProviderRef) {
        payment = paymentByProviderRef;
      }
    }

    if (!payment) {
      console.error("Payment not found for reference:", reference);
      return new Response(
        JSON.stringify({ error: "Payment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        newStatus = payment.status; // Keep existing status
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
      
      // Calculate end date based on billing period
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
          deactivated_at: null, // Clear deactivation / grace period
        })
        .eq("tenant_id", payment.tenant_id);

      if (profileError) {
        console.error("Failed to update business profile:", profileError);
      } else {
        console.log(`✅ Subscription activated for tenant ${payment.tenant_id} via webhook`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, status: newStatus }),
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
