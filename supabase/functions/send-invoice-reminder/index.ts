import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");



const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceReminderRequest {
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Invoice reminder function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      invoiceNumber,
      clientName,
      clientEmail,
      amount,
      dueDate,
      daysOverdue,
      companyName = "Finch Investments Limited",
      companyEmail = "info.finchinvestments@gmail.com",
      companyPhone = "+260 956 905 652",
    }: InvoiceReminderRequest = await req.json();

    console.log(`Sending reminder for invoice ${invoiceNumber} to ${clientEmail}`);

    if (!clientEmail) {
      throw new Error("Client email is required");
    }

    const urgencyLevel = daysOverdue > 60 ? "urgent" : daysOverdue > 30 ? "important" : "friendly";
    
    const subjectLine = urgencyLevel === "urgent"
      ? `URGENT: Invoice ${invoiceNumber} is seriously overdue`
      : urgencyLevel === "important"
      ? `Important: Invoice ${invoiceNumber} payment reminder`
      : `Friendly reminder: Invoice ${invoiceNumber} payment due`;

    const urgencyMessage = urgencyLevel === "urgent"
      ? `<p style="color: #dc2626; font-weight: bold;">This invoice is now ${daysOverdue} days overdue. Please arrange payment immediately to avoid further action.</p>`
      : urgencyLevel === "important"
      ? `<p style="color: #ea580c;">This invoice is ${daysOverdue} days past due. Please prioritize payment at your earliest convenience.</p>`
      : `<p>This is a friendly reminder that payment for this invoice is now due.</p>`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #004B8D 0%, #0077B6 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${companyName}</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Payment Reminder</p>
        </div>
        
        <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="color: #1e3a5f; margin-top: 0;">Dear ${clientName},</h2>
          
          ${urgencyMessage}
          
          <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #004B8D; margin-top: 0; border-bottom: 2px solid #004B8D; padding-bottom: 10px;">Invoice Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Invoice Number:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Amount Due:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right; color: #dc2626; font-size: 18px;">K${amount.toLocaleString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Due Date:</td>
                <td style="padding: 8px 0; text-align: right;">${dueDate}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Days Overdue:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right; color: ${daysOverdue > 30 ? '#dc2626' : '#ea580c'};">${daysOverdue} days</td>
              </tr>
            </table>
          </div>
          
          <p>Please arrange payment at your earliest convenience. If you have already made payment, kindly disregard this reminder and accept our thanks.</p>
          
          <p>If you have any questions regarding this invoice or need to discuss payment arrangements, please don't hesitate to contact us:</p>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Email:</strong> ${companyEmail}</p>
            <p style="margin: 5px 0;"><strong>Phone:</strong> ${companyPhone}</p>
          </div>
          
          <p>Thank you for your prompt attention to this matter.</p>
          
          <p style="margin-bottom: 0;">Best regards,<br><strong>${companyName}</strong></p>
        </div>
        
        <div style="background: #1e3a5f; padding: 20px; text-align: center; border-radius: 0 0 10px 10px;">
          <p style="color: rgba(255,255,255,0.7); margin: 0; font-size: 12px;">
            This is an automated payment reminder from ${companyName}.<br>
            Please do not reply directly to this email.
          </p>
        </div>
      </body>
      </html>
    `;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <onboarding@resend.dev>`,
        to: [clientEmail],
        subject: subjectLine,
        html: emailHtml,
      }),
    });

    const emailData = await emailResponse.json();
    
    if (!emailResponse.ok) {
      throw new Error(emailData.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invoice reminder:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
