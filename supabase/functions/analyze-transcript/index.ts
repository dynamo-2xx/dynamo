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

    const { transcriptChunk, existingMap, sides, currentSubtopic, speakerSide } = await req.json();

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
