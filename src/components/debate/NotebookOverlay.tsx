import FloatingOverlay from "./FloatingOverlay";

interface NotebookOverlayProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onChange: (val: string) => void;
}

/**
 * Translucent draggable notebook that overlays the camera feed.
 * Matches the visual language of ArgumentMapOverlay.
 */
const NotebookOverlay = ({ open, onClose, value, onChange }: NotebookOverlayProps) => {
  return (
    <FloatingOverlay
      open={open}
      onClose={onClose}
      eyebrow="Personal"
      title="My notes"
      storageKey="notebook"
      initialPosition={{ x: 16, y: 16 }}
      widthClass="w-[min(360px,calc(100%-2rem))]"
    >
      <div className="p-3 h-full flex">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Your preparation notes appear here…"
          className="flex-1 min-h-[260px] w-full bg-background/40 border border-foreground/10 rounded-lg px-3 py-2 text-sm text-foreground font-body resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
        />
      </div>
    </FloatingOverlay>
  );
};

export default NotebookOverlay;
