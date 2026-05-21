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
    const body = await req.json();
    const { messages, shareToken } = body;
    // Resolve target: prefer explicit record_type/record_id, fall back to legacy sessionId.
    let recordType: string = body.recordType || "live_session";
    let recordId: string | undefined = body.recordId || body.sessionId;
    if (!recordId || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "recordId and messages[] required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let transcriptText = "";
    let subtopicList = "";

    if (recordType === "live_session") {
      // Fetch session
      const { data: session, error: fetchErr } = await supabase
        .from("live_sessions")
        .select("transcript_entries, summaries, subtopics, speaker_names, created_by, share_token")
        .eq("id", recordId)
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

      const entries = (session.transcript_entries as any[]) || [];
      const subtopics = (session.subtopics as string[]) || [];
      const speakerNames = (session.speaker_names as Record<string, string>) || {};

      const getSpeakerName = (id: number) =>
        speakerNames[String(id)] || `Speaker ${id + 1}`;

      for (const e of entries) {
        const topic = e.subtopic ? ` [Topic: "${e.subtopic}"]` : "";
        const summary = e.ai_summary ? ` | Summary: ${e.ai_summary}` : "";
        transcriptText += `${getSpeakerName(e.speaker_id)}${topic}: ${e.text}${summary}\n`;
      }
      subtopicList = subtopics.length > 0
        ? `\nSubtopics discussed: ${subtopics.map((s, i) => `${i + 1}. ${s}`).join(", ")}`
        : "";
    } else if (recordType === "imported_record") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: visible } = await userClient.rpc("can_view_imported_record", { _id: recordId });
      if (!visible) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: rec } = await supabase
        .from("imported_records")
        .select("title, subtopics, transcript_entries")
        .eq("id", recordId)
        .maybeSingle();
      if (!rec) {
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const entries = (rec.transcript_entries as any[]) || [];
      const subs = (rec.subtopics as any[]) || [];
      transcriptText = `Topic: ${rec.title || "Imported record"}\n\n`;
      for (const e of entries) {
        const topic = e.subtopic ? ` [Topic: "${e.subtopic}"]` : "";
        transcriptText += `${e.speaker_side || "Speaker"}${topic}: ${e.text || ""}\n`;
      }
      subtopicList = subs.length > 0
        ? `\nSubtopics: ${subs.map((s: any, i: number) => `${i + 1}. ${s.title || s}`).join(", ")}`
        : "";
    } else if (recordType === "debate" || recordType === "change_my_mind") {
      // Auth via JWT — viewer must be able to see the debate.
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const token = authHeader.replace("Bearer ", "");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: authErr } = await userClient.auth.getUser(token);
      if (authErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: visible } = await userClient.rpc("can_view_debate", { _debate_id: recordId });
      if (!visible) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build transcript context from arguments + sides + subtopics.
      const [{ data: debate }, { data: sides }, { data: subs }, { data: parts }, { data: args }] =
        await Promise.all([
          supabase.from("debates").select("topic").eq("id", recordId).maybeSingle(),
          supabase.from("debate_sides").select("id, label").eq("debate_id", recordId),
          supabase
            .from("debate_subtopics")
            .select("id, title, sort_order")
            .eq("debate_id", recordId)
            .order("sort_order"),
          supabase
            .from("debate_participants")
            .select("id, side_id, user_id")
            .eq("debate_id", recordId),
          supabase
            .from("arguments")
            .select("id, content, subtopic_id, participant_id, created_at")
            .eq("debate_id", recordId)
            .order("created_at", { ascending: true }),
        ]);

      const sideById: Record<string, string> = {};
      for (const s of (sides || []) as any[]) sideById[s.id] = s.label;
      const partSide: Record<string, string> = {};
      for (const p of (parts || []) as any[]) partSide[p.id] = p.side_id ? sideById[p.side_id] || "" : "";
      const subTitle: Record<string, string> = {};
      for (const s of (subs || []) as any[]) subTitle[s.id] = s.title;

      // Group arguments by subtopic order, then by created_at.
      const subOrder: string[] = ((subs || []) as any[]).map((s) => s.id);
      const sortedArgs = ((args || []) as any[])
        .slice()
        .sort((a, b) => {
          const ai = a.subtopic_id ? subOrder.indexOf(a.subtopic_id) : 9999;
          const bi = b.subtopic_id ? subOrder.indexOf(b.subtopic_id) : 9999;
          if (ai !== bi) return ai - bi;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

      transcriptText = `Topic: ${debate?.topic || "Untitled debate"}\n\n`;
      for (const a of sortedArgs) {
        const speaker = partSide[a.participant_id] || "Speaker";
        const topic = a.subtopic_id && subTitle[a.subtopic_id]
          ? ` [Topic: "${subTitle[a.subtopic_id]}"]`
          : "";
        transcriptText += `${speaker}${topic}: ${a.content}\n`;
      }
      subtopicList = (subs || []).length > 0
        ? `\nSubtopics: ${((subs || []) as any[])
            .map((s, i) => `${i + 1}. ${s.title}`)
            .join(", ")}`
        : "";
    } else {
      return new Response(JSON.stringify({ error: "Unknown recordType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // §18 cost tracking — fire-and-forget
    try {
      const { logAiUsage } = await import("../_shared/usage.ts");
      logAiUsage({
        function_name: "record-qa",
        model: "google/gemini-3-flash-preview",
        usage: aiData.usage,
      });
    } catch (_) { /* swallow */ }

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
