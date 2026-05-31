import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Send, X, Mail, AtSign } from "lucide-react";

interface Side { id: string; label: string }
interface PendingInvite {
  id: string;
  invited_user_id: string | null;
  invited_username: string | null;
  invited_email: string | null;
  side_id: string | null;
  status: string | null;
}

interface Props {
  debateId: string | null;
  sides: Side[];
}

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/**
 * Compact invite widget for the host-side lobby. Lets the host re-invite
 * speakers by @username or email after the debate has been created, without
 * having to bounce back to the Create flow.
 */
export default function LobbyInvitePanel({ debateId, sides }: Props) {
  const { user } = useAuth();
  const [input, setInput] = useState("");
  const [sideId, setSideId] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<PendingInvite[]>([]);

  useEffect(() => {
    if (!debateId) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase
        .from("debate_invitations")
        .select("id, invited_user_id, invited_username, invited_email, side_id, status")
        .eq("debate_id", debateId);
      if (!cancelled) setInvites((data || []) as PendingInvite[]);
    };
    load();
    const ch = supabase
      .channel(`lobby-invites-${debateId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "debate_invitations", filter: `debate_id=eq.${debateId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [debateId]);

  const sendInvite = async () => {
    if (!debateId || !user || sending) return;
    const value = input.trim();
    if (!value) return;
    setSending(true);
    try {
      if (isEmail(value)) {
        // Avoid duplicates
        if (invites.some((i) => (i.invited_email || "").toLowerCase() === value.toLowerCase())) {
          toast.error("Already invited.");
          return;
        }
        const tokenBytes = new Uint8Array(32);
        crypto.getRandomValues(tokenBytes);
        const inviteToken = Array.from(tokenBytes)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const { data: inv, error } = await supabase
          .from("debate_invitations")
          .insert({
            debate_id: debateId,
            invited_user_id: user.id,
            invited_username: value.split("@")[0],
            invited_email: value,
            invite_token: inviteToken,
            side_id: sideId || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        if (inv) {
          supabase.functions
            .invoke("send-invite-email", {
              body: { invitation_id: inv.id, invite_token: inviteToken },
            })
            .catch((err) => console.error("Email send error:", err));
        }
        toast.success("Email invitation queued.");
      } else {
        const handle = value.replace(/^@/, "");
        const { data: profiles, error: pErr } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .eq("display_name", handle)
          .limit(1);
        if (pErr) throw pErr;
        const p = (profiles || [])[0] as any;
        if (!p) {
          toast.error(`User “${handle}” not found.`);
          return;
        }
        if (invites.some((i) => i.invited_user_id === p.user_id && !i.invited_email)) {
          toast.error("Already invited.");
          return;
        }
        const { error } = await supabase.from("debate_invitations").insert({
          debate_id: debateId,
          invited_user_id: p.user_id,
          invited_username: p.display_name || handle,
          side_id: sideId || null,
        });
        if (error) throw error;
        toast.success(`Invited ${p.display_name || handle}.`);
      }
      setInput("");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Couldn't send invite.");
    } finally {
      setSending(false);
    }
  };

  const rescind = async (inv: PendingInvite) => {
    if (!debateId) return;
    try {
      await supabase.from("debate_invitations").delete().eq("id", inv.id);
      if (inv.invited_user_id) {
        await Promise.all([
          supabase
            .from("debate_interests")
            .delete()
            .eq("debate_id", debateId)
            .eq("user_id", inv.invited_user_id),
          supabase
            .from("debate_participants")
            .delete()
            .eq("debate_id", debateId)
            .eq("user_id", inv.invited_user_id),
        ]);
      }
    } catch (err) {
      console.warn("Rescind failed", err);
    }
  };

  if (!debateId) return null;

  return (
    <div className="bg-accent/40 border border-border rounded-lg p-4 space-y-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body font-medium">
          Invite speakers directly
        </p>
        <p className="text-[11px] text-muted-foreground font-body mt-0.5">
          Send by @username or email — they'll land straight in this lobby.
        </p>
      </div>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
            {isEmail(input) ? <Mail className="w-3.5 h-3.5" /> : <AtSign className="w-3.5 h-3.5" />}
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                sendInvite();
              }
            }}
            placeholder="username or email"
            className="w-full bg-background border border-border rounded-md text-sm font-body pl-7 pr-2 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/30"
          />
        </div>
        {sides.length > 0 && (
          <select
            value={sideId}
            onChange={(e) => setSideId(e.target.value)}
            className="bg-background border border-border rounded-md text-xs font-body px-2 py-1.5 text-foreground focus:outline-none focus:border-foreground/30"
          >
            <option value="">Any side</option>
            {sides.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={sendInvite}
          disabled={sending || !input.trim()}
          className="text-xs font-body bg-foreground text-background rounded-md px-3 py-1.5 flex items-center gap-1 hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          Invite
        </button>
      </div>

      {invites.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {invites.map((inv) => {
            const label = inv.invited_email || inv.invited_username || "Invitee";
            const side = sides.find((s) => s.id === inv.side_id);
            const accepted = inv.status === "accepted";
            return (
              <span
                key={inv.id}
                className={`text-[11px] font-body border rounded-full pl-2 pr-1 py-0.5 flex items-center gap-1 ${
                  accepted ? "bg-foreground text-background border-foreground" : "bg-background border-border text-foreground"
                }`}
              >
                <span className="truncate max-w-[160px]">{label}</span>
                {side && <span className="opacity-60">· {side.label}</span>}
                <button
                  type="button"
                  onClick={() => rescind(inv)}
                  className="hover:bg-foreground/10 rounded-full p-0.5"
                  aria-label="Rescind invite"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}