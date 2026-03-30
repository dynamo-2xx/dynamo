import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { transcriptChunk, existingMap, sides, currentSubtopic, speakerSide, mode, fullTranscript } = await req.json();

    // Live conversation mode — summarize + identify subtopics
    if (mode === "live_conversation") {
      const systemPrompt = `You are an AI conversation analyst. Analyze the provided transcript from a live conversation with multiple speakers (labeled Speaker 1, Speaker 2, etc.).

Your job:
1. Identify distinct subtopics/themes discussed in the conversation. If only one topic was discussed, that's fine — use one subtopic. If no clear subtopics emerge, use "General Discussion" as the subtopic.
2. For each subtopic, generate a subtopic-specific summary that captures the key points discussed under that theme. Each subtopic summary MUST reflect all speakers' contributions fairly and evenly — do not favor one speaker over another.
3. For each transcript entry, assign it to one of the identified subtopics.

Rules:
- ALWAYS generate subtopic summaries if there is any substantive speech content, even if brief
- Be concise but capture substance
- Identify speakers by their labels (Speaker 1, Speaker 2, etc.)
- Every transcript entry MUST be assigned to a subtopic (never leave entries unassigned)
- Only return empty summary if the transcript is truly empty or contains nothing but greetings/filler
- Return the result using the analyze_conversation tool`;

      const userPrompt = `Transcript entries:
${JSON.stringify(fullTranscript || [], null, 2)}

Analyze this conversation: identify subtopics, assign each entry to a subtopic, and generate a comprehensive summary.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        tools: [
            {
              type: "function",
              function: {
                name: "analyze_conversation",
                description: "Analyze a live conversation transcript",
                parameters: {
                  type: "object",
                  properties: {
                    subtopics: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of distinct subtopic/theme labels identified in the conversation",
                    },
                    entry_subtopic_map: {
                      type: "object",
                      description: "Map of transcript entry IDs to their assigned subtopic label",
                      additionalProperties: { type: "string" },
                    },
                  },
                  required: ["subtopics", "entry_subtopic_map"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "analyze_conversation" } },
        }),
      });

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI usage limit reached" }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ subtopics: [], entry_subtopic_map: {} }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Per-subtopic summary mode
    if (mode === "live_summarize_subtopic") {
      const { subtopic, entries } = await req.json().catch(() => ({ subtopic: "", entries: [] }));

      const sysPrompt = `You are an AI conversation analyst. You will be given transcript entries from a live conversation that all belong to one subtopic. Generate a concise but comprehensive summary that captures the key points discussed under this theme. The summary MUST reflect all speakers' contributions fairly and evenly — do not favor one speaker over another. Identify speakers by their labels (Speaker 1, Speaker 2, etc.). Return the result using the summarize_subtopic tool.`;

      const uPrompt = `Subtopic: "${subtopic}"

Transcript entries for this subtopic:
${JSON.stringify(entries, null, 2)}

Generate a comprehensive summary for this subtopic.`;

      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: sysPrompt },
            { role: "user", content: uPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "summarize_subtopic",
                description: "Return a summary for a single subtopic",
                parameters: {
                  type: "object",
                  properties: {
                    summary: { type: "string", description: "A concise summary of the subtopic discussion" },
                  },
                  required: ["summary"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "summarize_subtopic" } },
        }),
      });

      if (!resp.ok) {
        const status = resp.status;
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI usage limit reached" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await resp.text();
        console.error("AI gateway error:", status, t);
        throw new Error("AI gateway error");
      }

      const d = await resp.json();
      const tc = d.choices?.[0]?.message?.tool_calls?.[0];
      if (tc) {
        const result = JSON.parse(tc.function.arguments);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ summary: "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Default debate mode
    const systemPrompt = `You are an AI debate analyst. Analyze the latest transcript chunk from a live debate and identify structured argument entries.

For each distinct argument or point made, classify it as one of:
- "claim": A new argument or assertion
- "counter": A direct response to a prior argument (include parent_id reference)
- "stake": What the speaker claims is at risk
- "quote": A notable quote worth preserving
- "evidence": Supporting evidence or data cited

Rules:
- Each entry must have: type, speaker_side, content (concise summary), and optionally quote (exact words), parent_id (ID of argument being countered)
- Also produce a short overall summary of the transcript chunk for the back side of the card
- If a speaker responds to an existing argument, thread it as a counter by referencing the parent argument's index
- Be concise but capture the substance
- Preserve the provided speaker side unless the chunk clearly contains multiple speakers
- CRITICAL: If the transcript chunk contains NO substantive arguments, claims, counter-arguments, stakes, evidence, or notable quotes worth analyzing — for example greetings, filler, off-topic chatter, pleasantries, or trivial remarks — you MUST return an empty entries array and an empty string for summary. Do NOT describe the absence of content. Do NOT generate a summary that says there was nothing to summarize.
- Return the result using the extract_arguments tool`;

    const userPrompt = `Current subtopic: "${currentSubtopic}"
Sides: ${sides.join(" vs ")}
Expected speaker side: ${speakerSide || "Unknown"}

Existing argument map entries (for threading counters):
${JSON.stringify(existingMap || [], null, 2)}

New transcript chunk to analyze:
"${transcriptChunk}"

Extract all arguments, quotes, stakes, and counter-arguments from this chunk.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_arguments",
              description: "Extract structured argument entries from transcript",
              parameters: {
                type: "object",
                properties: {
                  entries: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["claim", "counter", "stake", "quote", "evidence"] },
                        speaker_side: { type: "string" },
                        content: { type: "string" },
                        quote: { type: "string" },
                        parent_index: { type: "integer" },
                      },
                      required: ["type", "speaker_side", "content"],
                    },
                  },
                  summary: {
                    type: "string",
                    description: "A concise summary of the key arguments, quotes, or stakes in this chunk for the back side of the transcript card",
                  },
                },
                required: ["entries", "summary"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_arguments" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ entries: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-transcript error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
