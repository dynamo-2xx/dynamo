import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { RemotePeer } from "@/hooks/useLiveSessionRTC";

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  isLocal?: boolean;
  cameraOn?: boolean;
  micOn?: boolean;
}

const VideoTile = ({ stream, name, isLocal, cameraOn = true, micOn = true }: VideoTileProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-secondary border border-border rounded-xl overflow-hidden">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full object-cover ${cameraOn ? "" : "hidden"}`}
      />
      {!cameraOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <span className="text-lg font-display font-bold text-muted-foreground">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-background/85 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-border max-w-[calc(100%-12px)]">
        {!micOn && <MicOff className="w-3 h-3 text-destructive shrink-0" />}
        <span className="text-[10px] font-semibold truncate">
          {name}
          {isLocal && " (you)"}
        </span>
      </div>
    </div>
  );
};

interface VideoGridProps {
  localStream: MediaStream | null;
  localName: string;
  cameraOn: boolean;
  micOn: boolean;
  remotePeers: RemotePeer[];
  onToggleCamera: () => void;
  onToggleMic: () => void;
}

const VideoGrid = ({
  localStream,
  localName,
  cameraOn,
  micOn,
  remotePeers,
  onToggleCamera,
  onToggleMic,
}: VideoGridProps) => {
  const total = 1 + remotePeers.length;
  const cols =
    total <= 1 ? "grid-cols-1" : total === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className="space-y-2">
      <div className={`grid ${cols} gap-2`}>
        <VideoTile
          stream={localStream}
          name={localName}
          isLocal
          cameraOn={cameraOn}
          micOn={micOn}
        />
        {remotePeers.map((p) => (
          <VideoTile key={p.deviceId} stream={p.stream} name={p.displayName} />
        ))}
      </div>
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={onToggleMic}
          aria-label={micOn ? "Mute call audio" : "Unmute call audio"}
          className={`min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-full border transition-colors ${
            micOn
              ? "bg-secondary border-border text-foreground hover:bg-accent"
              : "bg-destructive border-destructive text-destructive-foreground"
          }`}
        >
          {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onToggleCamera}
          aria-label={cameraOn ? "Turn camera off" : "Turn camera on"}
          className={`min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-full border transition-colors ${
            cameraOn
              ? "bg-secondary border-border text-foreground hover:bg-accent"
              : "bg-destructive border-destructive text-destructive-foreground"
          }`}
        >
          {cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export default VideoGrid;
