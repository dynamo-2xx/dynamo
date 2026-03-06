import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus, Minus, X, Sparkles, Globe, Lock, Users } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DynamoLoader from "@/components/DynamoLoader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface GeneratedDebate {
  topic: string;
  subtopics: string[];
  sides: string[];
  turnsPerSubtopic: number;
  timePerTurn: string;
}

const TIME_OPTIONS = ["30s", "1 min", "2 min", "3 min", "5 min"];

const CreateDebatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [prompt, setPrompt] = useState("");
  const [debate, setDebate] = useState<GeneratedDebate | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setStep(2);

    try {
      const response = await supabase.functions.invoke("ai-facilitator", {
        body: { action: "generate_debate", payload: { topic: prompt } },
      });

      if (response.error) throw response.error;

      const data = response.data;
      setDebate({
        topic: data.topic,
        subtopics: data.subtopics,
        sides: data.sides,
        turnsPerSubtopic: data.turns_per_subtopic,
        timePerTurn: data.time_per_turn,
      });
      setStep(3);
    } catch (err) {
      console.error("Generation failed:", err);
      // Fallback to a basic structure
      setDebate({
        topic: prompt.charAt(0).toUpperCase() + prompt.slice(1) + (prompt.endsWith("?") ? "" : "?"),
        subtopics: ["Key considerations", "Potential impacts", "Alternative approaches"],
        sides: ["For", "Against"],
        turnsPerSubtopic: 2,
        timePerTurn: "2 min",
      });
      setStep(3);
      toast.error("AI generation had an issue — using a default structure. You can edit everything.");
    }
  }, [prompt]);

  const handleGenerationComplete = useCallback(() => {
    // This is called if step 2 loader finishes before AI — only used as fallback
  }, []);

  const updateSubtopic = (index: number, value: string) => {
    if (!debate) return;
    const updated = [...debate.subtopics];
    updated[index] = value;
    setDebate({ ...debate, subtopics: updated });
  };

  const addSubtopic = () => {
    if (!debate || debate.subtopics.length >= 5) return;
    setDebate({ ...debate, subtopics: [...debate.subtopics, ""] });
  };

  const removeSubtopic = (index: number) => {
    if (!debate || debate.subtopics.length <= 1) return;
    setDebate({ ...debate, subtopics: debate.subtopics.filter((_, i) => i !== index) });
  };

  const handleCreateDebate = async () => {
    if (!debate || !user) return;
    setSaving(true);

    try {
      // 1. Create the debate
      const { data: dbDebate, error: debateError } = await supabase
        .from("debates")
        .insert({
          topic: debate.topic,
          created_by: user.id,
          is_public: isPublic,
          turns_per_subtopic: debate.turnsPerSubtopic,
          time_per_turn: debate.timePerTurn,
          facilitator_type: "ai",
          status: "draft",
        })
        .select()
        .single();

      if (debateError) throw debateError;

      // 2. Create subtopics
      const subtopicInserts = debate.subtopics.map((title, i) => ({
        debate_id: dbDebate.id,
        title,
        sort_order: i,
      }));
      const { error: subError } = await supabase.from("debate_subtopics").insert(subtopicInserts);
      if (subError) throw subError;

      // 3. Create sides
      const sideInserts = debate.sides.map((label, i) => ({
        debate_id: dbDebate.id,
        label,
        sort_order: i,
      }));
      const { error: sideError } = await supabase.from("debate_sides").insert(sideInserts);
      if (sideError) throw sideError;

      // 4. Add creator as participant
      const { data: sides } = await supabase
        .from("debate_sides")
        .select("id")
        .eq("debate_id", dbDebate.id)
        .order("sort_order")
        .limit(1);

      await supabase.from("debate_participants").insert({
        debate_id: dbDebate.id,
        user_id: user.id,
        side_id: sides?.[0]?.id ?? null,
      });

      toast.success("Debate created!");
      navigate(`/debate/${dbDebate.id}`);
    } catch (err: any) {
      console.error("Create debate error:", err);
      toast.error(err.message || "Failed to create debate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">Start a Debate</h2>
                <p className="text-muted-foreground">Type your topic and AI will structure the conversation.</p>
              </div>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What do you want to debate?"
                  className="w-full bg-card border border-border rounded-xl p-6 text-lg font-display text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none transition-colors min-h-[140px]"
                  autoFocus
                />
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="absolute bottom-4 right-4 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate Debate
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <DynamoLoader duration={8000} />
            </motion.div>
          )}

          {step === 3 && debate && (
            <motion.div key="step3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}>
              <h2 className="text-2xl font-display font-bold mb-6">Review Your Debate</h2>

              <div className="space-y-6">
                {/* Topic */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-2 block">Main Topic</label>
                  <input
                    value={debate.topic}
                    onChange={(e) => setDebate({ ...debate, topic: e.target.value })}
                    className="w-full bg-transparent text-lg font-display font-semibold text-foreground focus:outline-none"
                  />
                </div>

                {/* Subtopics */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Subtopics</label>
                    <button onClick={addSubtopic} className="text-primary hover:opacity-80 transition-opacity">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {debate.subtopics.map((st, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-5">{i + 1}.</span>
                        <input
                          value={st}
                          onChange={(e) => updateSubtopic(i, e.target.value)}
                          className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                        {debate.subtopics.length > 1 && (
                          <button onClick={() => removeSubtopic(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sides */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">Participant Sides</label>
                  <div className="flex gap-2">
                    {debate.sides.map((side, i) => (
                      <input
                        key={i}
                        value={side}
                        onChange={(e) => {
                          const updated = [...debate.sides];
                          updated[i] = e.target.value;
                          setDebate({ ...debate, sides: updated });
                        }}
                        className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm text-center font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    ))}
                  </div>
                </div>

                {/* Turns & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-card border border-border rounded-xl p-5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">Turns per Subtopic</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setDebate({ ...debate, turnsPerSubtopic: Math.max(1, debate.turnsPerSubtopic - 1) })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="text-2xl font-display font-bold text-primary">{debate.turnsPerSubtopic}</span>
                      <button
                        onClick={() => setDebate({ ...debate, turnsPerSubtopic: Math.min(10, debate.turnsPerSubtopic + 1) })}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="bg-card border border-border rounded-xl p-5">
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">Time per Turn</label>
                    <select
                      value={debate.timePerTurn}
                      onChange={(e) => setDebate({ ...debate, timePerTurn: e.target.value })}
                      className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                {/* Visibility */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">Visibility</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${!isPublic ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground border border-transparent"}`}
                    >
                      <Lock className="w-4 h-4" /> Private
                    </button>
                    <button
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors ${isPublic ? "bg-primary/10 text-primary border border-primary/30" : "bg-secondary/50 text-muted-foreground border border-transparent"}`}
                    >
                      <Globe className="w-4 h-4" /> Public
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setStep(1); setDebate(null); }}
                    className="flex-1 border border-border rounded-lg py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={handleCreateDebate}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? "Creating…" : "Create Debate"}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </AppLayout>
  );
};

export default CreateDebatePage;
