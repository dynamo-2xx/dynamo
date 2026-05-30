import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface QueuedSpeaker {
  user_id: string;
  side_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  debateId: string | null;
  sides: { id: string; label: string }[];
  /** Host user id — rendered first so the host always appears in the bubble strip. */
  hostUserId?: string | null;
}

/**
 * Shows avatar bubbles of every speaker waiting in the lobby — accepted
 * invitees + queued (in-person) speakers — grouped by side. Rendered on both
 * the host and the waiting-invitee lobby so everyone sees who else is here.
 */
export default function QueuedSpeakerBubbles({ debateId, sides, hostUserId }: Props) {
  const [rows, setRows] = useState<QueuedSpeaker[]>([]);
  const [hostRow, setHostRow] = useState<QueuedSpeaker | null>(null);

  useEffect(() => {
    if (!debateId) return;
    let cancelled = false;
    const load = async () => {
      const [interestRes, inviteRes, hostPartRes] = await Promise.all([
        supabase
          .from("debate_interests")
          .select("user_id, side_id")
          .eq("debate_id", debateId)
          .eq("role", "queued_speaker"),
        supabase
          .from("debate_invitations")
          .select("invited_user_id, side_id")
          .eq("debate_id", debateId)
          .eq("status", "accepted"),
        hostUserId
          ? supabase
              .from("debate_participants")
              .select("side_id")
              .eq("debate_id", debateId)
              .eq("user_id", hostUserId)
              .maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      const byUser = new Map<string, { user_id: string; side_id: string | null }>();
      (interestRes.data ?? []).forEach((r: any) => {
        if (r.user_id) byUser.set(r.user_id, { user_id: r.user_id, side_id: r.side_id });
      });
      (inviteRes.data ?? []).forEach((r: any) => {
        if (r.invited_user_id && !byUser.has(r.invited_user_id)) {
          byUser.set(r.invited_user_id, { user_id: r.invited_user_id, side_id: r.side_id });
        }
      });
      // Always include the host so the lobby strip shows everyone present.
      const hostSideId = (hostPartRes as any)?.data?.side_id ?? null;
      if (hostUserId && !byUser.has(hostUserId)) {
        byUser.set(hostUserId, { user_id: hostUserId, side_id: hostSideId });
      }
      const ids = Array.from(byUser.keys());
      if (ids.length === 0) {
        if (!cancelled) { setRows([]); setHostRow(null); }
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);
      const profMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
      (profs ?? []).forEach((p: any) => profMap.set(p.user_id, { display_name: p.display_name, avatar_url: p.avatar_url }));
      const merged: QueuedSpeaker[] = Array.from(byUser.values()).map((u) => ({
        user_id: u.user_id,
        side_id: u.side_id,
        display_name: profMap.get(u.user_id)?.display_name ?? null,
        avatar_url: profMap.get(u.user_id)?.avatar_url ?? null,
      }));
      if (!cancelled) {
        const host = hostUserId ? merged.find((m) => m.user_id === hostUserId) ?? null : null;
        setHostRow(host);
        setRows(merged.filter((m) => m.user_id !== hostUserId));
      }
    };
    load();
    const ch = supabase
      .channel(`lobby-bubbles-${debateId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "debate_interests", filter: `debate_id=eq.${debateId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "debate_invitations", filter: `debate_id=eq.${debateId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "debate_participants", filter: `debate_id=eq.${debateId}` }, () => load())
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [debateId, hostUserId]);

  if (rows.length === 0 && !hostRow) return null;
  const ordered = hostRow ? [hostRow, ...rows] : rows;

  return (
    <div className="border border-border rounded-lg p-3 bg-background">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body mb-2">
        In the lobby
      </p>
      <div className="flex flex-wrap gap-2">
        {ordered.map((r) => {
          const side = sides.find((s) => s.id === r.side_id);
          const initials = (r.display_name || "?").slice(0, 2).toUpperCase();
          const isHost = r.user_id === hostUserId;
          return (
            <div key={r.user_id} className={`inline-flex items-center gap-1.5 border rounded-full pl-0.5 pr-2 py-0.5 text-xs font-body ${isHost ? "bg-foreground/5 border-foreground/30" : "bg-accent/40 border-border"}`}>
              {r.avatar_url ? (
                <img src={r.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <span className="w-6 h-6 rounded-full bg-foreground/10 inline-flex items-center justify-center text-[10px]">{initials}</span>
              )}
              <span className="text-foreground">{r.display_name || "Speaker"}</span>
              {isHost && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground border-l border-border pl-1.5 ml-0.5">
                  Host
                </span>
              )}
              {side && (
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground border-l border-border pl-1.5 ml-0.5">
                  {side.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}