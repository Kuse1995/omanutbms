import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function sendReminderEmail(to: string, companyName: string, daysLeft: number, planLabel: string, endDate: string) {
  const urgencyColor = daysLeft <= 3 ? "#dc2626" : "#d97706";
  const urgencyText = daysLeft <= 3 ? "Final Reminder" : "Upcoming Renewal";
  const subject = daysLeft <= 3
    ? `⚠️ ${daysLeft} Days Left — Renew Your Subscription`
    : `📅 Reminder: Your subscription renews in ${daysLeft} days`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #f9fafb; border-radius: 12px;">
      <div style="background: white; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb;">
        <div style="text-align: center; margin-bottom: 24px;">
          <span style="background: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: 600;">${urgencyText}</span>
        </div>
        
        <h1 style="color: #111827; font-size: 24px; margin: 0 0 8px 0; text-align: center;">
          Your subscription expires in <span style="color: ${urgencyColor};">${daysLeft} day${daysLeft !== 1 ? 's' : ''}</span>
        </h1>
        
        <p style="color: #6b7280; text-align: center; margin: 0 0 24px 0;">
          Hi <strong>${companyName}</strong>, your <strong>${planLabel} Plan</strong> subscription ends on <strong>${endDate}</strong>.
        </p>
        
        <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <p style="margin: 0; color: #374151; font-size: 15px;">
            To keep access to all your business data and features, please renew your subscription before the expiry date.
          </p>
        </div>
        
        <div style="text-align: center;">
          <a href="https://omanutbms.lovable.app/dashboard" 
             style="background: #004B8D; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
            Renew Subscription Now
          </a>
        </div>
        
        <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 24px 0 0 0;">
          If you have questions, reply to this email or contact our support team.
        </p>
      </div>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Omanut BMS <noreply@omanutbms.lovable.app>",
      to: [to],
      subject,
      html,
    }),
  });

  return response.ok;
}

async function createInAppAlert(tenantId: string, daysLeft: number, planLabel: string) {
  const message = daysLeft <= 3
    ? `⚠️ Urgent: Your ${planLabel} subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}. Renew now to avoid losing access.`
    : `📅 Reminder: Your ${planLabel} subscription expires in ${daysLeft} days. Renew soon to keep your business running smoothly.`;

  await supabase.from("admin_alerts").insert({
    tenant_id: tenantId,
    alert_type: "subscription_expiry",
    message,
    related_table: "business_profiles",
    is_read: false,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const today = new Date();
    const targets = [7, 3]; // days before expiry to send reminders

    let totalSent = 0;
    let errors: string[] = [];

    for (const daysLeft of targets) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysLeft);
      const targetDateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

      // Find tenants whose billing_end_date matches the target date
      const { data: profiles, error: profilesError } = await supabase
        .from("business_profiles")
        .select("tenant_id, company_name, billing_plan, billing_end_date, billing_status")
        .eq("billing_status", "active")
        .gte("billing_end_date", targetDateStr + "T00:00:00Z")
        .lte("billing_end_date", targetDateStr + "T23:59:59Z");

      if (profilesError) {
        errors.push(`Day ${daysLeft} query error: ${profilesError.message}`);
        continue;
      }

      if (!profiles || profiles.length === 0) continue;

      for (const profile of profiles) {
        try {
          // Get tenant admin email
          const { data: tenantUser } = await supabase
            .from("tenant_users")
            .select("user_id")
            .eq("tenant_id", profile.tenant_id)
            .eq("is_owner", true)
            .single();

          if (!tenantUser) continue;

          const { data: authUser } = await supabase.auth.admin.getUserById(tenantUser.user_id);
          const adminEmail = authUser?.user?.email;

          if (!adminEmail) continue;

          const planLabels: Record<string, string> = {
            starter: "Starter",
            growth: "Growth",
            pro: "Pro",
            enterprise: "Enterprise",
          };
          const planLabel = planLabels[profile.billing_plan] ?? profile.billing_plan;
          const endDateFormatted = new Date(profile.billing_end_date).toLocaleDateString("en-GB", {
            day: "numeric", month: "long", year: "numeric",
          });

          // Send email
          const emailSent = await sendReminderEmail(
            adminEmail,
            profile.company_name ?? "Your Business",
            daysLeft,
            planLabel,
            endDateFormatted,
          );

          // Create in-app alert
          await createInAppAlert(profile.tenant_id, daysLeft, planLabel);

          if (emailSent) totalSent++;
        } catch (err) {
          errors.push(`Tenant ${profile.tenant_id}: ${err}`);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      totalSent,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
