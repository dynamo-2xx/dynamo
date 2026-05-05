import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Plus, X, Sparkles, Globe, Lock, Swords } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DynamoLoader from "@/components/DynamoLoader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import TagPicker from "@/components/tags/TagPicker";
import CoverImageUploader from "@/components/upload/CoverImageUploader";
import type { Tag } from "@/hooks/useTags";
import { useTagMutations } from "@/hooks/useTags";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const CreateChangeMyMindPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState("");
  const [subtopics, setSubtopics] = useState<string[]>([]);
  const [newSub, setNewSub] = useState("");
  const [position, setPosition] = useState("");
  const [bufferedTags, setBufferedTags] = useState<Tag[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [gradingEnabled, setGradingEnabled] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  const { attachTag } = useTagMutations();

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-facilitator", {
        body: { action: "generate_debate", payload: { topic: prompt.trim(), format: "change_my_mind" } },
      });
      if (error) throw error;
      setTopic(data.topic || prompt.trim());
      setSubtopics((data.subtopics || []).slice(0, 6));
      setStep(2);
    } catch (e: any) {
      toast.error(e.message || "Couldn't generate. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const addSub = () => {
    const v = newSub.trim();
    if (!v) return;
    if (subtopics.length >= 6) { toast.error("Max 6 subtopics."); return; }
    setSubtopics([...subtopics, v]);
    setNewSub("");
  };

  const publish = async () => {
    if (!user) return;
    if (!topic.trim()) { toast.error("Topic required"); setStep(2); return; }
    if (subtopics.length === 0) { toast.error("Add at least one subtopic"); setStep(2); return; }
    if (!position.trim()) { toast.error("Add your position"); return; }

    setPublishing(true);
    try {
      // Create debate
      const { data: debate, error: dErr } = await supabase
        .from("debates")
        .insert({
          created_by: user.id,
          topic: topic.trim(),
          is_public: isPublic,
          status: "scheduled",
          format: "change_my_mind",
          grading_enabled: gradingEnabled,
          cover_image_url: coverUrl,
        } as any)
        .select()
        .single();
      if (dErr) throw dErr;

      // Owner side
      const { data: side, error: sErr } = await supabase
        .from("debate_sides")
        .insert({ debate_id: debate.id, label: position.trim().slice(0, 100), sort_order: 0 })
        .select()
        .single();
      if (sErr) throw sErr;

      // Owner participant
      await supabase.from("debate_participants").insert({
        debate_id: debate.id, user_id: user.id, side_id: side.id, participant_role: "speaker",
      });

      // Subtopics
      if (subtopics.length) {
        await supabase.from("debate_subtopics").insert(
          subtopics.map((title, i) => ({ debate_id: debate.id, title, sort_order: i })),
        );
      }

      // Tags
      for (const tag of bufferedTags) {
        await attachTag("debate", debate.id, tag.id);
      }

      toast.success("Published");
      navigate(`/cmm/${debate.id}/lobby`);
    } catch (e: any) {
      toast.error(e.message || "Couldn't publish");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
          <Swords className="w-3.5 h-3.5" />
          <span>Change My Mind · Step {step} of 3</span>
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <h1 className="font-display text-3xl sm:text-4xl">What do you want to be challenged on?</h1>
            <Textarea
              autoFocus
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. The four-day work week is the right move for the U.S."
              rows={3}
              className="text-base resize-none"
            />
            {generating ? (
              <DynamoLoader />
            ) : (
              <Button size="lg" className="w-full" onClick={generate} disabled={!prompt.trim()}>
                <Sparkles className="w-4 h-4" /> Generate subtopics
              </Button>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Topic</Label>
              <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={2} className="resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Subtopics ({subtopics.length}/6)</Label>
              <ul className="space-y-1.5">
                {subtopics.map((s, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-md border border-border/50 px-3 py-2">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                    <span className="flex-1 text-sm">{s}</span>
                    <button onClick={() => setSubtopics(subtopics.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
              {subtopics.length < 6 && (
                <div className="flex gap-2">
                  <Input value={newSub} onChange={(e) => setNewSub(e.target.value)} placeholder="Add subtopic" onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSub(); } }} />
                  <Button variant="outline" size="icon" onClick={addSub}><Plus className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button className="flex-1" onClick={() => setStep(3)} disabled={!topic.trim() || subtopics.length === 0}>
                Next <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Your position</Label>
              <Input
                autoFocus
                value={position}
                onChange={(e) => setPosition(e.target.value.slice(0, 100))}
                placeholder="My position…"
              />
              <div className="text-xs text-muted-foreground text-right">{position.length}/100</div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Tags</Label>
              <TagPicker kind="debate" recordId={null} buffered={bufferedTags} onBufferedChange={setBufferedTags} />
            </div>

            <CoverImageUploader value={coverUrl} onChange={setCoverUrl} seed={topic || prompt} />

            <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
              <div className="flex items-center gap-2 text-sm">
                {isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                <span>{isPublic ? "Public — anyone can find it" : "Private — invite only"}</span>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
              <div>
                <div className="text-sm font-medium">AI grading</div>
                <div className="text-xs text-muted-foreground">Score each round privately</div>
              </div>
              <Switch checked={gradingEnabled} onCheckedChange={setGradingEnabled} />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4" /> Back</Button>
              <Button className="flex-1" onClick={publish} disabled={publishing || !position.trim()}>
                {publishing ? "Publishing…" : "Publish"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default CreateChangeMyMindPage;