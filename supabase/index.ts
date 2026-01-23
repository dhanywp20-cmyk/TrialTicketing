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
        user: Deno.env.get("SMTP_USER"),
        pass: Deno.env.get("SMTP_PASS"),
      },
    });

    const mailOptions = {
      from: Deno.env.get("SMTP_USER"),
      to: "dhany-wp@indovisual.co.id",
      subject: `[Team Services] New Ticket Assigned: ${projectName}`,
      html: `
        <p>Dear team service</p>
        <p>dibantu pengechekan case dari detail di Bawah</p>
        <br/>
        <p><strong>Project Name :</strong> ${projectName}</p>
        <p><strong>Issue :</strong> ${issueCase}</p>
        <p><strong>SN Unit :</strong> ${snUnit}</p>
        <p><strong>Phone :</strong> ${customerPhone}</p>
        <p><strong>Sales :</strong> ${salesName}</p>
        <p><strong>Activity Log yang terekam :</strong> ${activityLog}</p>
        <br/>
        <p>Check dashboard ticket untuk melihat detail.</p>
        <br/>
        <p>Thanks.</p>
        <p>Best Regards,</p>
        <p>Dhany Wahyu Perdana</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
