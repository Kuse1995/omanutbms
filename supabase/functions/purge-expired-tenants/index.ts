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

    // ── Phase 1: Archive tenants inactive for 30+ days ──
    const archiveCutoff = new Date();
    archiveCutoff.setDate(archiveCutoff.getDate() - 30);

    const { data: toArchive, error: archiveFetchErr } = await supabase
      .from("business_profiles")
      .select("tenant_id, company_name, deactivated_at")
      .eq("billing_status", "inactive")
      .is("archived_at", null)
      .not("deactivated_at", "is", null)
      .lt("deactivated_at", archiveCutoff.toISOString());

    const archivedIds: string[] = [];
    if (archiveFetchErr) {
      console.error("Error fetching tenants to archive:", archiveFetchErr);
    } else if (toArchive && toArchive.length > 0) {
      console.log(`Archiving ${toArchive.length} tenant(s) past 30-day grace period.`);
      for (const tenant of toArchive) {
        const { error } = await supabase
          .from("business_profiles")
          .update({ archived_at: new Date().toISOString() })
          .eq("tenant_id", tenant.tenant_id);

        if (error) {
          console.error(`Failed to archive tenant ${tenant.tenant_id}:`, error);
        } else {
          console.log(`Archived tenant: ${tenant.company_name} (${tenant.tenant_id})`);
          archivedIds.push(tenant.tenant_id);
        }
      }
    } else {
      console.log("No tenants to archive.");
    }

    // ── Phase 2: Permanently purge tenants archived for 90+ days (120 days total) ──
    const purgeCutoff = new Date();
    purgeCutoff.setDate(purgeCutoff.getDate() - 90);

    const { data: toPurge, error: purgeFetchErr } = await supabase
      .from("business_profiles")
      .select("tenant_id, company_name, archived_at")
      .eq("billing_status", "inactive")
      .not("archived_at", "is", null)
      .lt("archived_at", purgeCutoff.toISOString());

    const purgedIds: string[] = [];
    const errors: string[] = [];

    if (purgeFetchErr) {
      console.error("Error fetching tenants to purge:", purgeFetchErr);
    } else if (toPurge && toPurge.length > 0) {
      console.log(`Purging ${toPurge.length} tenant(s) archived 90+ days ago.`);
      for (const tenant of toPurge) {
        try {
          const { error: deleteError } = await supabase
            .from("tenants")
            .delete()
            .eq("id", tenant.tenant_id);

          if (deleteError) {
            console.error(`Failed to purge tenant ${tenant.tenant_id}:`, deleteError);
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
    } else {
      console.log("No tenants to purge.");
    }

    return new Response(
      JSON.stringify({
        archived: archivedIds.length,
        archived_ids: archivedIds,
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
