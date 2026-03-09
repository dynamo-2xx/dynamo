import { useRef, useState, useCallback, useEffect } from "react";
import { Video, VideoOff, Mic, MicOff, AlertCircle, Camera } from "lucide-react";

interface MediaPermissionsProps {
  role: "facilitator" | "speaker" | "spectator";
  isMicEnabled: boolean;
  userId: string;
}

const MediaPermissions = ({ role, isMicEnabled, userId }: MediaPermissionsProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [hasStream, setHasStream] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(true);

  // Must be called from a direct user gesture (click handler)
  const requestMedia = useCallback(async () => {
    if (role === "spectator") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      streamRef.current = stream;
      setHasStream(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // Start with mic muted until it's their turn
      stream.getAudioTracks().forEach((t) => { t.enabled = isMicEnabled; });
    } catch (err: any) {
      setError(
        err.name === "NotAllowedError"
          ? "Camera/mic access denied. Please allow in browser settings."
          : "Could not access camera or microphone."
      );
    }
  }, [role, isMicEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Control mic based on turn
  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.getAudioTracks().forEach((track) => {
      track.enabled = isMicEnabled;
    });
  }, [isMicEnabled]);

  // Toggle camera
  const toggleCamera = () => {
    if (!streamRef.current) return;
    const on = !cameraOn;
    streamRef.current.getVideoTracks().forEach((t) => { t.enabled = on; });
    setCameraOn(on);
  };

  if (role === "spectator") return null;

  if (error) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  // Show "Enable Camera & Mic" button if stream not yet acquired
  if (!hasStream) {
    return (
      <button
        onClick={requestMedia}
        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
      >
        <Camera className="w-3.5 h-3.5" />
        Enable Camera & Mic
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-muted border border-border">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!cameraOn ? "hidden" : ""}`}
        />
        {!cameraOn && (
          <div className="w-full h-full flex items-center justify-center">
            <VideoOff className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <button
          onClick={toggleCamera}
          className={`p-1.5 rounded transition-colors ${cameraOn ? "bg-secondary text-foreground" : "bg-destructive/20 text-destructive"}`}
          title={cameraOn ? "Turn off camera" : "Turn on camera"}
        >
          {cameraOn ? <Video className="w-3.5 h-3.5" /> : <VideoOff className="w-3.5 h-3.5" />}
        </button>
        <div
          className={`p-1.5 rounded ${isMicEnabled ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}
          title={isMicEnabled ? "Mic active (your turn)" : "Mic muted (not your turn)"}
        >
          {isMicEnabled ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
        </div>
      </div>
    </div>
  );
};

export default MediaPermissions;
