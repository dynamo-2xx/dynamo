import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LIVE_CLASSIFICATION_PROMPT = `You are an AI that analyzes a dynamic human conversation and organizes it in real time according to its topics and arguments.

---

DEFINITIONS

**Merge** — Two or more *existing* topic nodes are collapsed into one because they are revealed to be the same underlying concern. The merged node inherits all arguments from both. Only merge when the conversation *explicitly* treats two topics as identical (e.g. "that's the same root cause", "those are really the same thing"). Never merge based on similarity alone.

**Split** — One *existing* topic node is divided into two or more because the conversation reveals it contains distinct, separable concerns that participants are treating independently. Only split when the speaker explicitly separates the *topic itself*, not just two arguments within it.

**Stability constraint** — Never merge or split speculatively. If the current structure is a reasonable fit, keep it. Only restructure when the conversation explicitly treats items as the same or as distinct.

---

HUMAN COMMUNICATION PATTERNS TO HANDLE

Humans communicate inefficiently in predictable ways. You must recognize and correctly handle all of the following:

---

PATTERN 1: RETROACTIVE REFRAMING
A speaker reframes two previously separate topics as a single new topic or competition. The old topics become sub-items of a new parent topic. When the speaker explicitly recast previous independent topics into competitors within a new parent topic, preserve prior arguments under their respective sub-topics.

PATTERN 2: TOPIC DRIFT
The conversation slides gradually from one topic to another without an explicit signal. No single utterance marks the transition — it accumulates across several turns. When 2+ consecutive turns clearly address a new concern, close the old topic and open a new one. Do not retroactively reassign earlier arguments.

PATTERN 3: INTERRUPTION AND TOPIC ABANDONMENT
A speaker begins developing a topic, gets interrupted or sidetracked, and the original topic is dropped without resolution. Flag the incomplete argument as incomplete rather than dropping it. Open the new interruption-initiated topic normally.

PATTERN 4: TOPIC RETURN / REVIVAL
A speaker explicitly returns to a topic that was previously closed or abandoned ("back to X", "circling back"). Reopen the flagged topic and append the new argument. Do not create a duplicate topic node.

PATTERN 5: FALSE STARTS AND SELF-REPAIR
A speaker begins a thought, abandons it mid-sentence, and restarts with a corrected or different version ("well, actually no, it's not X, it's Y"). Record only the final, committed version of the argument.

PATTERN 6: VAGUE / IMPLICIT REFERENCE ("that thing", "it", "what you said")
A speaker refers back to a previous topic or argument without naming it. Resolve the reference from context by recency. Do not open a new topic.

PATTERN 7: CONTRADICTION / POSITION REVERSAL
A speaker contradicts an argument they previously made ("I've changed my mind"). Mark the old argument as retracted rather than deleting it — it is part of the conversation record. Add the new position.

PATTERN 8: TANGENT
A speaker introduces a side point loosely related to the current topic. If the speaker self-dismisses it ("anyway, back to…"), do not create a topic node. If a tangent receives follow-up responses from others, promote it to a new topic.

PATTERN 9: SARCASM AND IRONY
A speaker says the opposite of what they mean. Classify the argument by intended meaning, not literal words. If sarcasm is ambiguous, flag it as [tone uncertain].

PATTERN 10: REPETITION WITH VARIATION
A speaker restates the same argument multiple times in different words. Consolidate into a single argument — do not create duplicate nodes. If a later restatement adds a genuinely new nuance, append it as a sub-point.

PATTERN 11: PARALLEL THREADS
Two speakers are simultaneously developing different sub-topics without acknowledging each other. Track both threads independently. If one speaker eventually responds to the other's point, link the threads at that point.

PATTERN 12: EMOTIONAL ESCALATION / TOPIC RECLASSIFICATION
What begins as a factual or logistical topic escalates emotionally and becomes a values, trust, or relationship topic. Open a new topic rather than stuffing emotional arguments into the logistical node. Keep the original topic open — both are now active.

PATTERN 13: INCOMPLETE THOUGHT / TRAILING OFF
A speaker begins a point but does not finish it. No other speaker follows up. Record what was said, flag as incomplete. Do not infer or invent the conclusion.

---

SIGNAL → ACTION TABLE

| Signal | Action |
|---|---|
| "That's the same as…" / "same root cause" | MERGE topics |
| "That's a different question" / "separate issue" | SPLIT topic |
| "What's better, X or Y?" / reframes two topics | RETROACTIVE REFRAME — create parent topic |
| Gradual drift across 2+ turns | TOPIC DRIFT — close old, open new |
| Topic abandoned mid-sentence after interruption | FLAG as incomplete, open interrupting topic |
| "Back to X" / "circling back" | REVIVE flagged topic, do not duplicate |
| False start + self-correction | Record only final committed version |
| "That" / "it" / "what you said" | Resolve by recency, no new topic |
| Speaker reverses earlier position | Mark old arg as retracted, add new arg |
| Aside speaker immediately dismisses | Ignore as tangent, no topic node |
| Tangent with follow-up from others | Promote tangent to new topic |
| Sarcasm / irony | Classify by intended meaning |
| Same point rephrased multiple times | CONSOLIDATE into one argument |
| Two speakers on different points simultaneously | PARALLEL THREADS — track independently |
| Factual topic becomes emotional | RECLASSIFY into new topic, keep original open |
| Thought trails off with no follow-up | FLAG as incomplete |
| Causal link ("A makes B worse") | Cross-reference only, no merge |
| Vague or metaphorical connection | Stability — no change |
| New argument fits existing topic | Attach to existing node, no new topic |
| New domain explicitly flagged as separate | Open new topic node |

---

INSTRUCTIONS

You will receive the full transcript and optionally the previous list of subtopics. Your job:

1. Identify distinct subtopics/themes in the conversation using the patterns above.
2. If previous_subtopics is provided, prefer keeping existing topic labels unless the conversation explicitly justifies a merge, split, or rename.
3. Assign every transcript entry to exactly one subtopic.
4. If no clear subtopics emerge, use "General Discussion".

Return your analysis using the analyze_conversation tool.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { transcriptChunk, existingMap, sides, currentSubtopic, speakerSide, mode, fullTranscript, subtopic, entries, previous_subtopics } = await req.json();

    // ── Live conversation: Pass 1 — Classify subtopics ──
    if (mode === "live_conversation") {
      const userPrompt = `${previous_subtopics?.length ? `Previous subtopics (prefer stability):\n${JSON.stringify(previous_subtopics)}\n\n` : ""}Transcript entries:\n${JSON.stringify(fullTranscript || [], null, 2)}\n\nAnalyze this conversation: identify subtopics and assign each entry to a subtopic.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [
            { role: "system", content: LIVE_CLASSIFICATION_PROMPT },
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
        if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (status === 402) return new Response(JSON.stringify({ error: "AI usage limit reached" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const t = await response.text();
        console.error("AI gateway error:", status, t);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({ subtopics: [], entry_subtopic_map: {} }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Live: Pass 2 — Per-entry summaries ──
    if (mode === "live_summarize_entries") {
      const batchEntries = entries || [];
      if (batchEntries.length === 0) {
        return new Response(JSON.stringify({ entry_summaries: {} }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const sysPrompt = `You are an AI conversation analyst. You will receive transcript entries from a live conversation. For each entry, generate a concise 1-2 sentence summary that captures the key point or argument being made. Identify speakers by their labels. Return the result using the summarize_entries tool.`;

      const uPrompt = `Transcript entries to summarize:\n${JSON.stringify(batchEntries, null, 2)}\n\nGenerate a concise summary for each entry.`;

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
                name: "summarize_entries",
                description: "Return per-entry summaries",
                parameters: {
                  type: "object",
                  properties: {
                    entry_summaries: {
                      type: "object",
                      description: "Map of entry ID to concise 1-2 sentence summary",
                      additionalProperties: { type: "string" },
                    },
                  },
                  required: ["entry_summaries"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "summarize_entries" } },
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

      return new Response(JSON.stringify({ entry_summaries: {} }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Legacy: Per-subtopic summary (kept for backward compat) ──
    if (mode === "live_summarize_subtopic") {
      const subEntries = entries || [];
      const subLabel = subtopic || "";

      const sysPrompt = `You are an AI conversation analyst. You will be given transcript entries from a live conversation that all belong to one subtopic. Generate a concise but comprehensive summary that captures the key points discussed under this theme. The summary MUST reflect all speakers' contributions fairly and evenly — do not favor one speaker over another. Identify speakers by their labels (Speaker 1, Speaker 2, etc.). Return the result using the summarize_subtopic tool.`;

      const uPrompt = `Subtopic: "${subLabel}"\n\nTranscript entries for this subtopic:\n${JSON.stringify(subEntries, null, 2)}\n\nGenerate a comprehensive summary for this subtopic.`;

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

    // ── Default debate mode ──
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
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "AI usage limit reached" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ entries: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-transcript error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
