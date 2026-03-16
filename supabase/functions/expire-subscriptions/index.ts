import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find all tenants where billing has expired but status is still active
    const now = new Date().toISOString();
    const { data: expiredTenants, error: fetchError } = await supabase
      .from("business_profiles")
      .select("tenant_id, billing_plan, billing_end_date, billing_status")
      .eq("billing_status", "active")
      .not("billing_end_date", "is", null)
      .lt("billing_end_date", now);

    if (fetchError) {
      console.error("Error fetching expired tenants:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch expired tenants" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expiredTenants || expiredTenants.length === 0) {
      console.log("No expired subscriptions found.");
      return new Response(
        JSON.stringify({ message: "No expired subscriptions", deactivated: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiredTenants.length} expired subscription(s):`, 
      expiredTenants.map(t => t.tenant_id));

    const tenantIds = expiredTenants.map(t => t.tenant_id);

    // Deactivate all expired tenants
    const { error: updateError } = await supabase
      .from("business_profiles")
      .update({ billing_status: "inactive" })
      .in("tenant_id", tenantIds);

    if (updateError) {
      console.error("Error deactivating tenants:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to deactivate tenants" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deactivated ${tenantIds.length} expired subscription(s).`);

    return new Response(
      JSON.stringify({
        message: `Deactivated ${tenantIds.length} expired subscription(s)`,
        deactivated: tenantIds.length,
        tenant_ids: tenantIds,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Expire subscriptions error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
