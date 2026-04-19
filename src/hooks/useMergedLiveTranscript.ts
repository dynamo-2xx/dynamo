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
 *
 * Resolves speaker labels by joining against live_session_participants
 * (display_name) so transcripts always show the user's chosen name.
 */
export function useMergedLiveTranscript(sessionId: string | null, isActive: boolean) {
  const [entries, setEntries] = useState<LiveTranscriptEntry[]>([]);
  const [interimByDevice, setInterimByDevice] = useState<InterimMap>({});
  const [nameByDevice, setNameByDevice] = useState<Record<string, string>>({});
  const seenIds = useRef<Set<string>>(new Set());
  const rawEntriesRef = useRef<any[]>([]);

  // Re-render entries with current name map applied
  const applyNames = (rows: any[], nameMap: Record<string, string>): LiveTranscriptEntry[] =>
    rows.map((r) => ({
      id: r.id,
      speaker_id: r.speaker_slot,
      speaker_label: nameMap[r.device_id] || r.speaker_name || `Speaker ${r.speaker_slot}`,
      text: r.text,
      words: r.words,
      timestamp: new Date(r.client_ts).getTime(),
      is_final: true,
    }));

  // Load participant name map
  useEffect(() => {
    if (!sessionId || !isActive) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("live_session_participants")
        .select("device_id, display_name")
        .eq("session_id", sessionId);
      if (cancelled || !data) return;
      const map: Record<string, string> = {};
      (data as any[]).forEach((p) => {
        if (p.display_name) map[p.device_id] = p.display_name;
      });
      setNameByDevice(map);
    };
    load();

    const ch = supabase
      .channel(`live-pname-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "live_session_participants", filter: `session_id=eq.${sessionId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [sessionId, isActive]);

  useEffect(() => {
    if (!sessionId || !isActive) return;
    seenIds.current = new Set();
    rawEntriesRef.current = [];
    setEntries([]);

    const load = async () => {
      const { data } = await (supabase as any)
        .from("live_session_entries")
        .select("*")
        .eq("session_id", sessionId)
        .order("client_ts", { ascending: true });
      if (data) {
        rawEntriesRef.current = data as any[];
        (data as any[]).forEach((m) => seenIds.current.add(m.id));
        setEntries(applyNames(rawEntriesRef.current, nameByDevice));
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
          rawEntriesRef.current = [...rawEntriesRef.current, r].sort(
            (a, b) => new Date(a.client_ts).getTime() - new Date(b.client_ts).getTime(),
          );
          setEntries(applyNames(rawEntriesRef.current, nameByDevice));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isActive]);

  // Whenever the name map changes, re-derive labels on the existing entries.
  useEffect(() => {
    setEntries(applyNames(rawEntriesRef.current, nameByDevice));
  }, [nameByDevice]);

  return { entries, interimByDevice, nameByDevice };
}
