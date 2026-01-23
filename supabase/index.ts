import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ticketId, projectName, issueCase, assignedTo, snUnit, customerPhone, salesName, activityLog } = await req.json();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "pts.ivp2025@gmail.com",
        pass: "P@ssw0rd2025@",
      },
    });

    const mailOptions = {
      from: "pts.ivp2025@gmail.com",
      to: "dhany-wp@indovisual.co.id",
      subject: `[Team Services] New Ticket Assigned: ${projectName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #EF4444; border-bottom: 2px solid #EF4444; padding-bottom: 10px;">New Ticket Assignment</h2>
          
          <p style="font-size: 16px;">Dear Team Services,</p>
          <p>Mohon dibantu pengecekan case dari detail di bawah ini:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Project Name</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${projectName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Issue Case</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${issueCase}</td>
            </tr>
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">SN Unit</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${snUnit}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Customer Phone</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${customerPhone}</td>
            </tr>
            <tr style="background-color: #f3f4f6;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Sales Name</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${salesName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Assigned To</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${assignedTo}</td>
            </tr>
            <tr style="background-color: #fff3cd;">
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Activity Log</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${activityLog}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px;">Silakan cek dashboard ticketing untuk melihat detail lengkap.</p>
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
          
          <p style="font-size: 14px; color: #666;">
            Best Regards,<br>
            <strong>PTS IVP System</strong>
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return new Response(JSON.stringify({ success: true, message: "Email sent successfully" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Email Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      details: "Failed to send email notification"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
