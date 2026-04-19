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
}

const VideoTile = ({
  stream,
  name,
  avatar,
  isLocal,
  cameraOn = true,
  micOn = true,
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
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border border-foreground/10">
            {avatar && !isEmoji(avatar) ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img src={avatar} alt={name} className="w-full h-full object-cover" />
            ) : avatar && isEmoji(avatar) ? (
              <span className="text-2xl">{avatar}</span>
            ) : (
              <span className="text-lg font-display font-bold text-muted-foreground">
                {initials}
              </span>
            )}
          </div>
        </div>
      )}
      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-background/85 backdrop-blur-sm rounded-md px-1.5 py-0.5 border border-border max-w-[calc(100%-12px)]">
        {!micOn && <MicOff className="w-3 h-3 text-destructive shrink-0" />}
        {!cameraOn && <VideoOff className="w-3 h-3 text-muted-foreground shrink-0" />}
        <span className="text-[10px] font-semibold truncate">
          {name}
          {isLocal && " (you)"}
        </span>
      </div>
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
  /** Local user's stream + meta */
  localStream: MediaStream | null;
  localName: string;
  localAvatar?: string | null;
  cameraOn: boolean;
  micOn: boolean;
  /** Remote WebRTC peers (have streams) */
  remotePeers: RemotePeer[];
  /** All known participants from presence (so tiles persist regardless of stream) */
  participants?: LiveParticipant[];
  /** This device's id, used to skip self in the participants list */
  deviceId?: string;
  onToggleCamera: () => void;
  onToggleMic: () => void;
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
}: VideoGridProps) => {
  // Build the merged tile list:
  // - Always include self.
  // - Include every participant present (excluding self), enriching with stream if we have one.
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

  // Add any remotePeers we have a stream for that aren't yet in the participants list
  // (race between RTC connect and presence row insert).
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

  const total = 1 + remoteTiles.length;
  const cols =
    total <= 1 ? "grid-cols-1" : total === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3";

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
        />
        {remoteTiles.map((t) => (
          <VideoTile
            key={t.deviceId}
            stream={t.stream ?? null}
            name={t.name}
            avatar={t.avatar}
            cameraOn={t.cameraOn !== false}
            micOn={t.micOn !== false}
          />
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
