// Mirror of src/lib/perf-tags.ts (Deno side). Adds the verbatim system prompts
// for live + post-session modes. Keep label/polarity/contextual fields in sync.

export type Polarity = "positive" | "negative";
export interface PerfTag {
  label: string;
  polarity: Polarity;
  polarityMode: "fixed" | "variable";
  contextual: boolean;
  description: string;
  guidance: string;
  category: string;
}

export const PERF_TAGS: PerfTag[] = [
  { label: "Ad Hominem", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Attacking the person rather than their argument.", guidance: "" },
  { label: "Straw Man", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Misrepresenting an opponent's position.", guidance: "" },
  { label: "False Dichotomy", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Presenting only two options when more exist.", guidance: "" },
  { label: "Slippery Slope", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Inevitable extreme consequences without justification.", guidance: "" },
  { label: "Appeal to Authority", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Authority as substitute for evidence.", guidance: "" },
  { label: "Appeal to Emotion", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Emotional manipulation instead of logic.", guidance: "" },
  { label: "Appeal to Popularity (Ad Populum)", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "True because many people believe it.", guidance: "" },
  { label: "Circular Reasoning (Begging the Question)", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Conclusion used as premise.", guidance: "" },
  { label: "Hasty Generalization", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Broad conclusion from insufficient sample.", guidance: "" },
  { label: "False Cause (Post Hoc)", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Correlation treated as causation.", guidance: "" },
  { label: "Red Herring", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Irrelevant point to distract from the issue.", guidance: "" },
  { label: "Tu Quoque (Whataboutism)", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Deflecting by pointing to opponent's similar behavior.", guidance: "" },
  { label: "Equivocation", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Using a word with shifting meanings.", guidance: "" },
  { label: "Loaded Question", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Question embedding a contested assumption.", guidance: "" },
  { label: "Bandwagon Fallacy", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Right because it is popular or trending.", guidance: "" },
  { label: "Appeal to Ignorance", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "True because not disproven.", guidance: "" },
  { label: "Naturalistic Fallacy", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Good because natural.", guidance: "" },
  { label: "Special Pleading", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Standard applied to others but not oneself.", guidance: "" },

  { label: "Vague Claim", category: "Rhetorical Weaknesses", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Statement too broad to evaluate.", guidance: "" },
  { label: "Unsupported Assertion", category: "Rhetorical Weaknesses", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Claim stated as fact without support.", guidance: "" },
  { label: "Hedging Overuse", category: "Rhetorical Weaknesses", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Heavy qualifying that takes no real position.", guidance: "" },
  { label: "Repetition Without Advancement", category: "Rhetorical Weaknesses", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Restating without new support.", guidance: "" },

  { label: "Sufficient Assumption", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Premise that guarantees the conclusion.", guidance: "" },
  { label: "Necessary Assumption", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Hidden premise the argument depends on.", guidance: "" },
  { label: "Valid Inference", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Conclusion follows logically from premises.", guidance: "" },
  { label: "Strong Analogy", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Comparison with real structural similarity.", guidance: "" },
  { label: "Concrete Evidence", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Specific, verifiable data or examples.", guidance: "" },
  { label: "Causal Mechanism", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Explaining how cause leads to effect.", guidance: "" },
  { label: "Preemptive Rebuttal", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Anticipating a counterargument.", guidance: "" },
  { label: "Charitable Interpretation (Steelmanning)", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Engaging strongest version of opponent's argument.", guidance: "" },
  { label: "Scope Limitation", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Narrowing a claim to what is defensible.", guidance: "" },
  { label: "Definition Clarification", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Precisely defining a key term.", guidance: "" },

  { label: "Concession", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Acknowledging opponent has a valid point.", guidance: "" },
  { label: "Reductio ad Absurdum", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "variable", contextual: false, description: "Disproving by following to absurd conclusion.", guidance: "" },
  { label: "Distinction", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Meaningful line between similar things.", guidance: "" },
  { label: "Synthesis", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Combining positions into refined claim.", guidance: "" },
  { label: "Qualification", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "variable", contextual: false, description: "Limiting scope of a claim under challenge.", guidance: "" },

  { label: "Prima Facie Case", category: "Legal Reasoning", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Claim strong on its face — requires a response.", guidance: "" },
  { label: "Relevance", category: "Legal Reasoning", polarity: "positive", polarityMode: "variable", contextual: false, description: "Bears on the proposition at issue.", guidance: "" },
  { label: "Materiality", category: "Legal Reasoning", polarity: "positive", polarityMode: "variable", contextual: false, description: "Significant enough to affect the outcome.", guidance: "" },
  { label: "Hearsay (Unverified Source)", category: "Legal Reasoning", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Unverifiable info treated as established fact.", guidance: "" },
  { label: "Speculation", category: "Legal Reasoning", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Facts not in evidence.", guidance: "" },

  // Post-session (contextual)
  { label: "Contradiction", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Same speaker conflicts with earlier statement.", guidance: "" },
  { label: "Scope Creep", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Silently expanding the claim.", guidance: "" },
  { label: "Topic Drift", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Moving away from original point unannounced.", guidance: "" },
  { label: "Concession Without Acknowledgment", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Implicitly abandoning a challenged point.", guidance: "" },
  { label: "Retroactive Reframing", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Reinterpreting earlier statement post-challenge.", guidance: "" },

  { label: "Burden Shift", category: "Dialectical & Procedural — Context Dependent", polarity: "positive", polarityMode: "variable", contextual: true, description: "Moving the burden of proof.", guidance: "" },
  { label: "Qualification vs. Reframing Disambiguation", category: "Dialectical & Procedural — Context Dependent", polarity: "positive", polarityMode: "variable", contextual: true, description: "Ambiguous qualification vs reframing.", guidance: "" },

  { label: "Res Judicata (Settled Point)", category: "Legal Reasoning — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Re-raising an already settled point.", guidance: "" },
  { label: "Burden of Proof", category: "Legal Reasoning — Context Dependent", polarity: "positive", polarityMode: "variable", contextual: true, description: "Who must prove what across the debate.", guidance: "" },
  { label: "Impeachment", category: "Legal Reasoning — Context Dependent", polarity: "positive", polarityMode: "variable", contextual: true, description: "Undermining credibility of a source/statement.", guidance: "" },
];

export const LIVE_TAG_LABELS = PERF_TAGS.filter((t) => !t.contextual).map((t) => t.label);
export const POST_SESSION_TAG_LABELS = PERF_TAGS.map((t) => t.label);

function tagBlock(tags: PerfTag[]): string {
  // Compact block grouped by category for prompt clarity.
  const groups = new Map<string, PerfTag[]>();
  for (const t of tags) {
    const arr = groups.get(t.category) ?? [];
    arr.push(t);
    groups.set(t.category, arr);
  }
  let out = "";
  for (const [cat, items] of groups) {
    out += `\n--- ${cat.toUpperCase()} ---\n`;
    for (const t of items) {
      const polNote = t.polarityMode === "variable" ? " (polarity: variable)" : ` (polarity: ${t.polarity})`;
      out += `${t.label}${polNote} — ${t.description}\n`;
    }
  }
  return out;
}

const LIVE_TAG_SET_TEXT = tagBlock(PERF_TAGS.filter((t) => !t.contextual));
const POST_SESSION_EXTRA_TEXT = tagBlock(PERF_TAGS.filter((t) => t.contextual));

const SHARED_DISAMBIG = `
DISAMBIGUATION NOTES:
- Ad Hominem targets the SPEAKER. Straw Man targets a DISTORTED VERSION of the argument.
- Slippery Slope involves a chain of unjustified steps. False Cause involves a single misattributed cause.
- Vague Claim is about content being undefined. Hedging Overuse is about posture — burying a claim in qualifiers.
- Qualification is honest narrowing. Retroactive Reframing is defensive repositioning after a challenge (POST-SESSION ONLY in live mode).
- Sufficient Assumption guarantees the conclusion. Necessary Assumption is a premise the argument cannot survive without.
`;

export const LIVE_SYSTEM_PROMPT = `You are an expert argument analyst trained in formal logic, rhetoric, debate science, and legal reasoning. You are analyzing a single argument unit in real time during a live debate.

RULES:
1. Only apply tags from the LIVE TAG SET listed below. Do not apply any tag that requires knowledge of earlier turns. If a tag would require context, omit it — it will be caught in post-session.
2. Only tag what you can clearly justify. If uncertain, omit.
3. Apply tags sparingly — over-tagging dilutes value.
4. Each tag must reference a specific phrase or sentence — not a general impression.
5. Use the exact tag labels as written below.
6. A single unit may receive multiple tags if genuinely warranted.
7. When two tags could apply, choose the more specific one.

${SHARED_DISAMBIG}

LIVE TAG SET:${LIVE_TAG_SET_TEXT}

OUTPUT FORMAT — return ONLY a JSON object:
{"annotations":[{"span_text":"<exact substring from input>","tag_label":"<one of the labels above>","polarity":"positive"|"negative","reason":"<one sentence>"}]}

Rules for span_text: it must be a verbatim substring of the input text, long enough to be uniquely locatable but short enough to be tight around the move (10-200 chars). Omit the annotations array entirely if nothing warrants tagging — return {"annotations":[]}.`;

const POST_DISAMBIG_EXTRA = `
- Concession Without Acknowledgment requires evidence the point was actively challenged before being dropped. Cite the challenge turn.
- Burden Shift is legitimate only if a prima facie case was established first. Cite that turn.
- Contradiction requires two statements from the same speaker that cannot both be true. Cite both turns.
`;

export const POST_SESSION_SYSTEM_PROMPT = `You are an expert argument analyst trained in formal logic, rhetoric, debate science, and legal reasoning. You are analyzing a complete debate transcript after the session has ended. You have access to the full conversation history.

RULES:
1. Apply tags from both the LIVE TAG SET and the POST-SESSION TAG SET listed below.
2. For POST-SESSION tags you MUST cite the specific earlier turn(s) that establish the context, by turn_index (the integer prefix on each input turn).
3. Only tag what you can clearly justify. If uncertain, omit.
4. Apply tags sparingly.
5. Each tag must reference a specific phrase or sentence from one turn.
6. Use exact labels as written below.
7. When two tags could apply, choose the more specific one.

${SHARED_DISAMBIG}${POST_DISAMBIG_EXTRA}

LIVE TAG SET:${LIVE_TAG_SET_TEXT}

POST-SESSION TAG SET (cross-turn context required):${POST_SESSION_EXTRA_TEXT}

OUTPUT FORMAT — return ONLY a JSON object:
{"annotations":[{"turn_index":<int>,"span_text":"<exact substring from that turn>","tag_label":"<one of the labels above>","polarity":"positive"|"negative","reason":"<one sentence>","cited_turns":[<int>,...]}]}

cited_turns is required when tag_label is a POST-SESSION tag and otherwise optional. span_text must be a verbatim substring of that turn's text (10-200 chars). Return {"annotations":[]} if nothing warrants tagging.`;

/** Founder bypass — must match src/lib/founder.ts FOUNDER_USER_ID. */
export const FOUNDER_USER_ID = "331dee1c-373c-47f7-8a85-32ac9202e4e3";