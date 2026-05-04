import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Mic, Square, Radio, Loader2, ChevronDown, ArrowLeft, UserPlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SessionRecordView from "@/components/live/record/SessionRecordViewV2";
import RecordCommentsSection from "@/components/comments/RecordCommentsSection";
import LiveThreadView from "@/components/live/LiveThreadView";
import TagPicker from "@/components/tags/TagPicker";
import CoverImageUploader from "@/components/upload/CoverImageUploader";
import type { Tag } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useLiveTranscription, LiveTranscriptEntry } from "@/hooks/useLiveTranscription";
import { useMergedLiveTranscript } from "@/hooks/useMergedLiveTranscript";
import { useLiveSessionPresence } from "@/hooks/useLiveSessionPresence";
import { useDeviceTranscription } from "@/hooks/useDeviceTranscription";
import JoinCodeCard from "@/components/live/JoinCodeCard";
import PresenceList from "@/components/live/PresenceList";
import VideoGrid from "@/components/live/VideoGrid";
import { useLiveSessionRTC } from "@/hooks/useLiveSessionRTC";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DisplayOptionsMenu from "@/components/live/DisplayOptionsMenu";
import FloatingTranscript from "@/components/live/FloatingTranscript";
import { useLiveDisplayPrefs, themeWrapperClass } from "@/hooks/useLiveDisplayPrefs";

const getDeviceId = () => {
  let id = localStorage.getItem("dyn_device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("dyn_device_id", id);
  }
  return id;
};

type SessionPhase = "setup" | "recording" | "ended";

const LiveSessionPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [phase, setPhase] = useState<SessionPhase>(id ? "recording" : "setup");
  const [sessionId, setSessionId] = useState<string | null>(id || null);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"single_device" | "multi_device">("single_device");
  const [sessionStatus, setSessionStatus] = useState<string>("recording");
  const [sessionData, setSessionData] = useState<any>(null);
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [setupTags, setSetupTags] = useState<Tag[]>([]);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [hostDisplayName, setHostDisplayName] = useState<string>("");
  const [hostSpeakerSlot, setHostSpeakerSlot] = useState<number>(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { prefs, update: updatePrefs } = useLiveDisplayPrefs();

  const deviceId = useMemo(() => getDeviceId(), []);
  const isMulti = mode === "multi_device";
  const isRecordingActive = phase === "recording" && sessionStatus === "recording";

  // Load host's display name from profile
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();
      const name = data?.display_name || user.email?.split("@")[0] || "Host";
      setHostDisplayName(name);
    })();
  }, [user]);

  // Single-device path
  const single = useLiveTranscription({
    sessionId,
    isActive: isRecordingActive && !isMulti,
  });

  // Multi-device path: host runs its own mic AND merges all device entries
  const hostName = hostDisplayName || "Host";
  const rtc = useLiveSessionRTC({
    sessionId: isMulti ? sessionId : null,
    deviceId,
    displayName: hostName,
    isActive: isRecordingActive && isMulti,
  });
  const hostDevice = useDeviceTranscription({
    sessionId,
    deviceId,
    speakerSlot: hostSpeakerSlot,
    speakerName: hostName,
    isActive: isRecordingActive && isMulti,
    isMicEnabled: rtc.micOn,
    externalStream: rtc.localStream,
    streamVersion: rtc.streamVersion,
  });
  const merged = useMergedLiveTranscript(sessionId, isRecordingActive && isMulti);
  const presenceParticipants = useLiveSessionPresence(
    isMulti ? sessionId : null,
    { deviceId, heartbeat: isMulti && isRecordingActive },
  );

  // Host-side: when participants change, merge their {slot: display_name} into
  // live_sessions.speaker_names so transcripts show real names.
  useEffect(() => {
    if (!isMulti || !sessionId || !user) return;
    if (presenceParticipants.length === 0) return;
    const next = { ...speakerNames };
    let changed = false;
    presenceParticipants.forEach((p) => {
      const key = String(p.speaker_slot);
      const name = p.display_name?.trim();
      if (name && next[key] !== name) {
        next[key] = name;
        changed = true;
      }
    });
    if (!changed) return;
    setSpeakerNames(next);
    (supabase as any)
      .from("live_sessions")
      .update({ speaker_names: next })
      .eq("id", sessionId)
      .then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presenceParticipants, isMulti, sessionId, user]);

  // Host-side: leave-on-unmount so the host's row disappears when navigating away.
  useEffect(() => {
    if (!isMulti || !sessionId) return;
    const onLeave = () => {
      // Best-effort delete; host has DELETE permission via is_live_session_host RLS.
      (supabase as any)
        .from("live_session_participants")
        .delete()
        .eq("session_id", sessionId)
        .eq("device_id", deviceId);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") onLeave();
    };
    window.addEventListener("beforeunload", onLeave);
    window.addEventListener("pagehide", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      window.removeEventListener("pagehide", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      onLeave();
    };
  }, [isMulti, sessionId, deviceId]);

  const transcriptEntries = isMulti ? merged.entries : single.transcriptEntries;
  const summaries = isMulti ? [] : single.summaries;
  const subtopics = isMulti ? [] : single.subtopics;
  const threads = isMulti ? {} : single.threads;
  const interimText = isMulti ? "" : single.interimText;
  const isConnected = isMulti ? hostDevice.isConnected : single.isConnected;
  const micError = isMulti ? hostDevice.error : single.micError;
  const connectionError = isMulti ? null : single.connectionError;
  const isSummarizing = isMulti ? false : single.isSummarizing;
  const endSession = single.endSession;

  // Load existing session if navigating to /live/:id
  useEffect(() => {
    if (!id) return;
    const load = async () => {
      const { data } = await supabase
        .from("live_sessions" as any)
        .select("*")
        .eq("id", id)
        .single();
      if (data) {
        const d = data as any;
        setTitle(d.title || "");
        setMode(d.mode || "single_device");
        setSessionStatus(d.status);
        setSessionData(d);
        setSpeakerNames(d.speaker_names || {});
        setJoinCode(d.join_code || null);
        if (d.status === "ended") {
          setPhase("ended");
        } else {
          setPhase("recording");
        }

        // Multi-device: look up this device's speaker_slot
        if (d.mode === "multi_device" && d.status === "recording") {
          const { data: part } = await (supabase as any)
            .from("live_session_participants")
            .select("speaker_slot")
            .eq("session_id", d.id)
            .eq("device_id", deviceId)
            .maybeSingle();
          if (part?.speaker_slot) setHostSpeakerSlot(part.speaker_slot);
        }
      }
    };
    load();
  }, [id, deviceId]);

  // Auto-scroll transcript
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [transcriptEntries, interimText]);

  const handleStartSession = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("live_sessions" as any)
      .insert({
        created_by: user.id,
        title: title.trim() || null,
        mode,
        status: "recording",
        cover_image_url: coverImageUrl,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Failed to create session");
      return;
    }

    const d = data as any;
    setSessionId(d.id);
    setSessionStatus("recording");
    setJoinCode(d.join_code || null);
    setPhase("recording");

    // Attach buffered tags
    if (setupTags.length > 0) {
      await (supabase as any)
        .from("live_session_tags")
        .insert(setupTags.map((t) => ({ live_session_id: d.id, tag_id: t.id })));
    }

    // Multi-device: register the host as Speaker 1 via join RPC
    if (mode === "multi_device" && d.join_code) {
      const name = hostDisplayName || user.email?.split("@")[0] || "Host";
      const { data: joinData } = await (supabase as any).rpc("join_live_session", {
        _code: d.join_code,
        _device_id: deviceId,
        _display_name: name,
        _avatar_url: null,
      });
      const row = Array.isArray(joinData) ? joinData[0] : joinData;
      const slot = row?.speaker_slot ?? 1;
      setHostSpeakerSlot(slot);

      // Seed speaker_names so transcripts show real name not "Speaker N"
      const seeded = { ...(d.speaker_names || {}), [String(slot)]: name };
      setSpeakerNames(seeded);
      await (supabase as any)
        .from("live_sessions")
        .update({ speaker_names: seeded })
        .eq("id", d.id);
    }

    navigate(`/live/${d.id}`, { replace: true });
  }, [user, title, mode, navigate, setupTags, deviceId, hostDisplayName, coverImageUrl]);

  const handleEndSession = useCallback(async () => {
    if (!isMulti) {
      await endSession();
    } else if (sessionId) {
      // Multi-device: just mark ended
      await (supabase as any)
        .from("live_sessions")
        .update({ status: "ended", ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }
    setSessionStatus("ended");
    if (sessionId) {
      const { data } = await supabase
        .from("live_sessions" as any)
        .select("*")
        .eq("id", sessionId)
        .single();
      if (data) setSessionData(data);
    }
    setPhase("ended");
  }, [endSession, sessionId, isMulti]);

  // Group entries by subtopic for the recording view
  const groupedEntries = useMemo(() => {
    const groups: Record<string, LiveTranscriptEntry[]> = {};
    const uncategorized: LiveTranscriptEntry[] = [];

    transcriptEntries.forEach((e) => {
      if (e.subtopic) {
        if (!groups[e.subtopic]) groups[e.subtopic] = [];
        groups[e.subtopic].push(e);
      } else {
        uncategorized.push(e);
      }
    });

    // Ordered subtopics from AI + any from entries
    const ordered = [...subtopics];
    Object.keys(groups).forEach((s) => {
      if (!ordered.includes(s)) ordered.push(s);
    });

    return { groups, uncategorized, ordered };
  }, [transcriptEntries, subtopics]);

  const getSpeakerName = (speakerId: number) => {
    return speakerNames[String(speakerId)] || `Speaker ${speakerId}`;
  };

  // Avatar lookup by speaker_slot, derived from current presence rows.
  const avatarBySlot = useMemo(() => {
    const m: Record<number, string | null> = {};
    presenceParticipants.forEach((p) => {
      m[p.speaker_slot] = p.avatar_url;
    });
    return m;
  }, [presenceParticipants]);
  const getSpeakerAvatar = (speakerId: number) => avatarBySlot[speakerId] ?? null;

  // ── ENDED → Full record page ──
  if (phase === "ended") {
    const sd = sessionData || {};
    return (
      <AppLayout>
        <SessionRecordView
          sessionId={sessionId || ""}
          title={sd.title || title || "Live Session"}
          createdAt={sd.created_at || new Date().toISOString()}
          endedAt={sd.ended_at}
          transcriptEntries={transcriptEntries.length > 0 ? transcriptEntries : (sd.transcript_entries || [])}
          summaries={summaries.length > 0 ? summaries : (sd.summaries || [])}
          subtopics={subtopics.length > 0 ? subtopics : (sd.subtopics || [])}
          speakerNames={speakerNames}
          shareToken={sd.share_token || null}
          threadTitles={threads}
          onEntriesUpdate={() => {}}
          onSpeakerNamesUpdate={setSpeakerNames}
        />
        {sessionId && (
          <div className="max-w-5xl mx-auto px-4 pb-12">
            <RecordCommentsSection recordType="live_session" recordId={sessionId} />
          </div>
        )}
      </AppLayout>
    );
  }

  // ── SETUP SCREEN ──
  if (phase === "setup") {
    return (
      <AppLayout>
        <div className="max-w-lg mx-auto px-4 py-6 sm:py-12">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body min-h-[44px] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Home
          </Link>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-display font-bold mb-6">Start a Live Session</h1>

            <div className="space-y-5">
              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">
                  Title (optional)
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Team standup, Strategy meeting..."
                  className="w-full bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none font-display"
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">
                  Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("single_device")}
                    className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors border ${
                      mode === "single_device"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 text-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    <Mic className="w-4 h-4 mx-auto mb-1" />
                    In-Person
                  </button>
                  <button
                    onClick={() => setMode("multi_device")}
                    className={`rounded-lg px-4 py-3 text-sm font-semibold transition-colors border ${
                      mode === "multi_device"
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-secondary/50 text-foreground border-border hover:border-primary/30"
                    }`}
                  >
                    <Radio className="w-4 h-4 mx-auto mb-1" />
                    Online
                  </button>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">
                  Tags <span className="normal-case font-normal text-[10px]">(helps people on Explore find this)</span>
                </label>
                <TagPicker
                  kind="live_session"
                  recordId={null}
                  buffered={setupTags}
                  onBufferedChange={setSetupTags}
                  max={5}
                  compact
                />
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <CoverImageUploader
                  value={coverImageUrl}
                  onChange={setCoverImageUrl}
                  seed={title || "live"}
                />
              </div>

              <button
                onClick={handleStartSession}
                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                Start Recording
              </button>
            </div>
          </motion.div>
        </div>
      </AppLayout>
    );
  }

  // ── RECORDING SCREEN ──
  const layout = prefs.layout;
  const isVideoOnly = isMulti && layout === "video-only";
  const isSideBySide = isMulti && layout === "side-by-side";
  const isTranscriptFirst = isMulti && layout === "transcript-first";

  const transcriptBlock = (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-background/70 backdrop-blur-xl">
      {micError && (
        <div className="bg-destructive/10 backdrop-blur-sm text-destructive text-sm rounded-lg p-3 border border-destructive/20">
          {micError}
        </div>
      )}
      {connectionError && (
        <div className="bg-destructive/10 backdrop-blur-sm text-destructive text-sm rounded-lg p-3 border border-destructive/20">
          {connectionError}
        </div>
      )}

      {transcriptEntries.length === 0 && !interimText && (
        <div className="text-center text-muted-foreground text-sm py-12">
          {isConnected ? "Listening... Start speaking." : "Connecting to microphone..."}
        </div>
      )}

      {prefs.groupBySubtopic ? (
        <>
          {groupedEntries.ordered.map((topic) => {
            const topicEntries = groupedEntries.groups[topic] || [];
            if (topicEntries.length === 0) return null;
            return (
              <Collapsible key={topic} defaultOpen>
                <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-xl border border-foreground/10 bg-background/60 backdrop-blur-xl px-4 py-3 text-left hover:bg-background/80 transition-colors">
                  <ChevronDown className="w-4 h-4 text-primary shrink-0 transition-transform [[data-state=closed]_&]:-rotate-90" />
                  <h3 className="text-sm font-display font-semibold text-foreground flex-1 truncate">
                    {topic}
                  </h3>
                  <span className="text-[10px] bg-background/70 backdrop-blur-sm rounded-full px-2 py-0.5 text-muted-foreground border border-foreground/10">
                    {topicEntries.length} {topicEntries.length === 1 ? "statement" : "statements"}
                  </span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="pt-2 pl-2">
                    <LiveThreadView
                      entries={topicEntries}
                      threadTitles={threads}
                      getSpeakerName={getSpeakerName}
                      getSpeakerAvatar={getSpeakerAvatar}
                      bubble={isMulti}
                      compact
                      density={prefs.density}
                      showTimestamps={prefs.showTimestamps}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}

          {groupedEntries.uncategorized.length > 0 && (
            <div className="space-y-2">
              {groupedEntries.ordered.length > 0 && (
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Uncategorized
                </h3>
              )}
              <LiveThreadView
                entries={groupedEntries.uncategorized}
                threadTitles={threads}
                getSpeakerName={getSpeakerName}
                getSpeakerAvatar={getSpeakerAvatar}
                bubble={isMulti}
                compact
                density={prefs.density}
                showTimestamps={prefs.showTimestamps}
              />
            </div>
          )}
        </>
      ) : (
        <LiveThreadView
          entries={transcriptEntries}
          threadTitles={threads}
          getSpeakerName={getSpeakerName}
          getSpeakerAvatar={getSpeakerAvatar}
          bubble={isMulti}
          compact
          density={prefs.density}
          showTimestamps={prefs.showTimestamps}
        />
      )}

      {prefs.showInterim && interimText && (
        <div className="text-sm text-foreground/80 italic px-3 py-2 rounded-lg bg-background/70 backdrop-blur-sm border border-foreground/10">
          {interimText}...
        </div>
      )}
    </div>
  );

  const videoBlock = isMulti && (
    <div className={`shrink-0 px-4 pt-3 pb-2 ${isVideoOnly ? "flex-1 flex flex-col" : "border-b border-border/60 max-h-[40vh] overflow-hidden"} relative`}>
      <VideoGrid
        localStream={rtc.localStream}
        localName={hostName}
        cameraOn={rtc.cameraOn}
        micOn={rtc.micOn}
        remotePeers={rtc.remotePeers}
        participants={presenceParticipants}
        activeRtcDeviceIds={rtc.activeRtcDeviceIds}
        deviceId={deviceId}
        onToggleCamera={rtc.toggleCamera}
        onToggleMic={rtc.toggleMic}
        tileStyle={prefs.tileStyle}
        showLabels={prefs.showTileLabels}
      />
      {rtc.error && (
        <div className="mt-2 bg-destructive/10 text-destructive text-xs rounded-lg p-2">
          {rtc.error}
        </div>
      )}
      {isVideoOnly && (
        <FloatingTranscript
          entries={transcriptEntries}
          threadTitles={threads}
          getSpeakerName={getSpeakerName}
          getSpeakerAvatar={getSpeakerAvatar}
          showTimestamps={prefs.showTimestamps}
        />
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className={`flex flex-col h-[calc(100vh-4rem)] max-w-3xl mx-auto w-full ${themeWrapperClass(prefs.theme)}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              aria-label="Home"
              className="rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground min-h-[36px] min-w-[36px] inline-flex items-center justify-center -ml-1 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-destructive shrink-0">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              Recording
            </span>
            <h1 className="font-display font-bold text-lg truncate">
              {title || "Live Session"}
            </h1>
            {isSummarizing && (
              <span className="flex items-center gap-1 text-[10px] text-primary font-semibold shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" />
                Analyzing…
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DisplayOptionsMenu prefs={prefs} update={updatePrefs} />
            <button
              onClick={handleEndSession}
              className="flex items-center gap-1.5 bg-destructive text-destructive-foreground px-3 py-2 rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Square className="w-3.5 h-3.5" />
              End
            </button>
          </div>
        </div>

        {/* Multi-device: Invite + presence strip */}
        {isMulti && (
          <div className="px-4 pt-3 pb-2 shrink-0 border-b border-border/60 flex items-center gap-2">
            {joinCode && (
              <Popover>
                <PopoverTrigger asChild>
                  <button className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-full border border-border bg-card hover:bg-secondary transition-colors text-xs font-semibold">
                    <UserPlus className="w-3.5 h-3.5" />
                    Invite
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[320px] p-0 border-0 bg-transparent shadow-none">
                  <JoinCodeCard code={joinCode} sessionTitle={title} />
                </PopoverContent>
              </Popover>
            )}
            <div className="flex-1 min-w-0">
              <PresenceList participants={presenceParticipants} />
            </div>
          </div>
        )}

        {/* Body — layout-driven */}
        {isVideoOnly ? (
          videoBlock
        ) : isSideBySide ? (
          <div className="flex-1 flex min-h-0">
            <div className="w-1/2 border-r border-border/60 flex flex-col min-h-0">{videoBlock}</div>
            <div className="w-1/2 flex flex-col min-h-0">{transcriptBlock}</div>
          </div>
        ) : isTranscriptFirst ? (
          <>
            {videoBlock}
            {transcriptBlock}
          </>
        ) : (
          <>
            {videoBlock}
            {transcriptBlock}
          </>
        )}

      </div>
    </AppLayout>
  );
};

export default LiveSessionPage;
