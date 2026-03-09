import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ActionType =
  | "generate_debate"
  | "opening_statement"
  | "round_summary"
  | "argument_map"
  | "advance_turn"
  | "closing_synthesis";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { action, payload } = (await req.json()) as {
      action: ActionType;
      payload: Record<string, unknown>;
    };

    let systemPrompt = "";
    let userPrompt = "";

    switch (action) {
      case "generate_debate": {
        const { topic } = payload as { topic: string };
        systemPrompt = `You are d., an AI debate architect. Given a topic, generate a structured debate format.
Return a JSON object using the suggest_debate tool with:
- topic: a clear, debatable question  
- subtopics: 2-4 focused sub-questions that break the topic into key angles
- sides: exactly 2 opposing position labels (concise, 1-3 words each)
- turns_per_subtopic: recommended number (1-4)
- time_per_turn: recommended time ("1 min", "2 min", "3 min", or "5 min")`;
        userPrompt = `Generate a structured debate for: "${topic}"`;
        break;
      }

      case "opening_statement": {
        const { topic, subtopics, sides } = payload as {
          topic: string;
          subtopics: string[];
          sides: string[];
        };
        systemPrompt = `You are d., an impartial AI debate facilitator. Be extremely concise — 1-2 sentences maximum. No fluff, no preamble.`;
        userPrompt = `Generate a 1-2 sentence opening for a debate on: "${topic}"
Sides: ${sides.join(" vs ")}

Rules: Maximum 2 sentences total. State the topic and signal the first speaker. Nothing else.`;
        break;
      }

      case "round_summary": {
        const { topic, subtopic, arguments: args } = payload as {
          topic: string;
          subtopic: string;
          arguments: Array<{
            side: string;
            content: string;
            type: string;
          }>;
        };
        systemPrompt = `You are d., an AI debate analyst. You produce precise, no-fluff round summaries that identify the key arguments, direct quotes worth noting, points of agreement, and unresolved tensions. Your summaries are designed for people reviewing the debate record later — they should be cohesive and navigable, not shortened paraphrases.`;
        userPrompt = `Summarize this debate round.

Topic: "${topic}"
Subtopic: "${subtopic}"
Arguments made:
${args.map((a, i) => `[${a.side}] (${a.type}): ${a.content}`).join("\n")}

Return using the round_summary tool with:
- summary: A cohesive 3-6 sentence analysis identifying the core clash points
- key_arguments: Array of the most significant arguments with { side, content, type (claim/counter/stake/quote), significance }`;
        break;
      }

      case "argument_map": {
        const { content, side } = payload as {
          content: string;
          side: string;
        };
        systemPrompt = `You are d.'s argument classifier. Analyze a debate argument and classify it.`;
        userPrompt = `Classify this argument from the "${side}" side:
"${content}"

Return using the classify_argument tool with:
- argument_type: one of "claim", "counter", "stake", "evidence", "concession", "rebuttal"
- key_quote: the most notable phrase if any (null otherwise)
- strength: "strong", "moderate", or "weak"`;
        break;
      }

      case "advance_turn": {
        const { topic, subtopic, previousArguments, nextSide } = payload as {
          topic: string;
          subtopic: string;
          previousArguments: Array<{ side: string; content: string }>;
          nextSide: string;
        };
        systemPrompt = `You are d., the AI facilitator. Generate a brief transition prompt for the next speaker.`;
        userPrompt = `Topic: "${topic}", Subtopic: "${subtopic}"
Previous arguments: ${previousArguments.map((a) => `[${a.side}]: ${a.content}`).join("\n")}
Next speaker is from the "${nextSide}" side.
Generate a 1-2 sentence transition that acknowledges what was said and prompts the next speaker. Be direct and neutral.`;
        break;
      }

      case "closing_synthesis": {
        const { topic, roundSummaries } = payload as {
          topic: string;
          roundSummaries: Array<{ subtopic: string; summary: string }>;
        };
        systemPrompt = `You are d. Generate a closing synthesis that ties together all rounds of a debate. Be analytical, fair to both sides, and identify the strongest arguments, key points of contention, and any emerging consensus.`;
        userPrompt = `Generate a closing synthesis for the debate on: "${topic}"

Round summaries:
${roundSummaries.map((r) => `## ${r.subtopic}\n${r.summary}`).join("\n\n")}

The synthesis should:
1. Identify the strongest arguments from each side
2. Note key points of agreement and contention
3. Highlight any unresolved questions
4. Be 4-8 sentences`;
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    // Build the request body
    const body: Record<string, unknown> = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    // Add tool calling for structured outputs
    if (action === "generate_debate") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "suggest_debate",
            description: "Return a structured debate format",
            parameters: {
              type: "object",
              properties: {
                topic: { type: "string" },
                subtopics: { type: "array", items: { type: "string" } },
                sides: {
                  type: "array",
                  items: { type: "string" },
                  minItems: 2,
                  maxItems: 2,
                },
                turns_per_subtopic: { type: "integer" },
                time_per_turn: { type: "string" },
              },
              required: [
                "topic",
                "subtopics",
                "sides",
                "turns_per_subtopic",
                "time_per_turn",
              ],
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = {
        type: "function",
        function: { name: "suggest_debate" },
      };
    } else if (action === "round_summary") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "round_summary",
            description: "Return a structured round summary",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string" },
                key_arguments: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      side: { type: "string" },
                      content: { type: "string" },
                      type: { type: "string" },
                      significance: { type: "string" },
                    },
                    required: ["side", "content", "type", "significance"],
                  },
                },
              },
              required: ["summary", "key_arguments"],
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = {
        type: "function",
        function: { name: "round_summary" },
      };
    } else if (action === "argument_map") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "classify_argument",
            description: "Classify a debate argument",
            parameters: {
              type: "object",
              properties: {
                argument_type: {
                  type: "string",
                  enum: [
                    "claim",
                    "counter",
                    "stake",
                    "evidence",
                    "concession",
                    "rebuttal",
                  ],
                },
                key_quote: { type: "string", nullable: true },
                strength: {
                  type: "string",
                  enum: ["strong", "moderate", "weak"],
                },
              },
              required: ["argument_type", "strength"],
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = {
        type: "function",
        function: { name: "classify_argument" },
      };
    }

    // For non-tool-calling actions, just stream text
    if (
      action === "opening_statement" ||
      action === "advance_turn" ||
      action === "closing_synthesis"
    ) {
      body.stream = true;
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        const status = response.status;
        if (status === 429) {
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (status === 402) {
          return new Response(
            JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        throw new Error("AI gateway error");
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Tool-calling (non-streaming)
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();

    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: return content
    const content = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-facilitator error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
