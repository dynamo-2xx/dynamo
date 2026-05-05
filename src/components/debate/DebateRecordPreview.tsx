import { motion } from "framer-motion";
import DebateRecordShell from "./DebateRecordShell";

interface DebateRecordPreviewProps {
  debateId: string;
  topic: string;
  description?: string | null;
  status: string;
  scheduledAt?: string | null;
  coverImageUrl?: string | null;
  publisherName?: string | null;
  participantCount?: number;
  fallbackSubtopics?: { id: string; title: string }[];
  fallbackSideLabels?: string[];
}

/**
 * Thin wrapper around the unified DebateRecordShell so that the scheduled/live
 * preview shares the exact same visual layout as the completed record.
 */
const DebateRecordPreview = (props: DebateRecordPreviewProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <DebateRecordShell
        debateId={props.debateId}
        topic={props.topic}
        description={props.description}
        status={props.status}
        scheduledAt={props.scheduledAt}
        coverImageUrl={props.coverImageUrl}
        publisherName={props.publisherName}
        participantCount={props.participantCount}
        fallbackSubtopics={props.fallbackSubtopics}
        fallbackSideLabels={props.fallbackSideLabels}
      />
    </motion.div>
  );
};

export default DebateRecordPreview;
