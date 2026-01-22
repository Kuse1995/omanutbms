import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? null;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getClientIp(req: Request): string | null {
  // Common proxy headers (best-effort)
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip") || null;
}

function isStrongPassword(pw: string): boolean {
  // At least 12 chars, contains upper, lower, digit. (Keep simple and predictable.)
  if (pw.length < 12) return false;
  if (!/[a-z]/.test(pw)) return false;
  if (!/[A-Z]/.test(pw)) return false;
  if (!/\d/.test(pw)) return false;
  return true;
}

async function sendPasswordResetNotification(params: {
  toEmail: string;
  companyName?: string;
  ip?: string | null;
}): Promise<void> {
  if (!RESEND_API_KEY) return;

  const { toEmail, companyName = "Omanut BMS", ip } = params;
  const safeIp = ip ? `<p style="margin:0">IP: <code>${ip}</code></p>` : "";

  const html = `
    <!doctype html>
    <html>
      <body style="font-family: Arial, sans-serif; line-height:1.6; color:#111;">
        <h2 style="margin:0 0 12px 0;">Your password was reset</h2>
        <p style="margin:0 0 12px 0;">An administrator reset the password for your account on <strong>${companyName}</strong>.</p>
        ${safeIp}
        <p style="margin:12px 0 0 0;">If you did not expect this, please contact support immediately.</p>
      </body>
    </html>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: `${companyName} <onboarding@resend.dev>`,
      to: [toEmail],
      subject: "Your password was reset",
      html,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.warn("Password reset notification failed:", res.status, txt);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create regular client to verify the requesting user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the requesting user
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can reset passwords" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ip = getClientIp(req);

    // Rate limit: max 10 password reset attempts per admin per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: attemptsInHour, error: rateError } = await supabaseAdmin
      .from("audit_log")
      .select("id", { count: "exact", head: true })
      .eq("table_name", "auth.users")
      .eq("action", "PASSWORD_RESET")
      .eq("changed_by", requestingUser.id)
      .gte("changed_at", oneHourAgo);

    if (!rateError && (attemptsInHour ?? 0) >= 10) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, newPassword } = await req.json();

    if (!email || !newPassword) {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "auth.users",
        record_id: String(email || "unknown"),
        action: "PASSWORD_RESET",
        changed_by: requestingUser.id,
        new_data: {
          email: String(email || ""),
          success: false,
          reason: "missing_fields",
          ip,
        },
      });
      return new Response(
        JSON.stringify({ error: "Email and new password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isStrongPassword(newPassword)) {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "auth.users",
        record_id: String(email),
        action: "PASSWORD_RESET",
        changed_by: requestingUser.id,
        new_data: {
          email: String(email),
          success: false,
          reason: "weak_password",
          ip,
        },
      });
      return new Response(
        JSON.stringify({
          error: "Password must be at least 12 characters and include uppercase, lowercase, and a number",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user by email
    // Note: @supabase/supabase-js admin API doesn't provide getUserByEmail in this runtime,
    // so we page through listUsers with a sane cap.
    const normalizedEmail = String(email).toLowerCase();
    let targetUser: any = null;
    let page = 1;
    const perPage = 1000;
    for (let i = 0; i < 5; i++) { // cap to 5k users
      const { data: usersPage, error: userError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage,
      });

      if (userError) {
        await supabaseAdmin.from("audit_log").insert({
          table_name: "auth.users",
          record_id: String(email),
          action: "PASSWORD_RESET",
          changed_by: requestingUser.id,
          new_data: {
            email: String(email),
            success: false,
            reason: "lookup_failed",
            ip,
          },
        });
        return new Response(
          JSON.stringify({ error: "Failed to lookup user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const users = usersPage?.users ?? [];
      targetUser = users.find((u) => (u.email ?? "").toLowerCase() === normalizedEmail) ?? null;
      if (targetUser) break;
      if (users.length < perPage) break;
      page += 1;
    }

    if (!targetUser) {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "auth.users",
        record_id: String(email),
        action: "PASSWORD_RESET",
        changed_by: requestingUser.id,
        new_data: {
          email: String(email),
          success: false,
          reason: "user_not_found",
          ip,
        },
      });
      return new Response(
        JSON.stringify({ error: "No account found with this email. The user needs to create an account first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update the user's password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUser.id,
      { password: newPassword }
    );

    if (updateError) {
      await supabaseAdmin.from("audit_log").insert({
        table_name: "auth.users",
        record_id: targetUser.id,
        action: "PASSWORD_RESET",
        changed_by: requestingUser.id,
        new_data: {
          email: String(email),
          success: false,
          reason: "update_failed",
          message: updateError.message,
          ip,
        },
      });
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Audit trail (success)
    await supabaseAdmin.from("audit_log").insert({
      table_name: "auth.users",
      record_id: targetUser.id,
      action: "PASSWORD_RESET",
      changed_by: requestingUser.id,
      new_data: {
        email: String(email),
        success: true,
        ip,
        timestamp: new Date().toISOString(),
      },
    });

    // Notify the target user (best-effort)
    if (targetUser.email) {
      await sendPasswordResetNotification({ toEmail: targetUser.email, ip });
    }

    return new Response(
      JSON.stringify({ success: true, message: `Password updated for ${email}` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in reset-user-password:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
