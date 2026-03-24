import { motion } from "framer-motion";
import { Trophy, Clock, MessageSquare, ExternalLink, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DebateCompletionOverlayProps {
  topic: string;
  subtopicCount: number;
  argumentCount: number;
  editWindowEndsAt: string | null;
  debateId: string;
  onDismiss: () => void;
}

const DebateCompletionOverlay = ({
  topic,
  subtopicCount,
  argumentCount,
  editWindowEndsAt,
  debateId,
  onDismiss,
}: DebateCompletionOverlayProps) => {
  const navigate = useNavigate();

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
          <div className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-3 mb-6">
            <div className="flex items-center gap-2 justify-center text-sm text-primary font-body">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">{editHoursLeft}h</span>
              <span className="text-muted-foreground">to edit your arguments</span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={onDismiss}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity font-body"
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
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DebateCompletionOverlay;
