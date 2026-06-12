import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import DebateTimer from "./DebateTimer";
import MessengerChat from "./MessengerChat";

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

interface ProjectorViewProps {
  debate: {
    topic: string;
    current_subtopic_index: number;
    current_turn: number;
    current_speaker_side_id: string | null;
    turns_per_subtopic: number;
    status: string;
  };
  sides: Side[];
  subtopics: Subtopic[];
  arguments: Argument[];
  participants: Participant[];
  timeLeft: number;
}

const ProjectorView = ({
  debate, sides, subtopics, arguments: args, participants, timeLeft,
}: ProjectorViewProps) => {
  const currentSubtopic = subtopics[debate.current_subtopic_index ?? 0];
  const activeSide = sides.find((s) => s.id === debate.current_speaker_side_id) || sides[0];

  const currentSubtopicArgs = args
    .filter((a) => a.subtopic_id === currentSubtopic?.id)
    .map((a) => {
      const p = participants.find((p) => p.id === a.participant_id);
      const side = sides.find((s) => s.id === p?.side_id);
      return {
        id: a.id,
        content: a.content,
        sideLabel: side?.label || "Unknown",
        sideOrder: side?.sort_order ?? 0,
        createdAt: a.created_at,
        isEdited: a.is_edited,
      };
    });

  return (
    <div className="min-h-screen bg-primary text-primary-foreground flex flex-col">
      {/* Header — large room-readable type */}
      <div className="px-12 pt-12 pb-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] font-body opacity-60 mb-2">
          Now Speaking
        </p>
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-tight">
          {activeSide?.label}
        </h1>
      </div>

      {/* Timer — very large */}
      <div className="text-center pb-6">
        <DebateTimer timeLeft={timeLeft} size="xl" />
        <p className="text-sm font-body opacity-60 mt-2">
          Turn {(debate.current_turn ?? 0) + 1}/{debate.turns_per_subtopic}
        </p>
      </div>

      {/* Current subtopic */}
      <div className="text-center pb-8">
        <div className="inline-flex items-center gap-3 bg-primary-foreground/10 rounded-2xl px-6 py-3">
          <ChevronRight className="w-5 h-5 opacity-60" />
          <span className="text-xl md:text-2xl font-display font-semibold">
            {currentSubtopic?.title}
          </span>
        </div>
        <p className="text-xs font-body opacity-40 mt-2">
          Subtopic {(debate.current_subtopic_index ?? 0) + 1}/{subtopics.length}
        </p>
      </div>

      {/* Live argument thread */}
      <div className="flex-1 overflow-y-auto px-8 md:px-16 pb-8">
        <div className="max-w-4xl mx-auto">
          {currentSubtopicArgs.length === 0 ? (
            <p className="text-center text-lg font-body opacity-40">
              Awaiting arguments…
            </p>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {currentSubtopicArgs.map((msg) => {
                  const isSide1 = msg.sideOrder === 0;
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className={`w-full rounded-xl px-6 py-4 text-lg font-body border-l-[6px] ${
                        isSide1
                          ? "border-l-[hsl(var(--side-1))] bg-[hsl(var(--side-1)/0.15)]"
                          : "border-l-[hsl(var(--side-2))] bg-[hsl(var(--side-2)/0.15)]"
                      }`}
                    >
                      <p className={`text-xs font-semibold mb-1 uppercase tracking-wider ${
                        isSide1 ? "text-[hsl(var(--side-1))]" : "text-[hsl(var(--side-2))]"
                      }`}>
                        {msg.sideLabel}
                      </p>
                      <p className="leading-relaxed text-primary-foreground break-words whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Footer branding */}
      <div className="px-8 py-4 text-center">
        <span className="text-sm font-display font-bold opacity-30">DYNAMO.</span>
      </div>
    </div>
  );
};

export default ProjectorView;
