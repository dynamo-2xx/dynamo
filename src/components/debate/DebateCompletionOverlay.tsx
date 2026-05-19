import { motion } from "framer-motion";
import { Trophy, Clock, MessageSquare, Home, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { playChime } from "@/lib/audioUnlock";
import ContinueButton from "@/components/record/ContinueButton";
import { supabase } from "@/integrations/supabase/client";

interface DebateCompletionOverlayProps {
  topic: string;
  subtopicCount: number;
  argumentCount: number;
  editWindowEndsAt: string | null;
  debateId: string;
  feedbackEnabled?: boolean;
  isOwner?: boolean;
  onDismiss: () => void;
}

const DebateCompletionOverlay = ({
  topic,
  subtopicCount,
  argumentCount,
  editWindowEndsAt,
  debateId,
  feedbackEnabled = false,
  isOwner = false,
  onDismiss,
}: DebateCompletionOverlayProps) => {
  const navigate = useNavigate();

  useEffect(() => {
    playChime("celebration");
    // §21 fire-and-forget: kick off deep performance analysis for the current
    // user. Idempotent server-side; safe to call multiple times.
    (supabase as any).functions
      .invoke("trigger-deep-perf", { body: { session_id: debateId, session_kind: "debate" } })
      .catch(() => {});
  }, [debateId]);

  const editHoursLeft = editWindowEndsAt
    ? Math.max(0, Math.round((new Date(editWindowEndsAt).getTime() - Date.now()) / (1000 * 60 * 60)))
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 bg-background/90 backdrop-blur-sm flex items-center justify-center"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
        className="max-w-md w-full mx-4 bg-card border border-border rounded-2xl p-8 text-center shadow-xl"
      >
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-5">
          <Trophy className="w-8 h-8 text-primary" />
        </div>

        <h2 className="text-2xl font-display font-bold text-foreground mb-2">
          Debate Complete
        </h2>
        <p className="text-sm text-muted-foreground font-body mb-6 italic">
          "{topic}"
        </p>

        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-primary">{subtopicCount}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">Subtopics</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-primary">{argumentCount}</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">Arguments</p>
          </div>
        </div>

        {editHoursLeft > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-4">
            <div className="flex items-center gap-2 justify-center text-sm text-primary font-body">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">{editHoursLeft}h</span>
              <span className="text-muted-foreground">to edit your arguments</span>
            </div>
          </div>
        )}

        {feedbackEnabled && (
          <div className="bg-accent border border-border rounded-lg px-4 py-3 mb-4 text-left">
            <div className="flex items-center gap-2 text-sm text-foreground font-body mb-1">
              <Award className="w-4 h-4" />
              <span className="font-semibold">Your private grade is ready</span>
            </div>
            <p className="text-[11px] text-muted-foreground font-body">
              Dynamo graded your performance across four dimensions. Only you can see it.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {feedbackEnabled && (
            <button
              onClick={() => navigate(`/debate/${debateId}/grade`)}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity font-body"
            >
              <Award className="w-4 h-4" />
              View Your Performance
            </button>
          )}
          <button
            onClick={onDismiss}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity font-body ${
              feedbackEnabled
                ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                : "bg-primary text-primary-foreground"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Review & Edit
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-lg font-medium hover:bg-secondary/80 transition-colors font-body"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </button>
          {isOwner && (
            <div className="pt-1">
              <ContinueButton
                kind="debate"
                sourceId={debateId}
                isOwner
                isCompleted
                variant="outline"
              />
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DebateCompletionOverlay;
