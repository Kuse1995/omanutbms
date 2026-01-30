import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LENCO_BASE_URL = "https://api.lenco.co/access/v2";

interface PaymentRequest {
  payment_method: "mobile_money" | "card" | "bank_transfer";
  plan: string;
  billing_period: "monthly" | "annual";
  amount: number;
  currency: string;
  // Mobile money specific
  phone_number?: string;
  operator?: string;
  // Card specific (for hosted checkout redirect)
  card_redirect_url?: string;
}

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

    const userId = claimsData.user.id;
    const userEmail = claimsData.user.email || "";

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from("tenant_users")
      .select("tenant_id")
      .eq("user_id", userId)
      .single();

    if (!tenantUser) {
      return new Response(
        JSON.stringify({ error: "No tenant found for user" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = tenantUser.tenant_id;

    // Parse request body
    const body: PaymentRequest = await req.json();
    const { payment_method, plan, billing_period, amount, currency, phone_number, operator, card_redirect_url } = body;

    // Generate unique reference
    const reference = `SUB-${tenantId.slice(0, 8)}-${Date.now()}`;

    // Create pending subscription payment record
    const { data: paymentRecord, error: insertError } = await supabase
      .from("subscription_payments")
      .insert({
        tenant_id: tenantId,
        amount,
        currency,
        payment_method,
        status: "pending",
        plan_selected: plan,
        billing_period,
        lenco_reference: reference,
        phone_number: phone_number || null,
        operator: operator || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create payment record:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to initiate payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let lencoResponse: any;

    if (payment_method === "mobile_money") {
      // Mobile Money Collection
      const mobileMoneyPayload = {
        reference,
        amount: amount.toString(),
        currency: currency === "ZMW" ? "ZMW" : "USD",
        accountNumber: phone_number,
        accountName: userEmail,
        narration: `${plan} subscription - ${billing_period}`,
        network: operator?.toUpperCase() || "MTN",
      };

      const response = await fetch(`${LENCO_BASE_URL}/collections/mobile-money`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lencoSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(mobileMoneyPayload),
      });

      lencoResponse = await response.json();

      if (!response.ok) {
        console.error("Lenco mobile money error:", lencoResponse);
        
        // Update payment record with failure
        await supabase
          .from("subscription_payments")
          .update({ 
            status: "failed",
            failure_reason: lencoResponse.message || "Mobile money request failed"
          })
          .eq("id", paymentRecord.id);

        return new Response(
          JSON.stringify({ 
            error: lencoResponse.message || "Mobile money payment failed",
            details: lencoResponse 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: paymentRecord.id,
          reference,
          status: "pending",
          message: "Please check your phone to authorize the payment",
          lenco_status: lencoResponse.status,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (payment_method === "bank_transfer") {
      // Create Virtual Account for bank transfer
      const virtualAccountPayload = {
        reference,
        amount: amount.toString(),
        currency: currency === "ZMW" ? "ZMW" : "USD",
        accountName: userEmail,
        narration: `${plan} subscription - ${billing_period}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };

      const response = await fetch(`${LENCO_BASE_URL}/virtual-accounts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lencoSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(virtualAccountPayload),
      });

      lencoResponse = await response.json();

      if (!response.ok) {
        console.error("Lenco virtual account error:", lencoResponse);
        
        await supabase
          .from("subscription_payments")
          .update({ 
            status: "failed",
            failure_reason: lencoResponse.message || "Virtual account creation failed"
          })
          .eq("id", paymentRecord.id);

        return new Response(
          JSON.stringify({ 
            error: lencoResponse.message || "Failed to create bank transfer details",
            details: lencoResponse 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update payment record with virtual account details
      await supabase
        .from("subscription_payments")
        .update({ 
          virtual_account_number: lencoResponse.data?.accountNumber,
          virtual_account_bank: lencoResponse.data?.bankName,
        })
        .eq("id", paymentRecord.id);

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: paymentRecord.id,
          reference,
          status: "awaiting_transfer",
          bank_details: {
            account_number: lencoResponse.data?.accountNumber,
            bank_name: lencoResponse.data?.bankName,
            account_name: lencoResponse.data?.accountName,
            amount,
            currency,
            expires_at: lencoResponse.data?.expiresAt,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (payment_method === "card") {
      // Card payment - redirect to Lenco hosted checkout
      const cardPayload = {
        reference,
        amount: amount.toString(),
        currency: currency === "ZMW" ? "ZMW" : "USD",
        email: userEmail,
        narration: `${plan} subscription - ${billing_period}`,
        redirectUrl: card_redirect_url || `${req.headers.get("origin")}/dashboard?payment=complete`,
      };

      const response = await fetch(`${LENCO_BASE_URL}/collections/card/initialize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lencoSecretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cardPayload),
      });

      lencoResponse = await response.json();

      if (!response.ok) {
        console.error("Lenco card error:", lencoResponse);
        
        await supabase
          .from("subscription_payments")
          .update({ 
            status: "failed",
            failure_reason: lencoResponse.message || "Card payment initialization failed"
          })
          .eq("id", paymentRecord.id);

        return new Response(
          JSON.stringify({ 
            error: lencoResponse.message || "Card payment failed",
            details: lencoResponse 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          payment_id: paymentRecord.id,
          reference,
          status: "redirect",
          redirect_url: lencoResponse.data?.authorizationUrl || lencoResponse.data?.checkoutUrl,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid payment method" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Payment error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
