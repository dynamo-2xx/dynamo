// Brief, user-facing explanations for the structural-analysis taxonomy used
// in the Threaded Record. Mirrors the role that `perf-tags.ts` plays for the
// Rhetorical-Analysis overlay in InsightText: every tag the user sees gets a
// short description on hover/click so ambiguous cases stay informative.

export type AnatomyPartKey =
  | "CLAIM" | "GROUNDS" | "WARRANT" | "QUALIFIER" | "CONCESSION" | "REBUTTAL";

export type RelationshipTagKey =
  | "ANCHOR" | "SUPPORT" | "CHALLENGE" | "COUNTER" | "EXTENSION"
  | "CONCESSION" | "REFRAME" | "QUALIFICATION" | "SYNTHESIS" | "PIVOT" | "UNRESOLVED";

export const ANATOMY_PART_INFO: Record<AnatomyPartKey, { label: string; description: string }> = {
  CLAIM:      { label: "Claim",      description: "The position being asserted — what the speaker says is true." },
  GROUNDS:    { label: "Grounds",    description: "Evidence, data, or quoted material offered in support of the claim." },
  WARRANT:    { label: "Warrant",    description: "The logical bridge that lets the grounds count as support for the claim." },
  QUALIFIER:  { label: "Qualifier",  description: "A hedge that narrows the claim's scope or certainty (e.g. 'usually', 'in most cases')." },
  CONCESSION: { label: "Concession", description: "The speaker acknowledges a limit or exception inside their own argument." },
  REBUTTAL:   { label: "Rebuttal",   description: "Pushback against an opposing argument — preemptive or responsive." },
};

export const RELATIONSHIP_TAG_INFO: Record<RelationshipTagKey, { label: string; description: string }> = {
  ANCHOR:        { label: "Anchor",        description: "Opens a thread by introducing a new proposition." },
  SUPPORT:       { label: "Support",       description: "Reinforces the prior unit's claim with more evidence, analogy, or warrant — same side, same direction." },
  CHALLENGE:     { label: "Challenge",     description: "Contests a specific part of the prior unit (claim, grounds, or warrant) without offering a replacement." },
  COUNTER:       { label: "Counter",       description: "Proposes a competing claim that, if true, would displace the prior one." },
  EXTENSION:     { label: "Extension",     description: "Builds a new but connected claim on top of the prior unit." },
  CONCESSION:    { label: "Concession",    description: "Speaker openly yields a point to the opposing side." },
  REFRAME:       { label: "Reframe",       description: "Repositions the terms or scope of the debate without conceding or directly countering." },
  QUALIFICATION: { label: "Qualification", description: "Same speaker (or their side) narrows their own prior claim under pressure — no ground yielded to the opponent." },
  SYNTHESIS:     { label: "Synthesis",     description: "Draws two or more prior positions together into a new claim that incorporates both." },
  PIVOT:         { label: "Pivot",         description: "Shifts to a different aspect of the topic without engaging the prior unit head-on." },
  UNRESOLVED:    { label: "Unresolved",    description: "A claim, question, or challenge that subsequent units never addressed." },
};

export function getRelationshipInfo(tag: string) {
  return RELATIONSHIP_TAG_INFO[(tag?.toUpperCase() as RelationshipTagKey)] ?? null;
}

export function getAnatomyInfo(part: string) {
  return ANATOMY_PART_INFO[(part?.toUpperCase() as AnatomyPartKey)] ?? null;
}