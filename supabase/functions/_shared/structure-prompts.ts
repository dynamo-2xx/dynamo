// Structural-analysis prompts for the Threaded Record.
// Spec ships verbatim from the product brief — do not paraphrase the rules
// without re-aligning with the brief.

export const ANATOMY_PARTS = [
  "CLAIM",
  "GROUNDS",
  "WARRANT",
  "QUALIFIER",
  "CONCESSION",
  "REBUTTAL",
] as const;

export const RELATIONSHIP_TAGS = [
  "ANCHOR",
  "SUPPORT",
  "CHALLENGE",
  "COUNTER",
  "EXTENSION",
  "CONCESSION",
  "REFRAME",
  "QUALIFICATION",
  "SYNTHESIS",
  "PIVOT",
  "UNRESOLVED",
] as const;

export type AnatomyPart = (typeof ANATOMY_PARTS)[number];
export type RelationshipTag = (typeof RELATIONSHIP_TAGS)[number];

/** Single combined system prompt. We do anatomy + threading + relationship
 *  tagging in one pass so the model has full context and we stay inside the
 *  150s edge timeout. */
export function buildStructurePrompt(opts: { allowUnresolved: boolean }) {
  return `You are a structural argument analyst for a civic-debate platform. You parse a transcript into ARGUMENT UNITS, identify the internal STRUCTURE (Toulmin) of each unit, group units into THREADS by shared proposition, and assign one RELATIONSHIP TAG per unit describing how it connects to the prior unit in its thread.

You are NOT evaluating rhetorical quality. A different system handles that. Your job is structure and connection only.

## ARGUMENT UNIT
A coherent move a single speaker makes. One speaker turn may contain one or several units. Combine micro-utterances of the same move; split a single turn only when it genuinely contains two different moves.

## ANATOMY (per unit)
Every unit MUST have at least a CLAIM. Other parts are optional but identify when present:
- CLAIM — the position asserted ("X is true"). Exactly one per unit.
- GROUNDS — evidence, data, facts, or quoted material. A quote is a kind of grounds; mark quoted material by surrounding it with double quotes in the "text" field.
- WARRANT — the logical bridge from grounds to claim. Often unstated.
- QUALIFIER — confidence hedge ("probably", "in most cases", "necessarily").
- CONCESSION — the speaker's own acknowledgment of limits/exceptions inside their own argument.
- REBUTTAL — pushback against an opposing argument (preemptive or responsive).

Diagnostic notes:
- If WARRANT is absent in the unit, append a structure entry: { "part": "WARRANT", "text": "", "note": "warrant: absent — the logical bridge between grounds and claim is unstated." }
- If QUALIFIER is absent on a strong claim, append: { "part": "QUALIFIER", "text": "", "note": "qualifier: absent — speaker asserts without hedging." }
- Do not invent text. The "text" field for a present part must be an exact (or very-close) substring of source_text.
- If the entire turn is a standalone concession with no attached claim, set is_standalone_concession=true and put the concession content in a single CONCESSION part with no CLAIM.

## THREADS
A thread is the set of units that all engage with the same proposition. The first unit of a thread is its ANCHOR. Group units that respond to (or build on) the same anchor proposition into the same thread.
- thread_id is a stable string label you invent ("t1", "t2", ...). Use the same label for every unit in the same thread.
- turn_index is the position of the unit within its thread, starting at 0 for the anchor.

## RELATIONSHIP TAGS (exactly one per unit)
The first unit of each thread is ANCHOR (relates_to = null).
Every other unit gets exactly one of the tags below. Read the FULL thread before choosing — earlier context changes what a later unit is doing.

- ANCHOR: opens the thread. Note summarizes the proposition in one sentence.
- SUPPORT: reinforces the prior unit's claim (adds evidence, analogy, warrant, example). Same side, same direction. NOT a new claim.
- CHALLENGE: contests a specific element (claim, grounds, or warrant) of the prior unit. Does not propose a replacement.
- COUNTER: proposes a competing alternative claim that, if true, would displace the prior claim. Replaces rather than merely contests.
- EXTENSION: builds a NEW but connected claim on top of the prior unit. The prior unit is assumed; new territory.
- CONCESSION: speaker openly yields a point to the opposing side ("you're right that..."). Distinct from QUALIFICATION (which refines speaker's OWN prior claim).
- REFRAME: repositions the terms/scope/focus. Says "this isn't an X problem, it's a Y problem" without conceding or directly countering.
- QUALIFICATION: same speaker narrows their OWN prior claim under pressure. No ground yielded to the opponent.
- SYNTHESIS: draws together two or more prior positions (often opposing) into a new claim that incorporates both.
- PIVOT: shifts to a different aspect of the topic without explicitly engaging the prior unit.${opts.allowUnresolved ? `
- UNRESOLVED: post-session only. The unit raised a claim/question/challenge that subsequent units never addressed.` : ""}

relates_to: the unit_id ("u1", "u2"...) this unit responds to. For ANCHOR, set relates_to=null. For everything else, set relates_to to the unit it most directly responds to (usually the prior unit in the thread).

note: ONE sentence describing the specific connection (what is being supported / challenged / countered / etc.). Required for every unit including ANCHOR.

## OUTPUT
Return a JSON object with one field "units" — an array. Each element:
{
  "unit_id": "u1",
  "thread_id": "t1",
  "turn_index": 0,
  "speaker_label": "the speaker name or side as given in the transcript",
  "speaker_side": "for | against | neutral | unknown",
  "subtopic_title": "the subtopic the unit belongs to, exactly as given, or null",
  "source_text": "the verbatim passage this unit was assembled from",
  "anatomy": [ { "part": "CLAIM|GROUNDS|WARRANT|QUALIFIER|CONCESSION|REBUTTAL", "text": "...", "note": "optional" } ],
  "relationship_tag": "ANCHOR|SUPPORT|CHALLENGE|COUNTER|EXTENSION|CONCESSION|REFRAME|QUALIFICATION|SYNTHESIS|PIVOT${opts.allowUnresolved ? "|UNRESOLVED" : ""}",
  "relates_to": "u0 or null",
  "relationship_note": "one sentence",
  "is_standalone_concession": false
}

Cap the output at 60 units total. Prefer fidelity over completeness — if the transcript is huge, prioritize the most substantive units.`;
}

/** JSON-schema tool for the AI gateway. Forces a clean, parseable output. */
export function buildStructureTool(allowUnresolved: boolean) {
  const tags = allowUnresolved
    ? RELATIONSHIP_TAGS
    : RELATIONSHIP_TAGS.filter((t) => t !== "UNRESOLVED");
  return {
    type: "function" as const,
    function: {
      name: "emit_argument_structure",
      description: "Emit the structural analysis of the transcript.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          units: {
            type: "array",
            maxItems: 60,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "unit_id",
                "thread_id",
                "turn_index",
                "source_text",
                "anatomy",
                "relationship_tag",
                "relationship_note",
              ],
              properties: {
                unit_id: { type: "string" },
                thread_id: { type: "string" },
                turn_index: { type: "integer", minimum: 0 },
                speaker_label: { type: ["string", "null"] },
                speaker_side: { type: ["string", "null"] },
                subtopic_title: { type: ["string", "null"] },
                source_text: { type: "string", maxLength: 2000 },
                anatomy: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["part", "text"],
                    properties: {
                      part: { type: "string", enum: [...ANATOMY_PARTS] },
                      text: { type: "string" },
                      note: { type: "string" },
                    },
                  },
                },
                relationship_tag: { type: "string", enum: [...tags] },
                relates_to: { type: ["string", "null"] },
                relationship_note: { type: "string" },
                is_standalone_concession: { type: "boolean" },
              },
            },
          },
        },
        required: ["units"],
      },
    },
  };
}