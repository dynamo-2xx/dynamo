import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import CoverImageUploader from "@/components/upload/CoverImageUploader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const CreateClubPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [cover, setCover] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!name.trim()) {
      toast({ title: "Name your club", variant: "destructive" });
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("clubs")
      .insert({
        created_by: user.id,
        name: name.trim(),
        description: description.trim() || null,
        location: location.trim() || null,
        is_public: isPublic,
        cover_image_url: cover,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      toast({ title: "Couldn't create club", description: error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Club created" });
    navigate(`/clubs/${data.id}`);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
        <button
          onClick={() => navigate("/clubs")}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-body mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Clubs
        </button>
        <h1 className="text-3xl font-display mb-6">Create a Club</h1>
        <form onSubmit={submit} className="space-y-6">
          <CoverImageUploader value={cover} onChange={setCover} seed={name || "club"} />

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Stanford Debate Society"
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40"
              maxLength={80}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this club about?"
              rows={4}
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40 resize-none"
              maxLength={500}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
              Location (optional)
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, campus, region…"
              className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-body focus:outline-none focus:border-foreground/40"
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-wider text-muted-foreground font-body font-medium">
              Visibility
            </label>
            <div className="flex gap-2">
              {[
                { v: true, label: "Public", desc: "Anyone can find and join" },
                { v: false, label: "Private", desc: "Members must be approved" },
              ].map((opt) => (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => setIsPublic(opt.v)}
                  className={`flex-1 text-left p-3 rounded-lg border transition-colors ${
                    isPublic === opt.v ? "border-foreground bg-accent" : "border-border hover:border-foreground/30"
                  }`}
                >
                  <div className="text-sm font-body font-medium">{opt.label}</div>
                  <div className="text-[11px] text-muted-foreground font-body">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-foreground text-background py-3 rounded-lg font-body text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Creating…" : "Create Club"}
          </button>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateClubPage;