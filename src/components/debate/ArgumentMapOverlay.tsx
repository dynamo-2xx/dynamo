import LiveArgumentMap from "./LiveArgumentMap";
import FloatingOverlay from "./FloatingOverlay";

interface ArgumentNode {
  id: string;
  content: string;
  argumentType: string;
  sideLabel: string;
  sideOrder: number;
  participantId: string;
  parentArgumentId: string | null;
  createdAt: string;
  isEdited: boolean;
}

interface ArgumentMapOverlayProps {
  open: boolean;
  onClose: () => void;
  arguments: ArgumentNode[];
  subtopicTitle?: string;
}

/**
 * Translucent draggable panel that overlays the camera feed and renders
 * the existing LiveArgumentMap.
 */
const ArgumentMapOverlay = ({ open, onClose, arguments: args, subtopicTitle }: ArgumentMapOverlayProps) => {
  return (
    <FloatingOverlay
      open={open}
      onClose={onClose}
      eyebrow="Live insights"
      title={`Argument map${subtopicTitle ? ` · ${subtopicTitle}` : ""}`}
      storageKey="argument-map"
      initialPosition={{ x: 16, y: 16 }}
    >
      <div className="px-3 py-3">
        <LiveArgumentMap arguments={args} compact />
      </div>
    </FloatingOverlay>
  );
};

export default ArgumentMapOverlay;
