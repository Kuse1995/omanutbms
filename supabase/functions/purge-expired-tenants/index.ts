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

    const gracePeriodDays = 5;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);

    // Find tenants where deactivated_at is older than 5 days
    const { data: expiredTenants, error: fetchError } = await supabase
      .from("business_profiles")
      .select("tenant_id, company_name, deactivated_at")
      .eq("billing_status", "inactive")
      .not("deactivated_at", "is", null)
      .lt("deactivated_at", cutoffDate.toISOString());

    if (fetchError) {
      console.error("Error fetching expired tenants:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch expired tenants" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!expiredTenants || expiredTenants.length === 0) {
      console.log("No tenants past 5-day grace period.");
      return new Response(
        JSON.stringify({ message: "No tenants to purge", purged: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiredTenants.length} tenant(s) past grace period:`,
      expiredTenants.map(t => ({ id: t.tenant_id, name: t.company_name })));

    const purgedIds: string[] = [];
    const errors: string[] = [];

    for (const tenant of expiredTenants) {
      try {
        // Delete tenant — cascades to tenant_users, business_profiles, and all related data
        const { error: deleteError } = await supabase
          .from("tenants")
          .delete()
          .eq("id", tenant.tenant_id);

        if (deleteError) {
          console.error(`Failed to delete tenant ${tenant.tenant_id}:`, deleteError);
          errors.push(`${tenant.tenant_id}: ${deleteError.message}`);
        } else {
          console.log(`Purged tenant: ${tenant.company_name} (${tenant.tenant_id})`);
          purgedIds.push(tenant.tenant_id);
        }
      } catch (err) {
        console.error(`Error purging tenant ${tenant.tenant_id}:`, err);
        errors.push(`${tenant.tenant_id}: ${String(err)}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Purged ${purgedIds.length} tenant(s)`,
        purged: purgedIds.length,
        purged_ids: purgedIds,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Purge expired tenants error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
