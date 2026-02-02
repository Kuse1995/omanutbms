import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LENCO_BASE_URL = "https://api.lenco.co/access/v2";

type CurrencyInput =
  | string
  | {
      currencyCode?: string;
      currency_code?: string;
      code?: string;
    };

interface PaymentRequest {
  payment_method: "mobile_money" | "card" | "bank_transfer";
  plan: string;
  billing_period: "monthly" | "annual";
  amount: number;
  currency: CurrencyInput;
  // Mobile money specific
  phone_number?: string;
  operator?: string;
  // Card specific (for hosted checkout redirect)
  card_redirect_url?: string;
}

function normalizeCurrency(input: CurrencyInput): string {
  if (typeof input === "string") return input;
  return (
    input?.currencyCode ||
    input?.currency_code ||
    input?.code ||
    "USD"
  );
}

async function provisionTenantForUser(params: {
  // NOTE: In Edge Functions we don't have generated DB types, so keep this untyped.
  admin: any;
  userId: string;
  userEmail: string;
  defaultPlanKey: string;
}) {
  const { admin, userId, userEmail, defaultPlanKey } = params;

  // Double-check in case another request created membership concurrently.
  const { data: existingMembership } = await admin
    .from("tenant_users")
    .select("tenant_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existingMembership?.tenant_id) return existingMembership.tenant_id as string;

  const emailPrefix = (userEmail || "user").split("@")[0] || "user";
  const slugBase = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  const slug = `${slugBase || "tenant"}-${crypto.randomUUID().slice(0, 8)}`;
  const orgName = `${emailPrefix}'s Organization`;

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ name: orgName, slug })
    .select("id")
    .single();

  if (tenantError || !tenant?.id) {
    console.error("Failed to create tenant:", tenantError);
    throw new Error("Failed to create subscription account");
  }

  const tenantId = tenant.id as string;

  // Give user admin role + ownership in their new tenant
  await admin.from("tenant_users").insert({
    tenant_id: tenantId,
    user_id: userId,
    role: "admin",
    is_owner: true,
    can_access_all_branches: true,
  });

  // Ensure role exists in role table as well (idempotent via unique constraint)
  await admin.from("user_roles").insert({ user_id: userId, role: "admin" });

  // Create business profile (defaults to trial)
  const trialExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  await admin.from("business_profiles").insert({
    tenant_id: tenantId,
    company_name: orgName,
    company_email: userEmail || null,
    billing_status: "trial",
    billing_plan: defaultPlanKey,
    trial_expires_at: trialExpiresAt,
    inventory_enabled: true,
    payroll_enabled: true,
    website_enabled: true,
    impact_enabled: true,
    agents_enabled: true,
    tax_enabled: true,
  });

  // Optional: keep stats table in sync if present
  try {
    await admin.from("tenant_statistics").insert({ tenant_id: tenantId });
  } catch (_e) {
    // Ignore if table/policy isn't available in this environment
  }

  return tenantId;
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
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
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

    // Resolve tenant (or auto-provision one if missing)
    let tenantId: string | null = null;

    try {
      const { data: ensuredTenantId, error: ensureErr } = await supabase.rpc(
        "ensure_tenant_membership"
      );
      if (!ensureErr && ensuredTenantId) tenantId = ensuredTenantId as string;
    } catch (e) {
      console.warn("ensure_tenant_membership failed:", e);
    }

    if (!tenantId) {
      const { data: tenantUserRow } = await supabase
        .from("tenant_users")
        .select("tenant_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (tenantUserRow?.tenant_id) tenantId = tenantUserRow.tenant_id as string;
    }

    if (!tenantId) {
      if (!supabaseServiceRoleKey) {
        return new Response(
          JSON.stringify({
            error: "Account provisioning unavailable",
            code: "PROVISIONING_NOT_CONFIGURED",
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
      tenantId = await provisionTenantForUser({
        admin: admin as any,
        userId,
        userEmail,
        defaultPlanKey: "growth",
      });
    }

    // Parse request body
    const body: PaymentRequest = await req.json();
    const { payment_method, plan, billing_period, amount, currency, phone_number, operator, card_redirect_url } = body;
    const currencyCode = normalizeCurrency(currency);

    // Generate unique reference
    const reference = `SUB-${tenantId.slice(0, 8)}-${Date.now()}`;

    // Create pending subscription payment record
    const { data: paymentRecord, error: insertError } = await supabase
      .from("subscription_payments")
      .insert({
        tenant_id: tenantId,
        amount,
        currency: currencyCode,
        payment_method,
        status: "pending",
        plan_key: plan,
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
      // Normalize phone number for Lenco (remove + prefix, ensure 260 prefix)
      let normalizedPhone = phone_number || "";
      if (normalizedPhone.startsWith("+")) {
        normalizedPhone = normalizedPhone.slice(1);
      }
      if (!normalizedPhone.startsWith("260") && normalizedPhone.length === 9) {
        normalizedPhone = `260${normalizedPhone}`;
      }
      
      // Mobile Money Collection
      const mobileMoneyPayload = {
        reference,
        amount: amount.toString(),
        currency: currencyCode === "ZMW" ? "ZMW" : "USD",
        accountNumber: normalizedPhone,
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
        currency: currencyCode === "ZMW" ? "ZMW" : "USD",
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
        currency: currencyCode === "ZMW" ? "ZMW" : "USD",
        email: userEmail,
        narration: `${plan} subscription - ${billing_period}`,
        redirectUrl: card_redirect_url || `${req.headers.get("origin")}/bms?payment=complete`,
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
