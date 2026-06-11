import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lightweight camera-only `getUserMedia` for the single-device live room.
 *
 * Multi-device sessions use `useLiveSessionRTC` (which owns both audio +
 * video for the peer mesh). Single-device sessions don't need RTC at all,
 * but the room still wants a live camera tile + camera toggle so it reads
 * like a real meeting. This hook gives us exactly that — no audio, no
 * signaling — and the consumer is responsible for stopping it when the
 * room ends.
 */
export function useLocalCameraPreview(active: boolean) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = s;
      setStream(s);
      setError(null);
    } catch (e: any) {
      console.error("[camera-preview] getUserMedia failed", e);
      setError(e?.message || "Could not access camera");
    }
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return;
    }
    if (cameraOn) {
      void start();
    } else {
      stop();
    }
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, cameraOn]);

  const toggleCamera = useCallback(() => setCameraOn((v) => !v), []);

  return { stream, cameraOn, toggleCamera, error };
}