import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { LiveTranscriptEntry } from "@/hooks/useLiveTranscription";

interface InterimMap {
  [deviceId: string]: { speakerSlot: number; speakerName: string; text: string };
}

/**
 * Host-side hook: subscribes to live_session_entries for the session and merges
 * them in chronological order (by client_ts). Also subscribes to the live:{id}
 * broadcast channel for interim text from each device.
 */
export function useMergedLiveTranscript(sessionId: string | null, isActive: boolean) {
  const [entries, setEntries] = useState<LiveTranscriptEntry[]>([]);
  const [interimByDevice, setInterimByDevice] = useState<InterimMap>({});
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!sessionId || !isActive) return;
    seenIds.current = new Set();
    setEntries([]);

    const load = async () => {
      const { data } = await (supabase as any)
        .from("live_session_entries")
        .select("*")
        .eq("session_id", sessionId)
        .order("client_ts", { ascending: true });
      if (data) {
        const mapped: LiveTranscriptEntry[] = (data as any[]).map((r) => ({
          id: r.id,
          speakerId: r.speaker_slot,
          speakerName: r.speaker_name,
          text: r.text,
          timestamp: new Date(r.client_ts).getTime(),
          subtopic: null,
          threadId: null,
        }));
        mapped.forEach((m) => seenIds.current.add(m.id));
        setEntries(mapped);
      }
    };
    load();

    const dbChannel = supabase
      .channel(`live-entries-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_session_entries", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const r: any = payload.new;
          if (!r || seenIds.current.has(r.id)) return;
          seenIds.current.add(r.id);
          const newEntry: LiveTranscriptEntry = {
            id: r.id,
            speakerId: r.speaker_slot,
            speakerName: r.speaker_name,
            text: r.text,
            timestamp: new Date(r.client_ts).getTime(),
            subtopic: null,
            threadId: null,
          };
          setEntries((prev) => {
            const next = [...prev, newEntry];
            next.sort((a, b) => a.timestamp - b.timestamp);
            return next;
          });
          // Clear interim for this device
          setInterimByDevice((prev) => {
            const copy = { ...prev };
            delete copy[r.device_id];
            return copy;
          });
        },
      )
      .subscribe();

    const bChannel = supabase
      .channel(`live:${sessionId}`)
      .on("broadcast", { event: "interim" }, (msg) => {
        const p = msg.payload as any;
        if (!p?.device_id) return;
        setInterimByDevice((prev) => ({
          ...prev,
          [p.device_id]: {
            speakerSlot: p.speaker_slot,
            speakerName: p.speaker_name,
            text: p.text,
          },
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(dbChannel);
      supabase.removeChannel(bChannel);
    };
  }, [sessionId, isActive]);

  return { entries, interimByDevice };
}
