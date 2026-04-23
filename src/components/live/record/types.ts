import type { LiveTranscriptEntry, LiveSummary, LiveThreadMeta } from "@/hooks/useLiveTranscription";

export type RoleGroupKind =
  | "main"
  | "counter"
  | "rebuttal"
  | "affirms"
  | "concedes";

export interface RoleGroupSummary {
  /** Stable id for this summary node, used by annotations / cross-refs / citations. */
  node_id: string;
  thread_id: string;
  subtopic: string;
  kind: RoleGroupKind;
  speaker_id: number;
  text: string;
  source_entry_ids: string[];
}

export interface ThreadGroup {
  thread_id: string;
  title: string;
  conflict?: string;
  entries: LiveTranscriptEntry[];
  summaries: RoleGroupSummary[];
}

export interface SubtopicGroup {
  subtopic: string;
  description?: string;
  entries: LiveTranscriptEntry[];
  threads: ThreadGroup[];
}

export interface BuildHierarchyArgs {
  transcriptEntries: LiveTranscriptEntry[];
  subtopics: string[];
  threadTitles: Record<string, LiveThreadMeta>;
  summaries: LiveSummary[];
  getSpeakerName: (speakerId: number) => string;
}

/**
 * Builds the hierarchical Subtopic → Thread → RoleGroup view from the live transcript.
 * Role-group summaries are derived per-thread by collapsing consecutive entries from the
 * same speaker that share a thread_role into a single summary node, then keying them as
 * main / counter / rebuttal in order of appearance.
 */
export function buildHierarchy({
  transcriptEntries,
  subtopics,
  threadTitles,
  summaries,
  getSpeakerName,
}: BuildHierarchyArgs): SubtopicGroup[] {
  // Pull subtopic descriptions from the augmented summaries payload (if present).
  const meta = (summaries as any[]).find((s) => s?.id === "__subtopic_meta__");
  const descriptions: Record<string, string> = (meta?.descriptions || {}) as Record<string, string>;

  // Pull pre-computed role-group summaries (if augmented analyze-transcript ran).
  const rgMeta = (summaries as any[]).find((s) => s?.id === "__role_groups__");
  const precomputed: RoleGroupSummary[] = Array.isArray(rgMeta?.items) ? rgMeta.items : [];
  const precomputedByThread: Record<string, RoleGroupSummary[]> = {};
  for (const rg of precomputed) {
    if (!precomputedByThread[rg.thread_id]) precomputedByThread[rg.thread_id] = [];
    precomputedByThread[rg.thread_id].push(rg);
  }

  // Bucket entries by subtopic.
  const bySubtopic: Record<string, LiveTranscriptEntry[]> = {};
  const unassigned: LiveTranscriptEntry[] = [];
  for (const e of transcriptEntries) {
    if (e.subtopic) {
      (bySubtopic[e.subtopic] ||= []).push(e);
    } else {
      unassigned.push(e);
    }
  }

  const orderedSubtopics = [...subtopics];
  Object.keys(bySubtopic).forEach((s) => {
    if (!orderedSubtopics.includes(s)) orderedSubtopics.push(s);
  });
  if (unassigned.length > 0) orderedSubtopics.push("__unassigned__");

  return orderedSubtopics.map((subtopic): SubtopicGroup => {
    const entries = subtopic === "__unassigned__" ? unassigned : bySubtopic[subtopic] || [];

    // Bucket by thread.
    const threadMap: Record<string, LiveTranscriptEntry[]> = {};
    const looseEntries: LiveTranscriptEntry[] = [];
    for (const e of entries) {
      if (e.thread_id) {
        (threadMap[e.thread_id] ||= []).push(e);
      } else {
        looseEntries.push(e);
      }
    }

    const threads: ThreadGroup[] = Object.entries(threadMap)
      .map(([thread_id, ents]) => {
        const sorted = [...ents].sort((a, b) => a.timestamp - b.timestamp);
        const meta = threadTitles[thread_id];
        const title = meta?.title || "Untitled thread";

        const summaries = precomputedByThread[thread_id]?.length
          ? [...precomputedByThread[thread_id]].sort(
              (a, b) =>
                kindOrder(a.kind) - kindOrder(b.kind) ||
                a.node_id.localeCompare(b.node_id),
            )
          : deriveRoleGroupSummaries(sorted, thread_id, subtopic, getSpeakerName);

        return {
          thread_id,
          title,
          conflict: undefined,
          entries: sorted,
          summaries,
          firstTs: sorted[0]?.timestamp || 0,
        };
      })
      .sort((a, b) => a.firstTs - b.firstTs)
      .map(({ firstTs, ...t }) => t);

    // Handle loose (unthreaded) entries as a synthetic thread for completeness.
    if (looseEntries.length > 0) {
      const sorted = [...looseEntries].sort((a, b) => a.timestamp - b.timestamp);
      threads.push({
        thread_id: `${subtopic}__loose`,
        title: "Other statements",
        entries: sorted,
        summaries: deriveRoleGroupSummaries(sorted, `${subtopic}__loose`, subtopic, getSpeakerName),
      });
    }

    return {
      subtopic: subtopic === "__unassigned__" ? "Other" : subtopic,
      description: descriptions[subtopic],
      entries,
      threads,
    };
  });
}

function kindOrder(k: RoleGroupKind): number {
  if (k === "main") return 0;
  if (k === "counter") return 1;
  if (k === "rebuttal") return 2;
  if (k === "affirms") return 3;
  return 4; // concedes
}

/**
 * Fallback when the AI hasn't produced role-group summaries yet:
 * collapse contiguous same-speaker spans within the thread into role groups
 * (main → counter → rebuttal → main → ...), and concatenate the verbatim
 * text. This guarantees the page always has SOMETHING readable.
 */
function deriveRoleGroupSummaries(
  entries: LiveTranscriptEntry[],
  thread_id: string,
  subtopic: string,
  getSpeakerName: (id: number) => string,
): RoleGroupSummary[] {
  if (entries.length === 0) return [];

  const spans: { speaker_id: number; entries: LiveTranscriptEntry[] }[] = [];
  for (const e of entries) {
    const last = spans[spans.length - 1];
    if (last && last.speaker_id === e.speaker_id) {
      last.entries.push(e);
    } else {
      spans.push({ speaker_id: e.speaker_id, entries: [e] });
    }
  }

  const out: RoleGroupSummary[] = [];
  let mainSpeaker: number | null = null;
  spans.forEach((span, i) => {
    const text = span.entries
      .map((e) => (e.ai_summary && e.ai_summary.trim()) || e.text)
      .join(" ")
      .trim();
    let kind: RoleGroupKind;
    if (i === 0) {
      kind = "main";
      mainSpeaker = span.speaker_id;
    } else if (span.speaker_id !== mainSpeaker) {
      // Different speaker reacting to the main point. Detect agreement /
      // concession; otherwise treat as a counter.
      if (detectsConcession(text)) kind = "concedes";
      else if (detectsAffirmation(text)) kind = "affirms";
      else kind = "counter";
    } else {
      // Same speaker continuing. Concessions to the opposing point still count
      // as "concedes"; affirmations of the opposing point count as "affirms";
      // otherwise it's a rebuttal continuation.
      if (detectsConcession(text)) kind = "concedes";
      else if (detectsAffirmation(text)) kind = "affirms";
      else kind = "rebuttal";
    }
    out.push({
      node_id: `${thread_id}:${i}`,
      thread_id,
      subtopic,
      kind,
      speaker_id: span.speaker_id,
      text,
      source_entry_ids: span.entries.map((e) => e.id),
    });
  });
  return out;
}

/**
 * Lexical heuristic: speaker is AGREEING with / affirming the prior point.
 * Conservative — we'd rather mis-label as counter than over-claim agreement.
 */
function detectsAffirmation(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;
  const patterns = [
    /^(yes|yeah|yep|right|exactly|absolutely|totally|of course|for sure|definitely|agreed)\b/,
    /\bi (agree|concur)\b/,
    /\bthat'?s (right|true|correct|fair|a (good|fair|valid) point)\b/,
    /\byou'?re (right|correct)\b/,
    /\bgood point\b/,
    /\bwell said\b/,
    /\bi see what you mean\b/,
    /\bcouldn'?t agree more\b/,
  ];
  return patterns.some((re) => re.test(t));
}

/**
 * Lexical heuristic: speaker is CONCEDING ground to the prior point — i.e.
 * yielding part of their position even if they continue arguing.
 */
function detectsConcession(text: string): boolean {
  const t = text.toLowerCase().trim();
  if (!t) return false;
  const patterns = [
    /\bi'?ll (give|grant) you that\b/,
    /\bfair (enough|point)\b/,
    /\bthat'?s a fair (point|criticism)\b/,
    /\byou (have|'?ve got) a point\b/,
    /\bi concede\b/,
    /\bi'?ll concede\b/,
    /\bi (was|may have been) wrong\b/,
    /\bok(ay)?,? you'?re right\b/,
    /\bi (have|'?ve) to (admit|concede)\b/,
    /\b(point )?taken\b/,
    /\bi stand corrected\b/,
    /\bi (changed|'?ve changed) my mind\b/,
    /\bi (see|get) your point\b/,
    /\bthat'?s true,? (but|however|though)\b/,
    /\byou'?re right (about|that)\b/,
  ];
  return patterns.some((re) => re.test(t));
}