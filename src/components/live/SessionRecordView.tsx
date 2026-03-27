import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Share2, Check, ChevronDown, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LiveTranscriptEntry, LiveSummary } from "@/hooks/useLiveTranscription";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import SpeakerBubble from "./SpeakerBubble";

interface SessionRecordViewProps {
  sessionId: string;
  title: string;
  createdAt: string;
  endedAt: string | null;
  transcriptEntries: LiveTranscriptEntry[];
  summaries: LiveSummary[];
  subtopics: string[];
  speakerNames: Record<string, string>;
  shareToken: string | null;
  readOnly?: boolean;
  onEntriesUpdate?: (entries: LiveTranscriptEntry[]) => void;
  onSpeakerNamesUpdate?: (names: Record<string, string>) => void;
}

const SessionRecordView = ({
  sessionId,
  title,
  createdAt,
  endedAt,
  transcriptEntries,
  summaries,
  subtopics,
  speakerNames,
  shareToken,
  readOnly = false,
  onEntriesUpdate,
  onSpeakerNamesUpdate,
}: SessionRecordViewProps) => {
  const [currentShareToken, setCurrentShareToken] = useState(shareToken);
  const [isSharing, setIsSharing] = useState(false);

  const duration = endedAt && createdAt
    ? Math.round((new Date(endedAt).getTime() - new Date(createdAt).getTime()) / 60000)
    : null;

  const getSpeakerName = (speakerId: number) => {
    return speakerNames[String(speakerId)] || `Speaker ${speakerId + 1}`;
  };

  const handleRenameSpeaker = useCallback(async (speakerId: number, newName: string) => {
    if (readOnly) return;
    const updated = { ...speakerNames, [String(speakerId)]: newName };
    onSpeakerNamesUpdate?.(updated);
    await supabase
      .from("live_sessions" as any)
      .update({ speaker_names: updated } as any)
      .eq("id", sessionId);
  }, [speakerNames, sessionId, readOnly, onSpeakerNamesUpdate]);

  const handleSplitEntry = useCallback(async (entryId: string, splitIndex: number) => {
    if (readOnly) return;
    const entry = transcriptEntries.find(e => e.id === entryId);
    if (!entry?.words || splitIndex <= 0 || splitIndex >= entry.words.length) return;

    const firstWords = entry.words.slice(0, splitIndex);
    const secondWords = entry.words.slice(splitIndex);
    const firstSpeaker = firstWords[0]?.speaker ?? entry.speaker_id;
    const secondSpeaker = secondWords[0]?.speaker ?? entry.speaker_id;

    const entry1: LiveTranscriptEntry = {
      ...entry, id: `${entry.id}-a`,
      text: firstWords.map(w => w.word).join(" "), words: firstWords,
      speaker_id: firstSpeaker, speaker_label: getSpeakerName(firstSpeaker),
    };
    const entry2: LiveTranscriptEntry = {
      ...entry, id: `${entry.id}-b`,
      text: secondWords.map(w => w.word).join(" "), words: secondWords,
      speaker_id: secondSpeaker, speaker_label: getSpeakerName(secondSpeaker),
      uncertain: false,
    };

    const updated = transcriptEntries.flatMap(e => e.id === entryId ? [entry1, entry2] : [e]);
    onEntriesUpdate?.(updated);
    await supabase
      .from("live_sessions" as any)
      .update({ transcript_entries: updated } as any)
      .eq("id", sessionId);
  }, [transcriptEntries, sessionId, readOnly, onEntriesUpdate, getSpeakerName]);

  const handleMergeEntry = useCallback(async (entryId: string) => {
    if (readOnly) return;
    const idx = transcriptEntries.findIndex(e => e.id === entryId);
    if (idx <= 0) return;

    const prev = transcriptEntries[idx - 1];
    const curr = transcriptEntries[idx];
    const merged: LiveTranscriptEntry = {
      ...prev,
      text: prev.text + " " + curr.text,
      words: [...(prev.words || []), ...(curr.words || [])],
      uncertain: false,
    };

    const updated = transcriptEntries.filter((_, i) => i !== idx).map(e => e.id === prev.id ? merged : e);
    onEntriesUpdate?.(updated);
    await supabase
      .from("live_sessions" as any)
      .update({ transcript_entries: updated } as any)
      .eq("id", sessionId);
  }, [transcriptEntries, sessionId, readOnly, onEntriesUpdate]);

  const handleShare = useCallback(async () => {
    if (currentShareToken) {
      const url = `${window.location.origin}/live/shared/${currentShareToken}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
      return;
    }

    setIsSharing(true);
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const { error } = await supabase
      .from("live_sessions" as any)
      .update({ share_token: token } as any)
      .eq("id", sessionId);

    if (error) {
      toast.error("Failed to create share link");
    } else {
      setCurrentShareToken(token);
      const url = `${window.location.origin}/live/shared/${token}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied!");
    }
    setIsSharing(false);
  }, [currentShareToken, sessionId]);

  // Build overall summary from all summaries combined
  const overallSummary = useMemo(() => {
    if (summaries.length === 0) return null;
    if (summaries.length === 1) return summaries[0].text;
    // Combine all summaries into one overview
    return summaries.map((s, i) => s.text).join("\n\n");
  }, [summaries]);

  // Group entries and summaries by subtopic
  const groupedData = useMemo(() => {
    const entryGroups: Record<string, LiveTranscriptEntry[]> = {};
    const unassigned: LiveTranscriptEntry[] = [];

    transcriptEntries.forEach((e) => {
      if (e.subtopic) {
        if (!entryGroups[e.subtopic]) entryGroups[e.subtopic] = [];
        entryGroups[e.subtopic].push(e);
      } else {
        unassigned.push(e);
      }
    });

    // Summaries mapped by subtopic
    const summaryBySubtopic: Record<string, LiveSummary[]> = {};
    summaries.forEach((s) => {
      s.subtopics.forEach((st) => {
        if (!summaryBySubtopic[st]) summaryBySubtopic[st] = [];
        summaryBySubtopic[st].push(s);
      });
    });

    // Build ordered subtopic list
    const orderedSubtopics = subtopics.filter(s => entryGroups[s] || summaryBySubtopic[s]);
    Object.keys(entryGroups).forEach(s => {
      if (!orderedSubtopics.includes(s)) orderedSubtopics.push(s);
    });
    Object.keys(summaryBySubtopic).forEach(s => {
      if (!orderedSubtopics.includes(s)) orderedSubtopics.push(s);
    });

    return { entryGroups, unassigned, summaryBySubtopic, orderedSubtopics };
  }, [transcriptEntries, summaries, subtopics]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          {!readOnly && (
            <Link to="/my-debates?tab=live" className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          )}
          <h1 className="text-2xl font-display font-bold truncate">{title || "Live Session"}</h1>
        </div>

        <div className="flex items-center gap-4 mb-6 text-sm text-muted-foreground">
          <span>{new Date(createdAt).toLocaleDateString()}</span>
          {duration !== null && <span>{duration} min</span>}
          <span className="bg-secondary px-2.5 py-0.5 rounded-full text-xs font-semibold">Ended</span>
          {!readOnly && (
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors disabled:opacity-50"
            >
              {currentShareToken ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
              {currentShareToken ? "Copy Link" : "Share"}
            </button>
          )}
        </div>

        {/* Overall Summary */}
        {overallSummary && (
          <div className="mb-8">
            <div className="border border-primary/20 bg-primary/5 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/10">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-primary font-display">
                  Overall Summary
                </span>
              </div>
              <div className="px-4 py-3">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{overallSummary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Subtopic sections — collapsible */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Transcript
          </h2>

          {groupedData.orderedSubtopics.map((topic, idx) => {
            const entries = groupedData.entryGroups[topic] || [];
            const topicSummaries = groupedData.summaryBySubtopic[topic] || [];

            return (
              <Collapsible key={topic} defaultOpen={idx === 0}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-xl border border-border bg-card px-5 py-4 text-left hover:bg-accent/50 transition-colors">
                  <ChevronDown className="w-4 h-4 text-primary shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                  <h3 className="text-sm font-display font-semibold text-foreground flex-1">
                    {idx + 1}. {topic}
                  </h3>
                  {topicSummaries.length > 0 && (
                    <span className="text-[9px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-semibold">
                      Summarized
                    </span>
                  )}
                  {entries.length > 0 && (
                    <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                      {entries.length}
                    </span>
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-5 py-3 space-y-2">
                    {/* Subtopic summary pinned at top */}
                    {topicSummaries.map((s, si) => (
                      <div key={s.id} className="border border-primary/20 bg-primary/5 rounded-lg overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-primary/10">
                          <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                            <Zap className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-primary font-display">
                            {topicSummaries.length > 1 ? `Summary ${si + 1}` : "Summary"}
                          </span>
                        </div>
                        <div className="px-3 py-2">
                          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{s.text}</p>
                        </div>
                      </div>
                    ))}

                    {/* Transcript bubbles */}
                    {entries.map((entry) => (
                      <SpeakerBubble
                        key={entry.id}
                        entry={entry}
                        speakerName={getSpeakerName(entry.speaker_id)}
                        readOnly={readOnly}
                        onRenameSpeaker={(name) => handleRenameSpeaker(entry.speaker_id, name)}
                        onSplit={(splitIdx) => handleSplitEntry(entry.id, splitIdx)}
                        onMerge={() => handleMergeEntry(entry.id)}
                      />
                    ))}

                    {entries.length === 0 && topicSummaries.length === 0 && (
                      <p className="text-xs text-muted-foreground italic py-2">No statements recorded</p>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {/* Unassigned entries (no subtopic) */}
          {groupedData.unassigned.length > 0 && (
            <Collapsible defaultOpen={groupedData.orderedSubtopics.length === 0}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-xl border border-border bg-card px-5 py-4 text-left hover:bg-accent/50 transition-colors">
                <ChevronDown className="w-4 h-4 text-primary shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                <h3 className="text-sm font-display font-semibold text-foreground flex-1">
                  General
                </h3>
                <span className="text-[10px] bg-muted rounded-full px-2 py-0.5 text-muted-foreground">
                  {groupedData.unassigned.length}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 py-3 space-y-2">
                  {groupedData.unassigned.map((entry) => (
                    <SpeakerBubble
                      key={entry.id}
                      entry={entry}
                      speakerName={getSpeakerName(entry.speaker_id)}
                      readOnly={readOnly}
                      onRenameSpeaker={(name) => handleRenameSpeaker(entry.speaker_id, name)}
                      onSplit={(splitIdx) => handleSplitEntry(entry.id, splitIdx)}
                      onMerge={() => handleMergeEntry(entry.id)}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {transcriptEntries.length === 0 && (
            <p className="text-muted-foreground text-center py-8 text-sm">No transcript entries recorded.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SessionRecordView;
