/**
 * §21 Performance Intelligence — single source of truth for the tag taxonomy.
 *
 * Mirrored verbatim at supabase/functions/_shared/perf-tags.ts for use inside
 * edge functions. Keep both files in sync.
 */

export type Polarity = "positive" | "negative";
export type PolarityMode = "fixed" | "variable";
export type TagCategory =
  | "Logical Fallacies"
  | "Rhetorical Weaknesses"
  | "Argument Strengths"
  | "Dialectical & Procedural"
  | "Legal Reasoning"
  | "Rhetorical Weaknesses — Context Dependent"
  | "Dialectical & Procedural — Context Dependent"
  | "Legal Reasoning — Context Dependent";

export interface PerfTag {
  /** Canonical label, exactly as written in the system prompt. */
  label: string;
  category: TagCategory;
  /** Default polarity. For variable tags, the AI may flip it per instance. */
  polarity: Polarity;
  /** "fixed" = always this polarity; "variable" = AI assigns per instance. */
  polarityMode: PolarityMode;
  /** Short one-line definition (shown in tooltip header). */
  description: string;
  /** Coach-style guidance / "Instead:" text (shown in tooltip body). */
  guidance: string;
  /** True if the tag requires cross-turn context (post-session only). */
  contextual: boolean;
}

export const PERF_TAGS: PerfTag[] = [
  // --- LOGICAL FALLACIES (live, negative) ---
  { label: "Ad Hominem", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Attacking the person rather than their argument.", guidance: "Address the content of what was said. Even if the speaker is unreliable, their argument may still stand or fall on its own merits — engage with the claim directly." },
  { label: "Straw Man", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Misrepresenting an opponent's position to make it easier to attack.", guidance: "Restate their argument in your own words and ask if you've understood it correctly before responding. Defeating a distorted version wins nothing." },
  { label: "False Dichotomy", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Presenting only two options when more exist.", guidance: "Ask whether there are intermediate positions, hybrid solutions, or alternatives not yet considered. Acknowledging complexity strengthens rather than weakens your credibility." },
  { label: "Slippery Slope", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Claiming one event will inevitably lead to extreme consequences without justification.", guidance: "If you believe a chain of consequences is likely, explain the mechanism that links each step. Probability and precedent are your tools here." },
  { label: "Appeal to Authority", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Using an authority figure's opinion as a substitute for actual evidence.", guidance: "Cite the authority as supporting context, then provide the underlying reasoning or data that the authority themselves relied on." },
  { label: "Appeal to Emotion", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Using emotional manipulation instead of logic to win agreement.", guidance: "Emotions can legitimately illustrate stakes, but pair them with evidence. Name the emotional dimension honestly rather than weaponizing it." },
  { label: "Appeal to Popularity (Ad Populum)", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Arguing something is true because many people believe it.", guidance: "Explain why those many people believe it — if the reasons are sound, argue the reasons, not the headcount." },
  { label: "Circular Reasoning (Begging the Question)", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Using the conclusion as a premise in the argument.", guidance: "Identify what independent evidence or reasoning would support your conclusion without assuming it, and argue that instead." },
  { label: "Hasty Generalization", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Drawing a broad conclusion from an insufficient sample.", guidance: "Qualify your claim to match the evidence you actually have. \"In these cases\" is more defensible than \"always\" — and it's harder to refute." },
  { label: "False Cause (Post Hoc)", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Assuming causation from correlation or temporal sequence.", guidance: "Propose a plausible mechanism, look for controlled comparisons, or acknowledge that correlation is suggestive but not conclusive." },
  { label: "Red Herring", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Introducing an irrelevant point to distract from the actual issue.", guidance: "If you want to raise a related point, flag the transition explicitly and return to the original issue. Tangents acknowledged are tangents forgiven." },
  { label: "Tu Quoque (Whataboutism)", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Deflecting criticism by pointing to the opponent's similar behavior.", guidance: "Address the criticism on its merits first. Hypocrisy may be worth raising, but it doesn't neutralize a valid argument against you." },
  { label: "Equivocation", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Using a word with multiple meanings in a deceptive or shifting way.", guidance: "Define your key terms at the outset and hold to those definitions throughout. If the meaning must shift, acknowledge it explicitly." },
  { label: "Loaded Question", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Asking a question that embeds a contested assumption.", guidance: "Separate the assumption from the question. State the assumption openly, defend it if needed, and then ask your question." },
  { label: "Bandwagon Fallacy", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Arguing something is right because it is popular or trending.", guidance: "Identify what makes the popular option attractive and argue those underlying reasons — trend is a symptom, not a cause." },
  { label: "Appeal to Ignorance", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Claiming something is true because it hasn't been disproven.", guidance: "Shift to what positive evidence exists for your position. Absence of disproof is a very weak foundation; presence of supporting evidence is far stronger." },
  { label: "Naturalistic Fallacy", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Assuming something is good or right simply because it is natural.", guidance: "Explain why the natural state is preferable in this context — naturalness may be relevant, but it needs an argument, not an assumption." },
  { label: "Special Pleading", category: "Logical Fallacies", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Applying a standard to others while exempting oneself without justification.", guidance: "Either apply the standard consistently or explicitly argue why the difference in cases justifies different treatment." },

  // --- RHETORICAL WEAKNESSES (live, negative) ---
  { label: "Vague Claim", category: "Rhetorical Weaknesses", polarity: "negative", polarityMode: "fixed", contextual: false, description: "A statement so broad or undefined it cannot be meaningfully evaluated.", guidance: "Add a specific subject, timeframe, scope, or measurable condition. The more falsifiable your claim, the more credible it is when defended." },
  { label: "Unsupported Assertion", category: "Rhetorical Weaknesses", polarity: "negative", polarityMode: "fixed", contextual: false, description: "A claim stated as fact without any evidence or reasoning.", guidance: "Follow every factual claim with either data, a credible source, a logical derivation, or a concrete example. Even one piece of support is far better than none." },
  { label: "Hedging Overuse", category: "Rhetorical Weaknesses", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Qualifying claims so heavily that no actual position is taken.", guidance: "Commit to the strongest version of your claim you can actually defend. One well-supported strong claim is worth more than ten heavily qualified non-claims." },
  { label: "Repetition Without Advancement", category: "Rhetorical Weaknesses", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Restating the same point without adding new support.", guidance: "If a point hasn't landed, change the angle — add evidence, a new analogy, or a concrete example. Saying the same thing louder is not an argument." },

  // --- ARGUMENT STRENGTHS (live, positive) ---
  { label: "Sufficient Assumption", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Correctly identifying a premise that, if true, logically guarantees the conclusion.", guidance: "By making the hidden premise explicit, you've both strengthened your argument and made it easier to defend. Keep surfacing these." },
  { label: "Necessary Assumption", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Identifying the hidden premise that the argument depends on.", guidance: "Exposing necessary assumptions — yours or your opponent's — is one of the most powerful analytical moves available. It forces the real disagreement into the open." },
  { label: "Valid Inference", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "A conclusion that follows logically from stated premises.", guidance: "Hold this standard throughout — conclusions that follow necessarily from what you've established are the hardest to refute." },
  { label: "Strong Analogy", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "A comparison that genuinely illuminates the argument through structural similarity.", guidance: "Continue testing analogies by asking whether the relevant features actually match before deploying them." },
  { label: "Concrete Evidence", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Supporting a claim with specific, verifiable data or examples.", guidance: "Specific evidence anchors abstract claims and gives your opponent something concrete to engage with rather than deflect from." },
  { label: "Causal Mechanism", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Explaining how one thing causes another, not just asserting it does.", guidance: "Explaining the mechanism prevents your causal claim from being dismissed as correlation. This is what separates persuasive from merely assertive arguments." },
  { label: "Preemptive Rebuttal", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Anticipating and neutralizing a counterargument before it is raised.", guidance: "This signals intellectual breadth and good faith. It also forces your opponent to find a new line of attack rather than the obvious one." },
  { label: "Charitable Interpretation (Steelmanning)", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Engaging with the strongest version of an opponent's argument.", guidance: "Defeating the best version of the opposing view makes your victory more meaningful and increases your credibility significantly." },
  { label: "Scope Limitation", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Appropriately narrowing a claim to only what can be defended.", guidance: "A narrower, well-defended claim is more persuasive than a broad one that collapses under scrutiny. Knowing your claim's limits is precision, not weakness." },
  { label: "Definition Clarification", category: "Argument Strengths", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Resolving ambiguity by precisely defining a key term.", guidance: "Many arguments fail because participants use the same words to mean different things. Defining terms early removes that confusion and keeps the debate substantive." },

  // --- DIALECTICAL & PROCEDURAL (live, mixed polarity) ---
  { label: "Concession", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Explicitly acknowledging that the opponent has a valid point.", guidance: "Use it deliberately rather than avoiding it — strategic concession is a strength and actually increases your credibility on the points you don't concede." },
  { label: "Reductio ad Absurdum", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "variable", contextual: false, description: "Disproving a claim by following it to a logical but absurd conclusion.", guidance: "Verify that each step actually follows — if one link is weak, the opponent can break the chain and reverse the rhetorical damage onto you." },
  { label: "Distinction", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Drawing a meaningful line between two things that appear similar.", guidance: "Distinctions defuse analogies and counter-examples. The test is whether the distinction is substantively relevant — make sure you explain why the difference matters." },
  { label: "Synthesis", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "fixed", contextual: false, description: "Combining two positions into a new, more refined claim.", guidance: "Use it when genuine common ground exists, not as a rhetorical dodge to avoid defending your original position." },
  { label: "Qualification", category: "Dialectical & Procedural", polarity: "positive", polarityMode: "variable", contextual: false, description: "Limiting the scope of a claim in response to a challenge.", guidance: "The line between qualification and retreat is whether you're refining or abandoning your position — be deliberate about which." },

  // --- LEGAL REASONING (live, mixed polarity) ---
  { label: "Prima Facie Case", category: "Legal Reasoning", polarity: "positive", polarityMode: "fixed", contextual: false, description: "A claim strong enough on its face to require a response.", guidance: "When you've established a prima facie case, your opponent must respond substantively or concede the point. Recognize when you've crossed this threshold." },
  { label: "Relevance", category: "Legal Reasoning", polarity: "positive", polarityMode: "variable", contextual: false, description: "Whether evidence or argument actually bears on the proposition at issue.", guidance: "Ask: does this change the probability my conclusion is true? If not, it's not relevant — even if interesting. Irrelevant points dilute strong arguments." },
  { label: "Materiality", category: "Legal Reasoning", polarity: "positive", polarityMode: "variable", contextual: false, description: "Whether a point, even if true, is significant enough to affect the outcome.", guidance: "A point can be true and irrelevant in weight. Focus effort on points that, if won, actually move the needle on the central question." },
  { label: "Hearsay (Unverified Source)", category: "Legal Reasoning", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Citing secondhand or unverifiable information as if it were established fact.", guidance: "Either trace the claim to a primary source or flag it as unverified. \"I've heard that…\" is honest; stating it as fact exposes you to easy refutation." },
  { label: "Speculation", category: "Legal Reasoning", polarity: "negative", polarityMode: "fixed", contextual: false, description: "Asserting facts not in evidence, going beyond what the data supports.", guidance: "Clearly distinguish between what the evidence shows and what you infer from it. Framing speculation as fact is a liability." },

  // --- POST-SESSION: Rhetorical Weaknesses — Context Dependent (negative) ---
  { label: "Contradiction", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "A statement that conflicts with something the same speaker said earlier.", guidance: "If your view has evolved mid-debate, acknowledge it — \"I want to refine what I said earlier\" signals intellectual honesty, not weakness." },
  { label: "Scope Creep", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Silently expanding the claim beyond what was originally argued.", guidance: "If you need to broaden your claim, do so explicitly and defend the broader version. Unannounced expansions invite the opponent to call it out." },
  { label: "Topic Drift", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Moving away from the original point without acknowledging the shift.", guidance: "When transitioning, signal it clearly and, if the original issue is unresolved, propose to return to it. Unresolved threads accumulate against you." },
  { label: "Concession Without Acknowledgment", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Implicitly abandoning a point without addressing why.", guidance: "If you're moving on, briefly say so — \"I'll grant that point\" or \"that's a fair challenge\" — so the record reflects intent, not retreat." },
  { label: "Retroactive Reframing", category: "Rhetorical Weaknesses — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Reinterpreting an earlier statement after it has been challenged.", guidance: "Either defend the original statement or explicitly retract and restate it. Retroactive reframing erodes trust in everything else you've said." },

  // --- POST-SESSION: Dialectical & Procedural — Context Dependent (variable) ---
  { label: "Burden Shift", category: "Dialectical & Procedural — Context Dependent", polarity: "positive", polarityMode: "variable", contextual: true, description: "Moving the burden of proof from one party to another.", guidance: "If you've established a prima facie case, shifting the burden is fair. If you're doing it to avoid defending an unsupported claim, it will be recognized as evasion." },
  { label: "Qualification vs. Reframing Disambiguation", category: "Dialectical & Procedural — Context Dependent", polarity: "positive", polarityMode: "variable", contextual: true, description: "Ambiguous case — genuine qualification or defensive reframing?", guidance: "Full transcript context determines intent. Be deliberate about whether you're refining the position or quietly retreating from it." },

  // --- POST-SESSION: Legal Reasoning — Context Dependent ---
  { label: "Res Judicata (Settled Point)", category: "Legal Reasoning — Context Dependent", polarity: "negative", polarityMode: "fixed", contextual: true, description: "Raising a point that was already conceded or resolved earlier in the debate.", guidance: "Re-litigating settled points wastes time and signals poor tracking or bad faith. Keep a mental record of what has been conceded on both sides." },
  { label: "Burden of Proof", category: "Legal Reasoning — Context Dependent", polarity: "positive", polarityMode: "variable", contextual: true, description: "Whether the speaker correctly understands who must prove what across the debate.", guidance: "The positive claim generally carries the burden. If you're asserting you must establish; if you're doubting you need only show the assertion hasn't been met." },
  { label: "Impeachment", category: "Legal Reasoning — Context Dependent", polarity: "positive", polarityMode: "variable", contextual: true, description: "Successfully undermining the credibility of a source or prior statement.", guidance: "Used correctly this is powerful. Used as a substitute for engaging the underlying claim it collapses into ad hominem — always pair with substance." },
];

/** Lookup by exact label. */
const TAG_BY_LABEL = new Map(PERF_TAGS.map((t) => [t.label, t]));
export function getPerfTag(label: string | null | undefined): PerfTag | undefined {
  if (!label) return undefined;
  return TAG_BY_LABEL.get(label);
}

/** Live mode = non-contextual tags only. */
export const LIVE_TAGS = PERF_TAGS.filter((t) => !t.contextual);
export const POST_SESSION_TAGS = PERF_TAGS;

/** Tailwind classes for polarity. Resolved on the fly so dark mode stays correct. */
export const POLARITY_STYLES: Record<Polarity, { underline: string; pillBg: string; pillText: string; dot: string }> = {
  positive: {
    underline: "underline decoration-emerald-500 decoration-2 underline-offset-2",
    pillBg: "bg-emerald-500/10 border-emerald-500/30",
    pillText: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  negative: {
    underline: "underline decoration-red-500 decoration-2 underline-offset-2",
    pillBg: "bg-red-500/10 border-red-500/30",
    pillText: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};