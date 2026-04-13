import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sessionId, messages, shareToken } = await req.json();
    if (!sessionId || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "sessionId and messages[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch session
    const { data: session, error: fetchErr } = await supabase
      .from("live_sessions")
      .select("transcript_entries, summaries, subtopics, speaker_names, created_by, share_token")
      .eq("id", sessionId)
      .single();

    if (fetchErr || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth: either share token match or JWT owner
    if (shareToken) {
      if (!session.share_token || session.share_token !== shareToken) {
        return new Response(JSON.stringify({ error: "Invalid share token" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey);
      const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
      if (authErr || !user || user.id !== session.created_by) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const entries = session.transcript_entries as any[];
    const subtopics = session.subtopics as string[];
    const speakerNames = session.speaker_names as Record<string, string>;
    const summaries = session.summaries as any[];

    // Build transcript context
    const getSpeakerName = (id: number) => speakerNames[String(id)] || `Speaker ${id + 1}`;

    let transcriptText = "";
    for (const e of entries) {
      const topic = e.subtopic ? ` [Topic: "${e.subtopic}"]` : "";
      const summary = e.ai_summary ? ` | Summary: ${e.ai_summary}` : "";
      transcriptText += `${getSpeakerName(e.speaker_id)}${topic}: ${e.text}${summary}\n`;
    }

    const subtopicList = subtopics.length > 0
      ? `\nSubtopics discussed: ${subtopics.map((s, i) => `${i + 1}. ${s}`).join(", ")}`
      : "";

    const systemPrompt = `You are an AI assistant that answers questions about a recorded conversation transcript. You MUST answer ONLY from the transcript data provided below. If the answer is not in the transcript, say so.

When citing sources, use this exact format:
- For topic references: [Topic: "exact topic name"]
- For specific quotes: [Quote: "speaker name: brief quote snippet"]

These citations will become clickable links for the user. Always include at least one citation per answer when possible.

---
TRANSCRIPT:
${transcriptText}
${subtopicList}
---`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", status, errText);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content || "I couldn't generate a response.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("record-qa error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
