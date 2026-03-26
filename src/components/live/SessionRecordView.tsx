import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Share2, Check, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LiveTranscriptEntry, LiveSummary } from "@/hooks/useLiveTranscription";
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
      ...entry,
      id: `${entry.id}-a`,
      text: firstWords.map(w => w.word).join(" "),
      words: firstWords,
      speaker_id: firstSpeaker,
      speaker_label: getSpeakerName(firstSpeaker),
    };
    const entry2: LiveTranscriptEntry = {
      ...entry,
      id: `${entry.id}-b`,
      text: secondWords.map(w => w.word).join(" "),
      words: secondWords,
      speaker_id: secondSpeaker,
      speaker_label: getSpeakerName(secondSpeaker),
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

  // Group entries by subtopic
  const groupedEntries = (() => {
    const groups: Record<string, LiveTranscriptEntry[]> = {};
    const unassigned: LiveTranscriptEntry[] = [];
    transcriptEntries.forEach((e) => {
      if (e.subtopic) {
        if (!groups[e.subtopic]) groups[e.subtopic] = [];
        groups[e.subtopic].push(e);
      } else {
        unassigned.push(e);
      }
    });
    const orderedSubtopics = subtopics.filter(s => groups[s]);
    Object.keys(groups).forEach(s => {
      if (!orderedSubtopics.includes(s)) orderedSubtopics.push(s);
    });
    return { groups, unassigned, orderedSubtopics };
  })();

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

        {/* Summaries */}
        {summaries.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Summaries
            </h2>
            <div className="space-y-3">
              {summaries.map((s, i) => (
                <div key={s.id} className="bg-card border border-border rounded-xl p-4">
                  {summaries.length > 1 && (
                    <p className="text-[10px] text-muted-foreground mb-1 font-semibold">
                      Summary #{i + 1}
                    </p>
                  )}
                  <p className="text-sm text-foreground whitespace-pre-wrap">{s.text}</p>
                  {s.subtopics.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {s.subtopics.map((st) => (
                        <span key={st} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                          {st}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Transcript */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Transcript
          </h2>

          {groupedEntries.orderedSubtopics.map((topic) => (
            <div key={topic} className="mb-4">
              <div className="flex items-center gap-2 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                  {topic}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              {groupedEntries.groups[topic].map((entry) => (
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
          ))}

          {groupedEntries.unassigned.map((entry) => (
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

          {transcriptEntries.length === 0 && (
            <p className="text-muted-foreground text-center py-8 text-sm">No transcript entries recorded.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default SessionRecordView;
