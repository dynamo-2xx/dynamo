import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus, Minus, X, Sparkles } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import DynamoLoader from "@/components/DynamoLoader";

interface GeneratedDebate {
  topic: string;
  subtopics: string[];
  sides: string[];
  turnsPerSubtopic: number;
  timePerTurn: string;
}

const TIME_OPTIONS = ["30s", "1 min", "2 min", "3 min", "5 min"];

const CreateDebatePage = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [prompt, setPrompt] = useState("");
  const [debate, setDebate] = useState<GeneratedDebate | null>(null);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) return;
    setStep(2);
  }, [prompt]);

  const handleGenerationComplete = useCallback(() => {
    // Simulate AI generation
    setDebate({
      topic: prompt.charAt(0).toUpperCase() + prompt.slice(1) + (prompt.endsWith("?") ? "" : "?"),
      subtopics: [
        "Environmental and health impacts",
        "Economic implications for businesses",
        "Feasibility of alternatives",
      ],
      sides: ["For", "Against"],
      turnsPerSubtopic: 2,
      timePerTurn: "2 min",
    });
    setStep(3);
  }, [prompt]);

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
              <DynamoLoader onComplete={handleGenerationComplete} duration={2500} />
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

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => { setStep(1); setDebate(null); }}
                    className="flex-1 border border-border rounded-lg py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                  >
                    Start Over
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold text-sm hover:opacity-90 transition-opacity">
                    Continue Setup
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
