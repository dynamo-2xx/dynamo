import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Users, Check, Trash2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/hooks/useClubs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { ClubEventItem } from "@/hooks/useClubEvents";

const ClubEventDetailPage = () => {
  const { id, eventId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { club, myRole } = useClub(id);
  const [event, setEvent] = useState<ClubEventItem | null>(null);
  const [rsvps, setRsvps] = useState<{ user_id: string; status: string; display_name?: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const isMember = !!myRole;
  const isAdmin = myRole === "owner" || myRole === "admin";
  const isCreator = !!user && !!event && event.created_by === user.id;

  const refresh = async () => {
    if (!eventId) return;
    const { data } = await supabase.from("club_events").select("*").eq("id", eventId).maybeSingle();
    setEvent(data as any);
    const { data: rs } = await supabase.from("club_event_rsvps").select("user_id, status").eq("event_id", eventId);
    const ids = (rs || []).map((r) => r.user_id);
    let map = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      profs?.forEach((p) => map.set(p.user_id, p.display_name || ""));
    }
    setRsvps((rs || []).map((r) => ({ ...r, display_name: map.get(r.user_id) })));
  };

  useEffect(() => { refresh(); }, [eventId]);

  if (!event || !club) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-muted-foreground font-body">Loading event…</div>
      </AppLayout>
    );
  }

  const myRsvp = user ? rsvps.find((r) => r.user_id === user.id)?.status : null;
  const goingCount = rsvps.filter((r) => r.status === "going").length;
  const dt = new Date(event.starts_at);
  const dateStr = dt.toLocaleString(undefined, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });

  const setRsvp = async (status: "going" | "maybe" | "declined" | null) => {
    if (!user) { navigate("/auth"); return; }
    setBusy(true);
    if (status === null) {
      await supabase.from("club_event_rsvps").delete().eq("event_id", event.id).eq("user_id", user.id);
    } else {
      await supabase.from("club_event_rsvps").upsert({ event_id: event.id, user_id: user.id, status }, { onConflict: "event_id,user_id" });
    }
    setBusy(false);
    refresh();
  };

  const cancelEvent = async () => {
    if (!confirm("Cancel this event?")) return;
    await supabase.from("club_events").update({ status: "cancelled" }).eq("id", event.id);
    toast({ title: "Event cancelled" });
    refresh();
  };

  const launch = async () => {
    toast({ title: "Launch flow", description: "Hook this up to the appropriate creator (debate/live/CMM) when ready." });
    // Placeholder for v1: actual session creation will go here.
    await supabase.from("club_events").update({ status: "live" }).eq("id", event.id);
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(`/clubs/${club.id}`)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {club.name}
        </button>

        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-2">
          <span className="capitalize">{event.event_type}</span>
          <span>·</span>
          <span className="capitalize">{event.mode.replace("_", " ")}</span>
          {event.status !== "scheduled" && (<><span>·</span><span className="capitalize text-foreground">{event.status}</span></>)}
        </div>
        <h1 className="text-3xl sm:text-4xl font-display mb-3">{event.title}</h1>

        <div className="space-y-1.5 mb-6">
          <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
            <Calendar className="w-4 h-4" /> {dateStr}
          </div>
          {event.venue && (
            <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
              <MapPin className="w-4 h-4" /> {event.venue}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm font-body text-muted-foreground">
            <Users className="w-4 h-4" /> {goingCount} going
            {event.capacity ? ` / ${event.capacity}` : ""}
          </div>
        </div>

        {event.description && (
          <p className="text-sm font-body whitespace-pre-wrap mb-6">{event.description}</p>
        )}

        <div className="flex flex-wrap gap-2 mb-8">
          {isMember && event.status === "scheduled" && (
            <>
              <button
                onClick={() => setRsvp(myRsvp === "going" ? null : "going")}
                disabled={busy}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-body font-medium border",
                  myRsvp === "going" ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/30",
                )}
              >
                {myRsvp === "going" ? (<><Check className="w-3 h-3 inline mr-1" />Going</>) : "RSVP — I'm going"}
              </button>
              <button
                onClick={() => setRsvp(myRsvp === "maybe" ? null : "maybe")}
                disabled={busy}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-body border",
                  myRsvp === "maybe" ? "bg-accent border-foreground" : "border-border hover:border-foreground/30",
                )}
              >
                Maybe
              </button>
            </>
          )}
          {(isCreator || isAdmin) && event.status === "scheduled" && (
            <>
              <button onClick={launch} className="px-4 py-2 rounded-full bg-foreground text-background text-xs font-body font-medium">
                Launch session
              </button>
              <button onClick={cancelEvent} className="px-4 py-2 rounded-full border border-border text-xs font-body text-destructive hover:border-destructive/40 inline-flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Cancel
              </button>
            </>
          )}
          {event.session_id && (
            <Link
              to={event.event_type === "live" ? `/live/${event.session_id}` : event.event_type === "cmm" ? `/cmm/${event.session_id}` : `/debate/${event.session_id}`}
              className="px-4 py-2 rounded-full bg-foreground text-background text-xs font-body font-medium"
            >
              Join now
            </Link>
          )}
        </div>

        {rsvps.length > 0 && (
          <section>
            <h3 className="text-sm font-body font-medium mb-3">Attending</h3>
            <div className="flex flex-wrap gap-2">
              {rsvps.filter((r) => r.status === "going").map((r) => (
                <span key={r.user_id} className="text-xs font-body px-2.5 py-1 rounded-full border border-border">
                  {r.display_name || "User"}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
};

export default ClubEventDetailPage;