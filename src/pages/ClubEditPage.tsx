import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CoverImageUploader from "@/components/upload/CoverImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { useClub } from "@/hooks/useClubs";
import { toast } from "@/hooks/use-toast";
import TagPicker from "@/components/tags/TagPicker";

const ClubEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { club, loading, myRole } = useClub(id);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [cover, setCover] = useState<string | null>(null);
  const [primaryTagId, setPrimaryTagId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (club) {
      setName(club.name);
      setDescription(club.description || "");
      setLocation(club.location || "");
      setIsPublic(club.is_public);
      setRequiresApproval(Boolean((club as any).requires_approval));
      setCover(club.cover_image_url);
      setPrimaryTagId((club as any).primary_tag_id ?? null);
    }
  }, [club]);

  if (loading) return <AppLayout><div className="max-w-2xl mx-auto px-4 py-10 text-sm text-muted-foreground font-body">Loading…</div></AppLayout>;
  if (!club) return null;
  if (myRole !== "owner" && myRole !== "admin") {
    return <AppLayout><div className="max-w-2xl mx-auto px-4 py-10 text-sm text-muted-foreground font-body">Only admins can edit this club.</div></AppLayout>;
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase
      .from("clubs")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        is_public: isPublic,
        requires_approval: requiresApproval,
        cover_image_url: cover,
      } as any)
      .eq("id", club.id);
    setBusy(false);
    if (error) toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Saved" });
      navigate(`/clubs/${club.id}`);
    }
  };

  const remove = async () => {
    if (myRole !== "owner") return;
    if (!confirm("Permanently delete this club and all its events? This can't be undone.")) return;
    const { error } = await supabase.from("clubs").delete().eq("id", club.id);
    if (error) toast({ title: "Couldn't delete", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Club deleted" });
      navigate("/clubs");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button onClick={() => navigate(`/clubs/${club.id}`)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-4">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to club
        </button>
        <h1 className="text-3xl font-display mb-6">Manage Club</h1>
        <form onSubmit={save} className="space-y-6">
          <CoverImageUploader value={cover} onChange={setCover} seed={name || "club"} />
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40" required />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40" />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Visibility</label>
            <div className="flex gap-2">
              {[{ v: true, label: "Public" }, { v: false, label: "Private" }].map((opt) => (
                <button key={String(opt.v)} type="button" onClick={() => setIsPublic(opt.v)} className={`flex-1 p-3 rounded-lg border text-sm font-body ${isPublic === opt.v ? "border-foreground bg-accent" : "border-border"}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Joining</label>
            <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-foreground">Require admin approval</p>
                <p className="text-[11px] text-muted-foreground font-body mt-0.5 leading-snug">
                  New requests land in a pending queue. Admins approve or decline before access is granted.
                </p>
              </div>
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">Topics</label>
            <TagPicker
              kind="club"
              recordId={club.id}
              primaryTagId={primaryTagId}
              onPrimaryChange={setPrimaryTagId}
              max={5}
            />
          </div>
          <button type="submit" disabled={busy} className="w-full bg-foreground text-background py-3 rounded-lg font-body text-sm font-medium disabled:opacity-50">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
        {myRole === "owner" && (
          <div className="mt-10 pt-6 border-t border-border">
            <button onClick={remove} className="text-xs text-destructive font-body hover:underline">Delete club</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ClubEditPage;