import { LiveTranscriptEntry } from "@/hooks/useLiveTranscription";

export interface GroupedTranscriptEntry {
  id: string;
  speaker_id: number;
  speaker_label: string;
  text: string;
  ai_summary?: string;
  timestamp: number;
  is_final: boolean;
  subtopic?: string;
  entryCount: number;
}

/**
 * Groups consecutive transcript entries from the same speaker into single merged entries.
 * Combines their text (newline-separated) and AI summaries.
 */
export function groupConsecutiveEntries(entries: LiveTranscriptEntry[]): GroupedTranscriptEntry[] {
  if (entries.length === 0) return [];

  const groups: GroupedTranscriptEntry[] = [];
  let current: GroupedTranscriptEntry | null = null;

  for (const entry of entries) {
    if (current && current.speaker_id === entry.speaker_id) {
      // Same speaker — merge
      current.text += "\n\n" + entry.text;
      if (entry.ai_summary) {
        current.ai_summary = current.ai_summary
          ? current.ai_summary + " " + entry.ai_summary
          : entry.ai_summary;
      }
      current.entryCount++;
    } else {
      // Different speaker or first entry — start new group
      if (current) groups.push(current);
      current = {
        id: entry.id,
        speaker_id: entry.speaker_id,
        speaker_label: entry.speaker_label,
        text: entry.text,
        ai_summary: entry.ai_summary,
        timestamp: entry.timestamp,
        is_final: entry.is_final,
        subtopic: entry.subtopic,
        entryCount: 1,
      };
    }
  }
  if (current) groups.push(current);

  return groups;
}
