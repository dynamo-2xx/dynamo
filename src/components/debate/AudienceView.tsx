import { motion, AnimatePresence } from "framer-motion";
import { Eye, ChevronRight, Zap } from "lucide-react";
import DebateTimer from "./DebateTimer";
import LiveArgumentMap from "./LiveArgumentMap";

interface Side { id: string; label: string; sort_order: number; }
interface Subtopic { id: string; title: string; sort_order: number; }
interface Argument {
  id: string; content: string; argument_type: string;
  participant_id: string; subtopic_id: string; created_at: string;
  is_edited: boolean; original_content: string | null;
  parent_argument_id: string | null;
}
interface Participant {
  id: string; user_id: string; side_id: string | null; participant_role: string;
}

interface AudienceViewProps {
  debate: {
    current_subtopic_index: number;
    current_turn: number;
    current_speaker_side_id: string | null;
    turns_per_subtopic: number;
  };
  sides: Side[];
  subtopics: Subtopic[];
  arguments: Argument[];
  participants: Participant[];
  timeLeft: number;
  aiMessage: string;
}

const AudienceView = ({
  debate, sides, subtopics, arguments: args, participants,
  timeLeft, aiMessage,
}: AudienceViewProps) => {
  const currentSubtopic = subtopics[debate.current_subtopic_index ?? 0];
  const activeSide = sides.find((s) => s.id === debate.current_speaker_side_id) || sides[0];

  const mapArgsBySubtopic = (subtopicId: string) =>
    args
      .filter((a) => a.subtopic_id === subtopicId)
      .map((a) => {
        const p = participants.find((p) => p.id === a.participant_id);
        const side = sides.find((s) => s.id === p?.side_id);
        return {
          id: a.id, content: a.content, argumentType: a.argument_type,
          sideLabel: side?.label || "Unknown", sideOrder: side?.sort_order ?? 0,
          participantId: a.participant_id, parentArgumentId: a.parent_argument_id,
          createdAt: a.created_at, isEdited: a.is_edited,
        };
      });

  return (
    <div className="flex-1 flex flex-col">
      {/* Top bar: Speaker + Timer */}
      <div className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-body">
              Speaking
            </p>
            <h2 className="text-xl font-display font-bold text-foreground">
              {activeSide?.label}
            </h2>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-3 py-1">
            <ChevronRight className="w-3 h-3 text-primary" />
            <span className="text-xs font-display font-semibold text-primary">
              {currentSubtopic?.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DebateTimer timeLeft={timeLeft} size="md" />
          <span className="text-xs text-muted-foreground">
            Turn {(debate.current_turn ?? 0) + 1}/{debate.turns_per_subtopic}
          </span>
        </div>
      </div>

      {/* AI message */}
      <AnimatePresence>
        {aiMessage && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-b border-primary/20 bg-primary/5 px-6 py-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-3 h-3 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-primary mb-0.5 font-display">d.</p>
                <p className="text-xs text-foreground leading-relaxed font-body">{aiMessage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live argument map — full scrollable area */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {subtopics.map((st, i) => {
          const stArgs = mapArgsBySubtopic(st.id);
          if (stArgs.length === 0 && st.id !== currentSubtopic?.id) return null;

          const isCurrent = i === (debate.current_subtopic_index ?? 0);

          return (
            <div key={st.id} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <ChevronRight className={`w-3.5 h-3.5 ${isCurrent ? "text-primary" : "text-muted-foreground"}`} />
                <h3 className={`text-xs font-display font-semibold ${isCurrent ? "text-primary" : "text-muted-foreground"}`}>
                  {st.title}
                </h3>
              </div>
              <LiveArgumentMap arguments={stArgs} />
            </div>
          );
        })}
      </div>

      {/* Spectator footer */}
      <div className="border-t border-border bg-card/50 px-4 py-3 text-center text-sm text-muted-foreground flex items-center justify-center gap-2 font-body">
        <Eye className="w-4 h-4" />
        You are watching as a spectator
      </div>
    </div>
  );
};

export default AudienceView;
