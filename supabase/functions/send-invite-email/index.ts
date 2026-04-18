import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invitation_id, invite_token } = await req.json();

    if (!invitation_id || !invite_token || typeof invite_token !== "string") {
      return new Response(
        JSON.stringify({ error: "invitation_id and invite_token are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch invitation with debate details (invite_token column is always NULL post-trigger;
    // we use the plaintext token passed in by the caller to build the link).
    const { data: invitation, error: invErr } = await supabase
      .from("debate_invitations")
      .select("id, debate_id, side_id, invited_email, invite_token_hash")
      .eq("id", invitation_id)
      .single();

    if (invErr || !invitation) {
      return new Response(
        JSON.stringify({ error: "Invitation not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the supplied plaintext token matches the stored hash before sending the email.
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(invite_token));
    const hash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hash !== invitation.invite_token_hash) {
      return new Response(
        JSON.stringify({ error: "Token does not match invitation" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!invitation.invited_email) {
      return new Response(
        JSON.stringify({ error: "No email address for this invitation" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get debate info
    const { data: debate } = await supabase
      .from("debates")
      .select("topic, created_by")
      .eq("id", invitation.debate_id)
      .single();

    // Get publisher name
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", debate?.created_by)
      .single();

    const publisherName = profile?.display_name || "Someone";
    const debateTopic = debate?.topic || "a debate";

    // Get side label if pre-assigned
    let sideLabel = "";
    if (invitation.side_id) {
      const { data: side } = await supabase
        .from("debate_sides")
        .select("label")
        .eq("id", invitation.side_id)
        .single();
      sideLabel = side?.label || "";
    }

    // Build preview URL with the plaintext token
    const appUrl = Deno.env.get("APP_URL") || supabaseUrl.replace(".supabase.co", ".lovable.app");
    const previewUrl = `${appUrl}/preview/${invite_token}`;

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Dynamo <noreply@resend.dev>",
        to: [invitation.invited_email],
        subject: `You're invited to debate: ${debateTopic}`,
        html: `
          <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px 24px;">
            <h1 style="font-family: Georgia, serif; font-size: 24px; color: #2d1854; margin-bottom: 8px;">
              You're invited to a debate
            </h1>
            <p style="color: #6b5f7d; font-size: 14px; margin-bottom: 24px;">
              <strong>${publisherName}</strong> has invited you to join a structured debate on Dynamo.
            </p>
            <div style="background: #f7f5f2; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
              <p style="font-family: Georgia, serif; font-size: 18px; font-weight: 600; color: #2d1854; margin: 0 0 8px 0;">
                ${debateTopic}
              </p>
              ${sideLabel ? `<p style="color: #5b3e9e; font-size: 13px; margin: 0;">Your assigned side: <strong>${sideLabel}</strong></p>` : ""}
            </div>
            <a href="${previewUrl}" style="display: inline-block; background: #2d1854; color: #f7f5f2; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
              Preview & Join Debate
            </a>
            <p style="color: #9e95a9; font-size: 12px; margin-top: 24px;">
              If you don't have a Dynamo account yet, you'll be able to create one when you preview the debate.
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errData = await emailResponse.text();
      console.error("Resend error:", errData);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
