import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Globe, Lock, MapPin, Plus, Users, Calendar, Check } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { gradientFromSeed } from "@/lib/gradient";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useClub } from "@/hooks/useClubs";
import { useClubEvents } from "@/hooks/useClubEvents";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Tab = "events" | "members" | "about";

const ClubPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { club, loading, myRole, memberCount, pendingRequest, refresh } = useClub(id);
  const { items: events, refresh: refreshEvents } = useClubEvents(id);
  const [tab, setTab] = useState<Tab>("events");
  const [members, setMembers] = useState<{ user_id: string; role: string; display_name?: string; avatar_url?: string }[]>([]);
  const [requests, setRequests] = useState<{ id: string; user_id: string; message?: string; display_name?: string }[]>([]);
  const [busy, setBusy] = useState(false);

  const isMember = !!myRole;
  const isAdmin = myRole === "owner" || myRole === "admin";

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: ms } = await supabase
        .from("club_members")
        .select("user_id, role")
        .eq("club_id", id)
        .order("joined_at");
      const userIds = (ms || []).map((m) => m.user_id);
      let profMap = new Map<string, { display_name?: string; avatar_url?: string }>();
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        profs?.forEach((p) => profMap.set(p.user_id, { display_name: p.display_name || undefined, avatar_url: p.avatar_url || undefined }));
      }
      setMembers((ms || []).map((m) => ({ ...m, ...profMap.get(m.user_id) })));
    })();
  }, [id, memberCount]);

  useEffect(() => {
    if (!id || !isAdmin) return;
    (async () => {
      const { data: rs } = await supabase
        .from("club_join_requests")
        .select("id, user_id, message")
        .eq("club_id", id)
        .eq("status", "pending");
      const ids = (rs || []).map((r) => r.user_id);
      let map = new Map<string, string>();
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
        profs?.forEach((p) => map.set(p.user_id, p.display_name || ""));
      }
      setRequests((rs || []).map((r) => ({ ...r, display_name: map.get(r.user_id) })) as any);
    })();
  }, [id, isAdmin]);

  if (loading || !club) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-10 text-sm text-muted-foreground font-body">Loading club…</div>
      </AppLayout>
    );
  }

  const heroBg = club.cover_image_url
    ? { backgroundImage: `url(${club.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { backgroundImage: gradientFromSeed(club.name) };

  const join = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setBusy(true);
    const gated = !club.is_public || Boolean((club as any).requires_approval);
    if (!gated) {
      const { error } = await supabase.from("club_members").insert({ club_id: club.id, user_id: user.id, role: "member" });
      if (error) toast({ title: "Couldn't join", description: error.message, variant: "destructive" });
      else toast({ title: "Welcome to the club" });
    } else {
      const { error } = await supabase.from("club_join_requests").insert({ club_id: club.id, user_id: user.id });
      if (error) toast({ title: "Couldn't request", description: error.message, variant: "destructive" });
      else toast({ title: "Request sent", description: "Admins will review your request." });
    }
    setBusy(false);
    refresh();
  };

  const leave = async () => {
    if (!user) return;
    if (myRole === "owner") {
      toast({ title: "Owners can't leave", description: "Transfer ownership first." });
      return;
    }
    setBusy(true);
    await supabase.from("club_members").delete().eq("club_id", club.id).eq("user_id", user.id);
    setBusy(false);
    toast({ title: "Left the club" });
    refresh();
  };

  const approveRequest = async (req: { id: string; user_id: string }) => {
    await supabase.from("club_members").insert({ club_id: club.id, user_id: req.user_id, role: "member" });
    await supabase.from("club_join_requests").delete().eq("id", req.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    refresh();
  };
  const denyRequest = async (req: { id: string }) => {
    await supabase.from("club_join_requests").update({ status: "denied", responded_at: new Date().toISOString() }).eq("id", req.id);
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const upcoming = events.filter((e) => e.status !== "completed" && e.status !== "cancelled");
  const past = events.filter((e) => e.status === "completed" || e.status === "cancelled");

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate("/clubs")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> All Clubs
        </button>

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-border aspect-[16/6] sm:aspect-[16/5] mb-5" style={heroBg as any}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-body opacity-90 mb-1">
              {club.is_public ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {club.is_public ? "Public Club" : "Private Club"}
              <span>·</span>
              <Users className="w-3 h-3" /> {memberCount}
              {club.location && (<><span>·</span><MapPin className="w-3 h-3" />{club.location}</>)}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl drop-shadow">{club.name}</h1>
          </div>
        </div>

        {/* CTA row */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex gap-2">
            {!isMember && !pendingRequest && (
              <button
                onClick={join}
                disabled={busy}
                className="px-4 py-2 rounded-full bg-foreground text-background text-xs font-body font-medium disabled:opacity-50"
              >
                {club.is_public ? "Join Club" : "Request to Join"}
              </button>
            )}
            {!isMember && pendingRequest && (
              <span className="px-4 py-2 rounded-full border border-border text-xs font-body text-muted-foreground">
                Request pending
              </span>
            )}
            {isMember && myRole !== "owner" && (
              <button
                onClick={leave}
                disabled={busy}
                className="px-4 py-2 rounded-full border border-border text-xs font-body hover:border-foreground/30 disabled:opacity-50"
              >
                Leave Club
              </button>
            )}
            {isMember && (
              <Link
                to={`/clubs/${club.id}/events/new`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-xs font-body hover:border-foreground/30"
              >
                <Plus className="w-3.5 h-3.5" /> New Event
              </Link>
            )}
          </div>
          {isAdmin && (
            <Link
              to={`/clubs/${club.id}/edit`}
              className="text-xs text-muted-foreground hover:text-foreground font-body"
            >
              Manage club →
            </Link>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border mb-6">
          {(["events", "members", "about"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 text-sm font-body capitalize border-b-2 transition-colors -mb-px",
                tab === t ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "events" && (
          <div className="space-y-8">
            {isAdmin && requests.length > 0 && (
              <section>
                <h3 className="text-sm font-body font-medium mb-3">Pending requests ({requests.length})</h3>
                <div className="space-y-2">
                  {requests.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <span className="text-sm font-body">{r.display_name || "User"}</span>
                      <div className="flex gap-2">
                        <button onClick={() => approveRequest(r)} className="text-xs px-3 py-1.5 rounded-full bg-foreground text-background font-body">Approve</button>
                        <button onClick={() => denyRequest(r)} className="text-xs px-3 py-1.5 rounded-full border border-border font-body">Deny</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h3 className="text-sm font-body font-medium mb-3">Upcoming</h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground font-body">No upcoming events.</p>
              ) : (
                <div className="grid gap-3">
                  {upcoming.map((e) => (
                    <EventRow key={e.id} clubId={club.id} e={e} onChanged={refreshEvents} canRsvp={isMember} />
                  ))}
                </div>
              )}
            </section>
            {past.length > 0 && (
              <section>
                <h3 className="text-sm font-body font-medium mb-3">Past</h3>
                <div className="grid gap-3">
                  {past.map((e) => (
                    <EventRow key={e.id} clubId={club.id} e={e} onChanged={refreshEvents} canRsvp={false} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "members" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {members.map((m) => (
              <div key={m.user_id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-accent" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-body truncate">{m.display_name || "User"}</div>
                  <div className="text-[11px] text-muted-foreground font-body capitalize">{m.role}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "about" && (
          <div className="prose prose-sm max-w-none font-body">
            {club.description ? (
              <p className="whitespace-pre-wrap">{club.description}</p>
            ) : (
              <p className="text-muted-foreground">No description yet.</p>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

const EventRow = ({
  clubId,
  e,
  onChanged,
  canRsvp,
}: {
  clubId: string;
  e: import("@/hooks/useClubEvents").ClubEventItem;
  onChanged: () => void;
  canRsvp: boolean;
}) => {
  const { user } = useAuth();
  const going = e.my_rsvp === "going";
  const dt = new Date(e.starts_at);
  const dateStr = dt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const toggleRsvp = async () => {
    if (!user) return;
    if (going) {
      await supabase.from("club_event_rsvps").delete().eq("event_id", e.id).eq("user_id", user.id);
    } else {
      await supabase.from("club_event_rsvps").upsert(
        { event_id: e.id, user_id: user.id, status: "going" },
        { onConflict: "event_id,user_id" },
      );
    }
    onChanged();
  };

  return (
    <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border hover:border-foreground/30 transition-colors">
      <Link to={`/clubs/${clubId}/events/${e.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-body uppercase tracking-wider mb-1">
          <Calendar className="w-3 h-3" /> {dateStr}
          <span>·</span>
          <span className="capitalize">{e.event_type}</span>
          <span>·</span>
          <span className="capitalize">{e.mode.replace("_", " ")}</span>
        </div>
        <div className="font-body text-sm font-medium truncate">{e.title}</div>
        {e.venue && <div className="text-xs text-muted-foreground font-body truncate">{e.venue}</div>}
      </Link>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground font-body whitespace-nowrap">{e.rsvp_count || 0} going</span>
        {canRsvp && (
          <button
            onClick={toggleRsvp}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-body font-medium border whitespace-nowrap",
              going ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/30",
            )}
          >
            {going ? (<><Check className="w-3 h-3 inline mr-1" />Going</>) : "RSVP"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ClubPage;