import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
  | "closing_synthesis"
  | "resolution_subtopic"
  | "grade_turn"
  | "grade_final";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Require an authenticated caller — prevents anonymous abuse of AI credits.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const token = authHeader.replace("Bearer ", "").trim();
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user?.id) {
      console.error("auth.getUser failed", userError?.message, "tokenLen:", token.length);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
        const { topic, format } = payload as { topic: string; format?: string };
        if (format === "change_my_mind") {
          systemPrompt = `You are d., an AI debate architect. Given a topic the user wants to be challenged on, generate clear subtopics that break the topic into 3-5 distinct angles a challenger might attack from. Return ONLY topic and subtopics via the suggest_debate tool — no sides, no turns, no times.`;
          userPrompt = `Generate Change-My-Mind subtopics for: "${topic}"`;
        } else {
        systemPrompt = `You are d., an AI debate architect. Given a topic, generate a structured debate format.
Return a JSON object using the suggest_debate tool with:
- topic: a clear, debatable question  
- subtopics: 2-4 focused sub-questions that break the topic into key angles
- sides: exactly 2 opposing position labels (concise, 1-3 words each)
- turns_per_subtopic: recommended number (1-4)
- time_per_turn: recommended time ("1 min", "2 min", "3 min", or "5 min")`;
        userPrompt = `Generate a structured debate for: "${topic}"`;
        }
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
        systemPrompt = `You are d., the AI facilitator. Maximum 1 sentence. Be direct.`;
        userPrompt = `Subtopic: "${subtopic}". Next speaker: "${nextSide}".
Write exactly 1 sentence transitioning to the next speaker. No fluff.`;
        break;
      }

      case "closing_synthesis": {
        const { topic, roundSummaries } = payload as {
          topic: string;
          roundSummaries: Array<{ subtopic: string; summary: string }>;
        };
        systemPrompt = `You are d. Generate a concise closing synthesis. Maximum 3-4 sentences.`;
        userPrompt = `Closing synthesis for: "${topic}"

Round summaries:
${roundSummaries.map((r) => `## ${r.subtopic}\n${r.summary}`).join("\n\n")}

In 3-4 sentences: strongest arguments from each side and key unresolved questions.`;
        break;
      }

      case "resolution_subtopic": {
        const { topic, subtopics, sides } = payload as {
          topic: string;
          subtopics: string[];
          sides: string[];
        };
        systemPrompt = `You are d., an AI debate architect specializing in collaborative resolution. You craft a single resolution-oriented subtopic that asks debaters to actively seek compromise, consensus, or — failing that — a precise articulation of why their fundamental differences preclude compromise. The output is ONE concise question (8-14 words), specific to the topic and sides provided. No preamble, no quotes, no period unless it ends with one naturally. Examples of tone: "Where could we compromise?", "What shared ground exists between liberty and safety here?", "If no compromise is possible, what makes the divide irreducible?"`;
        userPrompt = `Topic: "${topic}"
Sides: ${sides.join(" vs ")}
Existing subtopics: ${subtopics.map((s) => `"${s}"`).join(", ")}

Write ONE resolution-seeking subtopic question tailored to this specific debate. It must invite compromise OR force a clear articulation of why compromise is impossible. Output ONLY the question text — nothing else.`;
        break;
      }

      case "grade_turn": {
        const { topic, subtopic, side, content, opposingArguments, includeResolution } = payload as {
          topic: string;
          subtopic: string;
          side: string;
          content: string;
          opposingArguments: Array<{ side: string; content: string }>;
          includeResolution: boolean;
        };
        systemPrompt = `You are d.'s performance analyst. You grade ONE speaker's most recent turn on four dimensions, each scored 0.0–10.0 (one decimal allowed). Grade ONLY on what was said — never on speaking style, accent, tone, or delivery speed. Never declare a winner. Be honest, specific, and concise.

Dimensions:
1. argument_quality — logical soundness, relevance, evidence/reasoning. Penalize fallacies, unsupported assertions, off-topic statements.
2. opposition_engagement — how directly and substantively this turn responds to the opposing side's arguments. Reward direct counters, acknowledgment of opposing points, substantive rebuttals. Penalize ignoring opposition.
3. clarity_structure — clarity and coherence: clear point, supporting reasoning, conclusion. Penalize rambling, incoherence, unclear statements.
4. stakes_articulation — how effectively the turn communicates what is at risk if their position loses. Reward specific, compelling stakes. Penalize vague/absent stakes.

Also produce:
- overall_score: weighted average of the four dimensions (equal weight is fine: average them) to one decimal.
- overall_label: Exceptional (9–10), Strong (7–8.9), Developing (5–6.9), Needs Work (3–4.9), Insufficient (0–2.9).
- suggestion: ONE actionable improvement, max 1 sentence.
- criticism: ONE specific weakness from this turn, max 1 sentence.
${includeResolution ? `
ALSO grade resolution_score (0.0–10.0) INDEPENDENTLY based on: willingness to acknowledge valid opposing points, movement toward shared position, constructive framing of disagreement, explicit attempts to find common ground.
- resolution_label: Consensus Builder (9–10), Collaborative (7–8.9), Neutral (5–6.9), Resistant (3–4.9), Adversarial (0–2.9).` : ""}`;
        userPrompt = `Topic: "${topic}"
Subtopic: "${subtopic}"
Speaker side: "${side}"

Speaker's turn (verbatim):
"""
${content}
"""

Recent opposing arguments (for engagement context):
${opposingArguments.length ? opposingArguments.map((a) => `[${a.side}] ${a.content}`).join("\n") : "(none yet)"}

Grade this turn using the grade_turn tool.`;
        break;
      }

      case "grade_final": {
        const { topic, side, allTurns, opposingTurns, includeResolution } = payload as {
          topic: string;
          side: string;
          allTurns: Array<{ subtopic: string; content: string }>;
          opposingTurns: Array<{ subtopic: string; side: string; content: string }>;
          includeResolution: boolean;
        };
        systemPrompt = `You are d.'s performance analyst. You produce a FINAL aggregated performance grade for ONE speaker across the entire debate. Grade ONLY on what was said. Never declare a winner. Be honest and specific.

Score four dimensions (0.0–10.0):
1. argument_quality — across the whole debate
2. opposition_engagement — across the whole debate
3. clarity_structure — across the whole debate
4. stakes_articulation — across the whole debate

Then produce:
- overall_score: weighted average (equal weight, one decimal).
- overall_label: Exceptional (9–10), Strong (7–8.9), Developing (5–6.9), Needs Work (3–4.9), Insufficient (0–2.9).
- narrative: 3–5 sentence private performance summary. Specific, no fluff, addressed to the speaker in second person ("you").
${includeResolution ? `
ALSO grade resolution_score (0.0–10.0) INDEPENDENTLY across the whole debate based on: acknowledgment of valid opposing points, movement toward shared positions, constructive framing of disagreements, explicit attempts to find common ground.
- resolution_label: Consensus Builder (9–10), Collaborative (7–8.9), Neutral (5–6.9), Resistant (3–4.9), Adversarial (0–2.9).` : ""}`;
        userPrompt = `Topic: "${topic}"
Speaker side: "${side}"

Speaker's turns (in order):
${allTurns.map((t, i) => `Turn ${i + 1} — ${t.subtopic}:\n${t.content}`).join("\n\n")}

Opposing turns (for context):
${opposingTurns.length ? opposingTurns.map((t) => `[${t.side} — ${t.subtopic}] ${t.content}`).join("\n") : "(none)"}

Grade this speaker using the grade_final tool.`;
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
      const isCmm = (payload as any)?.format === "change_my_mind";
      body.tools = [
        {
          type: "function",
          function: {
            name: "suggest_debate",
            description: "Return a structured debate format",
            parameters: isCmm ? {
              type: "object",
              properties: {
                topic: { type: "string" },
                subtopics: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
              },
              required: ["topic", "subtopics"],
              additionalProperties: false,
            } : {
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
    } else if (action === "grade_turn" || action === "grade_final") {
      const isFinal = action === "grade_final";
      const toolName = isFinal ? "grade_final" : "grade_turn";

      const baseProps: Record<string, unknown> = {
        argument_quality: { type: "number", minimum: 0, maximum: 10 },
        opposition_engagement: { type: "number", minimum: 0, maximum: 10 },
        clarity_structure: { type: "number", minimum: 0, maximum: 10 },
        stakes_articulation: { type: "number", minimum: 0, maximum: 10 },
        overall_score: { type: "number", minimum: 0, maximum: 10 },
        overall_label: {
          type: "string",
          enum: ["Exceptional", "Strong", "Developing", "Needs Work", "Insufficient"],
        },
        resolution_score: { type: "number", minimum: 0, maximum: 10, nullable: true },
        resolution_label: {
          type: "string",
          enum: ["Consensus Builder", "Collaborative", "Neutral", "Resistant", "Adversarial"],
          nullable: true,
        },
      };

      if (isFinal) {
        (baseProps as any).narrative = { type: "string" };
      } else {
        (baseProps as any).suggestion = { type: "string" };
        (baseProps as any).criticism = { type: "string" };
      }

      const required = isFinal
        ? [
            "argument_quality",
            "opposition_engagement",
            "clarity_structure",
            "stakes_articulation",
            "overall_score",
            "overall_label",
            "narrative",
          ]
        : [
            "argument_quality",
            "opposition_engagement",
            "clarity_structure",
            "stakes_articulation",
            "overall_score",
            "overall_label",
            "suggestion",
            "criticism",
          ];

      body.tools = [
        {
          type: "function",
          function: {
            name: toolName,
            description: isFinal
              ? "Return a final aggregated performance grade for one speaker."
              : "Return a per-turn performance grade for one speaker.",
            parameters: {
              type: "object",
              properties: baseProps,
              required,
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = {
        type: "function",
        function: { name: toolName },
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

    // §18 cost tracking — fire-and-forget
    try {
      const { logAiUsage } = await import("../_shared/usage.ts");
      logAiUsage({
        function_name: "ai-facilitator",
        model: "google/gemini-3-flash-preview",
        usage: (data as any).usage,
        user_id: userData.user.id,
      });
    } catch (_) {}

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
