import { useEffect, useRef } from "react";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import type { RemotePeer } from "@/hooks/useLiveSessionRTC";
import type { LiveParticipant } from "@/hooks/useLiveSessionPresence";

const isEmoji = (s: string | null | undefined) =>
  !!s && s.length <= 4 && !/^https?:\/\//.test(s);

interface VideoTileProps {
  stream: MediaStream | null;
  name: string;
  avatar?: string | null;
  isLocal?: boolean;
  cameraOn?: boolean;
  micOn?: boolean;
  showLabel?: boolean;
  size?: "thumb" | "normal" | "large";
}

const VideoTile = ({
  stream,
  name,
  avatar,
  isLocal,
  cameraOn = true,
  micOn = true,
  showLabel = true,
  size = "normal",
}: VideoTileProps) => {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  const hasVideo = stream && stream.getVideoTracks().length > 0 && cameraOn;
  const initials = (name || "?")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarSize =
    size === "large" ? "w-20 h-20" : size === "thumb" ? "w-9 h-9" : "w-14 h-14";

  return (
    <div className="relative aspect-video bg-secondary border border-border rounded-xl overflow-hidden">
      {hasVideo ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <div className={`${avatarSize} rounded-full bg-muted flex items-center justify-center overflow-hidden border border-foreground/10`}>
            {avatar && !isEmoji(avatar) ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : avatar && isEmoji(avatar) ? (
              <span className={size === "large" ? "text-4xl" : size === "thumb" ? "text-lg" : "text-2xl"}>{avatar}</span>
            ) : (
              <span className={`font-display font-bold text-muted-foreground ${size === "thumb" ? "text-xs" : "text-lg"}`}>
                {initials}
              </span>
            )}
          </div>
        </div>
      )}
      {showLabel && (
        <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-background/85 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-border max-w-[calc(100%-12px)]">
          {!micOn && <MicOff className="w-3 h-3 text-destructive shrink-0" />}
          {!cameraOn && <VideoOff className="w-3 h-3 text-muted-foreground shrink-0" />}
          <span className="text-[10px] font-semibold truncate">
            {name}
            {isLocal && " (you)"}
          </span>
        </div>
      )}
    </div>
  );
};

export interface VideoGridParticipant {
  deviceId: string;
  name: string;
  avatar?: string | null;
  stream?: MediaStream | null;
  cameraOn?: boolean;
  micOn?: boolean;
  isLocal?: boolean;
}

interface VideoGridProps {
  localStream: MediaStream | null;
  localName: string;
  localAvatar?: string | null;
  cameraOn: boolean;
  micOn: boolean;
  remotePeers: RemotePeer[];
  participants?: LiveParticipant[];
  deviceId?: string;
  onToggleCamera: () => void;
  onToggleMic: () => void;
  tileStyle?: "grid" | "speaker-focus" | "compact";
  showLabels?: boolean;
}

const VideoGrid = ({
  localStream,
  localName,
  localAvatar,
  cameraOn,
  micOn,
  remotePeers,
  participants = [],
  deviceId,
  onToggleCamera,
  onToggleMic,
  tileStyle = "grid",
  showLabels = true,
}: VideoGridProps) => {
  const peerById = new Map(remotePeers.map((p) => [p.deviceId, p]));

  const remoteTiles: VideoGridParticipant[] = participants
    .filter((p) => !deviceId || p.device_id !== deviceId)
    .map((p) => {
      const peer = peerById.get(p.device_id);
      return {
        deviceId: p.device_id,
        name: p.display_name || `Speaker ${p.speaker_slot}`,
        avatar: p.avatar_url,
        stream: peer?.stream ?? null,
        cameraOn: !!peer?.stream && peer.stream.getVideoTracks().length > 0,
        micOn: true,
      };
    });

  remotePeers.forEach((p) => {
    if (!remoteTiles.find((t) => t.deviceId === p.deviceId)) {
      remoteTiles.push({
        deviceId: p.deviceId,
        name: p.displayName || "Participant",
        stream: p.stream,
        cameraOn: p.stream.getVideoTracks().length > 0,
        micOn: true,
      });
    }
  });

  // Speaker-focus: local user gets the big tile, others as thumbnails below.
  if (tileStyle === "speaker-focus") {
    return (
      <div className="space-y-2">
        <VideoTile
          stream={localStream}
          name={localName}
          avatar={localAvatar}
          isLocal
          cameraOn={cameraOn}
          micOn={micOn}
          showLabel={showLabels}
          size="large"
        />
        {remoteTiles.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {remoteTiles.map((t) => (
              <VideoTile
                key={t.deviceId}
                stream={t.stream ?? null}
                name={t.name}
                avatar={t.avatar}
                cameraOn={t.cameraOn !== false}
                micOn={t.micOn !== false}
                showLabel={showLabels}
                size="thumb"
              />
            ))}
          </div>
        )}
        <Controls
          micOn={micOn}
          cameraOn={cameraOn}
          onToggleMic={onToggleMic}
          onToggleCamera={onToggleCamera}
        />
      </div>
    );
  }

  const total = 1 + remoteTiles.length;
  const isCompact = tileStyle === "compact";
  const cols = isCompact
    ? total <= 2 ? "grid-cols-2" : total <= 4 ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-5"
    : total <= 1 ? "grid-cols-1" : total === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className="space-y-2">
      <div className={`grid ${cols} gap-2`}>
        <VideoTile
          stream={localStream}
          name={localName}
          avatar={localAvatar}
          isLocal
          cameraOn={cameraOn}
          micOn={micOn}
          showLabel={showLabels}
          size={isCompact ? "thumb" : "normal"}
        />
        {remoteTiles.map((t) => (
          <VideoTile
            key={t.deviceId}
            stream={t.stream ?? null}
            name={t.name}
            avatar={t.avatar}
            cameraOn={t.cameraOn !== false}
            micOn={t.micOn !== false}
            showLabel={showLabels}
            size={isCompact ? "thumb" : "normal"}
          />
        ))}
      </div>
      <Controls
        micOn={micOn}
        cameraOn={cameraOn}
        onToggleMic={onToggleMic}
        onToggleCamera={onToggleCamera}
      />
    </div>
  );
};

const Controls = ({
  micOn,
  cameraOn,
  onToggleMic,
  onToggleCamera,
}: {
  micOn: boolean;
  cameraOn: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
}) => (
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
);

export default VideoGrid;
