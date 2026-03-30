import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { ArrowRight, Plus, Minus, X, Sparkles, Globe, Lock, Users, Mail, GripVertical, Clock, Mic } from "lucide-react";
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
  prepTime: string;
}

const TAGLINES = [
  "People to the Power!",
  "Your voice. Your power.",
  "Debate with purpose.",
  "Shape the conversation.",
  "Ideas worth defending.",
  "Speak up. Stand out.",
];

const TIME_OPTIONS = ["30s", "1 min", "2 min", "3 min", "5 min"];
const PREP_TIME_OPTIONS = ["0s", "15s", "30s", "45s", "1 min", "1.5 min", "2 min", "2.5 min", "3 min", "3.5 min", "4 min", "4.5 min", "5 min"];

const CreateDebatePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [prompt, setPrompt] = useState("");
  const [debate, setDebate] = useState<GeneratedDebate | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [invitedUsernames, setInvitedUsernames] = useState<string[]>([]);
  const [taglineIndex, setTaglineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
        prepTime: "1 min",
      });
      setStep(3);
    } catch (err) {
      console.error("Generation failed:", err);
      setDebate({
        topic: prompt.charAt(0).toUpperCase() + prompt.slice(1) + (prompt.endsWith("?") ? "" : "?"),
        subtopics: ["Key considerations", "Potential impacts", "Alternative approaches"],
        sides: ["For", "Against"],
        turnsPerSubtopic: 2,
        timePerTurn: "2 min",
        prepTime: "1 min",
      });
      setStep(3);
      toast.error("AI generation had an issue — using a default structure. You can edit everything.");
    }
  }, [prompt]);

  const handleGenerationComplete = useCallback(() => {}, []);

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

  const addInvite = () => {
    const value = inviteInput.trim();
    if (!value) return;
    if (invitedUsernames.includes(value)) {
      toast.error("Already added");
      return;
    }
    setInvitedUsernames((prev) => [...prev, value]);
    setInviteInput("");
  };

  const removeInvite = (value: string) => {
    setInvitedUsernames((prev) => prev.filter((u) => u !== value));
  };

  const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

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
          prep_time_min: debate.prepTime,
          prep_time_max: debate.prepTime,
          facilitator_type: "ai",
          status: "draft",
        } as any)
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

      // 5. Send invitations (usernames and emails)
      if (invitedUsernames.length > 0) {
        const usernameInvites = invitedUsernames.filter((u) => !isEmail(u));
        const emailInvites = invitedUsernames.filter((u) => isEmail(u));

        if (usernameInvites.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("display_name", usernameInvites);

          if (profiles && profiles.length > 0) {
            const invitations = profiles.map((p) => ({
              debate_id: dbDebate.id,
              invited_user_id: p.user_id,
              invited_username: p.display_name || "",
            }));
            await supabase.from("debate_invitations").insert(invitations);
            toast.success(`${profiles.length} invitation${profiles.length !== 1 ? "s" : ""} sent`);
          }

          const foundNames = (profiles || []).map((p) => p.display_name);
          const notFound = usernameInvites.filter((u) => !foundNames.includes(u));
          if (notFound.length > 0) {
            toast.warning(`Users not found: ${notFound.join(", ")}`);
          }
        }

        if (emailInvites.length > 0) {
          for (const invEmail of emailInvites) {
            const { data: inv } = await supabase.from("debate_invitations").insert({
              debate_id: dbDebate.id,
              invited_user_id: user.id,
              invited_username: invEmail,
              invited_email: invEmail,
            }).select("id").single();

            if (inv) {
              supabase.functions.invoke("send-invite-email", {
                body: { invitation_id: inv.id },
              }).catch((err) => console.error("Email send error:", err));
            }
          }
          toast.success(`${emailInvites.length} email invitation${emailInvites.length !== 1 ? "s" : ""} queued`);
        }
      }

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
                <h2 className="text-3xl font-display font-bold mb-3 md:text-3xl">What's on your mind?</h2>
                <div className="h-6 relative overflow-hidden">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={taglineIndex}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4 }}
                      className="text-muted-foreground absolute inset-0 text-center"
                    >
                      {TAGLINES[taglineIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type a topic and let dynamo structure the conversation."
                  className="w-full bg-card border border-border rounded-xl p-6 font-display text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none transition-colors min-h-[140px] text-base"
                  autoFocus
                />
                <button
                  onClick={handleGenerate}
                  disabled={!prompt.trim()}
                  className="absolute bottom-4 right-4 flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-opacity"
                >
                  <Sparkles className="w-4 h-4" />
                  Create
                </button>
              </div>
              <button
                onClick={() => navigate("/live/new")}
                className="mt-3 w-full flex items-center justify-center gap-2 bg-card border border-border text-foreground px-5 py-3 rounded-xl font-semibold text-sm hover:border-primary/40 transition-colors"
              >
                <Mic className="w-4 h-4 text-primary" />
                Live
              </button>
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
                  <Reorder.Group
                    axis="y"
                    values={debate.subtopics}
                    onReorder={(newOrder) => setDebate({ ...debate, subtopics: newOrder })}
                    className="space-y-2"
                  >
                    {debate.subtopics.map((st, i) => (
                      <Reorder.Item key={st || `subtopic-${i}`} value={st} className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
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
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
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

                {/* Preparation Time Range */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">
                    <Clock className="w-3.5 h-3.5 inline mr-1" />
                    Preparation Time Between Turns
                  </label>
                   <select
                     value={debate.prepTime}
                     onChange={(e) => setDebate({ ...debate, prepTime: e.target.value })}
                     className="w-full bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                   >
                     {PREP_TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                   </select>
                  <p className="text-[10px] text-muted-foreground mt-2 font-body">
                     Time given to both sides between turns to review and prepare.
                  </p>
                 </div>
                {/* Invite Users (optional) */}
                <div className="bg-card border border-border rounded-xl p-5">
                  <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider mb-3 block">
                    <Mail className="w-3.5 h-3.5 inline mr-1" />
                    Invite Speakers <span className="normal-case font-normal">(optional)</span>
                  </label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      value={inviteInput}
                      onChange={(e) => setInviteInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addInvite(); }
                      }}
                      placeholder="Username or email address"
                      className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                    <button
                      onClick={addInvite}
                      disabled={!inviteInput.trim()}
                      className="text-primary hover:opacity-80 transition-opacity disabled:opacity-40"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {invitedUsernames.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {invitedUsernames.map((username) => (
                        <span
                          key={username}
                          className="inline-flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium"
                        >
                          {username}
                          <button
                            onClick={() => removeInvite(username)}
                            className="hover:text-destructive transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
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
                    onClick={() => { setStep(1); setDebate(null); setInvitedUsernames([]); setInviteInput(""); }}
                    className="flex-1 border border-border rounded-lg py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={handleCreateDebate}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-3 font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? "Creating…" : invitedUsernames.length > 0 ? "Create & Invite" : "Create Debate"}
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
