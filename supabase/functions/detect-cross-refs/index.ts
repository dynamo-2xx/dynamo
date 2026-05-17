import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You analyze a recorded debate's role-group argument summaries and detect cross-references between nodes (often across subtopics).

You will receive an array of nodes, each with: { node_id, subtopic, thread_id, kind (main|counter|rebuttal|affirms|concedes), speaker, text }.

Return cross-references using the report_cross_refs tool. Each ref has:
- from_node, to_node (string node_ids; must both be in the input)
- kind: one of "contradiction" | "shared_evidence" | "restated"
- confidence: 0..1

Rules:
- Be conservative. Only emit a ref when it is clearly justified by the text.
- contradiction: the two nodes assert directly opposing claims.
- shared_evidence: the two nodes lean on the same fact, statistic, study, or example.
- restated: the two nodes make essentially the same claim in different words.
- Cap to ~3 refs per node, prioritizing higher confidence and contradictions first.
- Do NOT pair a node with itself. Do NOT duplicate (a→b and b→a). Pick a single canonical direction.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { sessionId, nodes } = await req.json();
    if (!sessionId || !Array.isArray(nodes) || nodes.length < 2) {
      return new Response(JSON.stringify({ ok: true, refs: [], skipped: "insufficient_nodes" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Nodes:\n${JSON.stringify(nodes, null, 2)}\n\nReport cross-references now.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "report_cross_refs",
              parameters: {
                type: "object",
                properties: {
                  refs: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        from_node: { type: "string" },
                        to_node: { type: "string" },
                        kind: {
                          type: "string",
                          enum: ["contradiction", "shared_evidence", "restated"],
                        },
                        confidence: { type: "number" },
                      },
                      required: ["from_node", "to_node", "kind"],
                    },
                  },
                },
                required: ["refs"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_cross_refs" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "ai_failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await aiResp.json();
    try {
      const { logAiUsage } = await import("../_shared/usage.ts");
      logAiUsage({
        function_name: "detect-cross-refs",
        model: "google/gemini-2.5-pro",
        usage: data.usage,
        session_id: sessionId,
      });
    } catch (_) {}
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ ok: true, refs: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments) as {
      refs: { from_node: string; to_node: string; kind: string; confidence?: number }[];
    };
    const validIds = new Set(nodes.map((n: any) => n.node_id));
    const refs = (parsed.refs || []).filter(
      (r) =>
        r.from_node !== r.to_node &&
        validIds.has(r.from_node) &&
        validIds.has(r.to_node) &&
        ["contradiction", "shared_evidence", "restated"].includes(r.kind),
    );

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    // Replace existing refs for this session.
    await admin.from("session_cross_refs").delete().eq("session_id", sessionId);
    if (refs.length > 0) {
      await admin.from("session_cross_refs").insert(
        refs.map((r) => ({
          session_id: sessionId,
          from_node: r.from_node,
          to_node: r.to_node,
          kind: r.kind,
          confidence: r.confidence ?? null,
        })),
      );
    }

    return new Response(JSON.stringify({ ok: true, count: refs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("detect-cross-refs error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});