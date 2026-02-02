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

    // Verify user is authenticated
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if secret key is configured
    if (!lencoSecretKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          status: 500,
          message: "LENCO_SECRET_KEY is not configured in secrets",
          key_configured: false,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Test the key by calling accounts endpoint
    const response = await fetch(`${LENCO_BASE_URL}/accounts`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${lencoSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    const responseData = await response.json();

    if (response.ok) {
      // Key is valid
      const accountCount = Array.isArray(responseData.data) ? responseData.data.length : 0;
      
      return new Response(
        JSON.stringify({
          ok: true,
          status: response.status,
          message: "Lenco API key is valid and working",
          key_configured: true,
          account_count: accountCount,
          environment: lencoSecretKey.startsWith("sk_test_") ? "sandbox" : "live",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Key is invalid or other error
      return new Response(
        JSON.stringify({
          ok: false,
          status: response.status,
          message: responseData.message || "API key validation failed",
          key_configured: true,
          error_code: responseData.errorCode,
          environment: lencoSecretKey.startsWith("sk_test_") ? "sandbox" : "live",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Diagnostics error:", error);
    return new Response(
      JSON.stringify({
        ok: false,
        status: 500,
        message: error instanceof Error ? error.message : "Internal server error",
        key_configured: !!Deno.env.get("LENCO_SECRET_KEY"),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
