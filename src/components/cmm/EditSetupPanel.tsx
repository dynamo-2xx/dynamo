import { useEffect, useState } from "react";
import { Plus, X, GripVertical, Globe, Lock, Sparkles, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import TagPicker from "@/components/tags/TagPicker";
import InvitePeoplePanel from "./InvitePeoplePanel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Subtopic { id: string; title: string; sort_order: number; }
interface Side { id: string; label: string; }

interface Props {
  debateId: string;
  topic: string;
  isPublic: boolean;
  gradingEnabled: boolean;
  subtopics: Subtopic[];
  ownerSide: Side | null;
  onChanged: () => void;
}

const EditSetupPanel = ({ debateId, topic, isPublic, gradingEnabled, subtopics, ownerSide, onChanged }: Props) => {
  const navigate = useNavigate();
  const [t, setT] = useState(topic);
  const [pub, setPub] = useState(isPublic);
  const [grade, setGrade] = useState(gradingEnabled);
  const [side, setSide] = useState(ownerSide?.label ?? "");
  const [subs, setSubs] = useState<Subtopic[]>(subtopics);
  const [newSub, setNewSub] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { setT(topic); }, [topic]);
  useEffect(() => { setPub(isPublic); }, [isPublic]);
  useEffect(() => { setGrade(gradingEnabled); }, [gradingEnabled]);
  useEffect(() => { setSide(ownerSide?.label ?? ""); }, [ownerSide?.label]);
  useEffect(() => { setSubs(subtopics); }, [subtopics]);

  const addSub = () => {
    const v = newSub.trim();
    if (!v) return;
    if (subs.length >= 6) { toast.error("Max 6 subtopics."); return; }
    setSubs([...subs, { id: `tmp-${Date.now()}`, title: v, sort_order: subs.length }]);
    setNewSub("");
  };

  const removeSub = (id: string) => setSubs(subs.filter((s) => s.id !== id));

  const save = async () => {
    setSaving(true);
    try {
      const { error: dErr } = await supabase
        .from("debates")
        .update({ topic: t.trim(), is_public: pub, grading_enabled: grade })
        .eq("id", debateId);
      if (dErr) throw dErr;

      if (ownerSide && side.trim() && side.trim() !== ownerSide.label) {
        const { error: sErr } = await supabase
          .from("debate_sides")
          .update({ label: side.trim() })
          .eq("id", ownerSide.id);
        if (sErr) throw sErr;
      }

      // Sync subtopics: delete missing, upsert remaining (replace strategy).
      const existingIds = new Set(subtopics.map((s) => s.id));
      const keptIds = new Set(subs.filter((s) => !s.id.startsWith("tmp-")).map((s) => s.id));
      const toDelete = [...existingIds].filter((id) => !keptIds.has(id));
      if (toDelete.length) {
        await supabase.from("debate_subtopics").delete().in("id", toDelete);
      }
      // Update sort_order for kept rows
      for (let i = 0; i < subs.length; i++) {
        const s = subs[i];
        if (s.id.startsWith("tmp-")) {
          await supabase.from("debate_subtopics").insert({
            debate_id: debateId, title: s.title, sort_order: i,
          });
        } else {
          await supabase.from("debate_subtopics").update({ title: s.title, sort_order: i }).eq("id", s.id);
        }
      }

      toast.success("Saved");
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this Change My Mind? This cannot be undone.")) return;
    const { error } = await supabase.from("debates").delete().eq("id", debateId);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    navigate("/");
  };

  return (
    <div className="rounded-2xl border border-foreground/20 bg-foreground/[0.02] p-4 space-y-5">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        <h2 className="font-display text-lg">Edit setup</h2>
        <span className="text-xs text-muted-foreground">Locks when first round starts</span>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Topic</Label>
        <Textarea value={t} onChange={(e) => setT(e.target.value)} rows={2} className="resize-none" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your position</Label>
        <Input value={side} onChange={(e) => setSide(e.target.value.slice(0, 100))} placeholder="My position…" />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Subtopics ({subs.length}/6)</Label>
        <ul className="space-y-1.5">
          {subs.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2">
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="flex-1 text-sm truncate">{s.title}</span>
              <button onClick={() => removeSub(s.id)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        {subs.length < 6 && (
          <div className="flex gap-2">
            <Input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add subtopic" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }} />
            <Button variant="outline" size="icon" onClick={addSub}><Plus className="w-4 h-4" /></Button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tags</Label>
        <TagPicker kind="debate" recordId={debateId} />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          {pub ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          <span>{pub ? "Public" : "Private"}</span>
        </div>
        <Switch checked={pub} onCheckedChange={setPub} />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
        <div>
          <div className="text-sm font-medium">AI grading</div>
          <div className="text-xs text-muted-foreground">Each round gets scored privately</div>
        </div>
        <Switch checked={grade} onCheckedChange={setGrade} />
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Invite people</Label>
        <InvitePeoplePanel debateId={debateId} />
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={remove} className="text-destructive hover:text-destructive">
          <Trash2 className="w-4 h-4" /> Delete
        </Button>
        <Button className="flex-1" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </div>

      <div className="pt-1">
        <Button
          variant="default"
          className="w-full"
          disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              const { error } = await supabase
                .from("debates")
                .update({ is_public: true })
                .eq("id", debateId);
              if (error) throw error;
              setPub(true);
              toast.success("Published to Explore");
              onChanged();
              navigate("/explore");
            } catch (e: any) {
              toast.error(e.message || "Couldn't publish");
            } finally {
              setSaving(false);
            }
          }}
        >
          <Send className="w-4 h-4" /> Publish
        </Button>
        <p className="text-[11px] text-muted-foreground text-center mt-1.5">
          Publish so others can find and challenge it.
        </p>
      </div>
    </div>
  );
};

export default EditSetupPanel;