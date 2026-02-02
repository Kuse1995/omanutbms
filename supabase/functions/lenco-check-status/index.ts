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

    // Check status with Lenco API
    const lencoRef = payment.lenco_reference;
    const response = await fetch(`${LENCO_BASE_URL}/collections/${lencoRef}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${lencoSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    const lencoData = await response.json();

    let newStatus = payment.status;
    let failureReason = null;

    if (response.ok && lencoData.data) {
      const lencoStatus = lencoData.data.status?.toLowerCase();
      
      if (lencoStatus === "successful" || lencoStatus === "completed") {
        newStatus = "completed";
      } else if (lencoStatus === "failed") {
        newStatus = "failed";
        // Handle both field naming conventions from Lenco
        failureReason = lencoData.data.reasonForFailure || lencoData.data.failureReason || "Payment failed";
      } else if (lencoStatus === "expired") {
        newStatus = "expired";
        failureReason = "Payment request expired";
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

          // Use plan_key (correct column name)
          await serviceClient
            .from("business_profiles")
            .update({
              billing_status: "active",
              billing_plan: payment.plan_key || "growth",
              billing_start_date: billingStartDate.toISOString(),
              billing_end_date: billingEndDate.toISOString(),
              trial_expires_at: null,
            })
            .eq("tenant_id", payment.tenant_id);
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
