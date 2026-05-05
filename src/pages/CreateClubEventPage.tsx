import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CreateClubEventPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<"debate" | "live" | "cmm">("debate");
  const [mode, setMode] = useState<"online" | "in_person" | "hybrid">("online");
  const [startsAt, setStartsAt] = useState("");
  const [venue, setVenue] = useState("");
  const [capacity, setCapacity] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    if (!title.trim() || !startsAt) {
      toast({ title: "Add a title and date", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("club_events")
      .insert({
        club_id: id,
        created_by: user.id,
        title: title.trim(),
        description: description.trim() || null,
        event_type: eventType,
        mode,
        starts_at: new Date(startsAt).toISOString(),
        venue: venue.trim() || null,
        capacity: capacity ? parseInt(capacity, 10) : null,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast({ title: "Couldn't create event", description: error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Event published" });
    navigate(`/clubs/${id}/events/${data.id}`);
  };

  const Pill = ({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-1.5 rounded-full text-xs font-body border transition-colors capitalize",
        active ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/30",
      )}
    >
      {label}
    </button>
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate(`/clubs/${id}`)}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to club
        </button>
        <h1 className="text-3xl font-display mb-6">New Event</h1>
        <form onSubmit={submit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40"
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Type</label>
            <div className="flex gap-2">
              {(["debate", "live", "cmm"] as const).map((t) => (
                <Pill key={t} active={eventType === t} onClick={() => setEventType(t)} label={t === "cmm" ? "Change My Mind" : t} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Mode</label>
            <div className="flex gap-2">
              {(["online", "in_person", "hybrid"] as const).map((m) => (
                <Pill key={m} active={mode === m} onClick={() => setMode(m)} label={m.replace("_", " ")} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Starts at</label>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40"
              required
            />
          </div>

          {mode !== "online" && (
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Venue</label>
              <input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Address or room"
                className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40"
                maxLength={200}
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Capacity (optional)</label>
            <input
              type="number"
              min={1}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-foreground text-background py-3 rounded-lg font-body text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Publishing…" : "Publish Event"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateClubEventPage;