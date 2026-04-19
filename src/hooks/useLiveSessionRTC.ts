import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * WebRTC mesh for Live Sessions, signaled via Supabase Realtime broadcast.
 *
 * Toggling mic/camera fully stops the underlying capture track (not just
 * `enabled = false`), so the OS-level mic/camera indicators turn off and
 * any consumer of the same stream (e.g. transcription) sees the change.
 */

export interface RemotePeer {
  deviceId: string;
  displayName: string;
  stream: MediaStream;
}

interface Options {
  sessionId: string | null;
  deviceId: string;
  displayName: string;
  isActive: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export function useLiveSessionRTC({ sessionId, deviceId, displayName, isActive }: Options) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remotePeers, setRemotePeers] = useState<Map<string, RemotePeer>>(new Map());
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const makingOfferRef = useRef<Map<string, boolean>>(new Map());

  // ── Acquire initial local media (camera + mic both on) ──
  useEffect(() => {
    if (!isActive || !sessionId) return;
    let cancelled = false;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setCameraOn(true);
        setMicOn(true);
      } catch (e: any) {
        console.error("[rtc] getUserMedia failed", e);
        setError(e?.message || "Could not access camera/microphone");
      }
    })();

    return () => {
      cancelled = true;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
      setLocalStream(null);
    };
  }, [isActive, sessionId]);

  // ── Signaling channel + peer connections ──
  useEffect(() => {
    if (!isActive || !sessionId || !localStream) return;

    const channelName = `live-rtc-${sessionId}`;
    const channel = supabase.channel(channelName, {
      config: { presence: { key: deviceId } },
    });
    channelRef.current = channel;

    const createPeer = (otherId: string, _polite: boolean): RTCPeerConnection => {
      const existing = pcsRef.current.get(otherId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcsRef.current.set(otherId, pc);

      // Add current local tracks (may be just video or just audio if one was stopped)
      const stream = localStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      }

      pc.onicecandidate = (ev) => {
        if (ev.candidate) {
          channel.send({
            type: "broadcast",
            event: "signal",
            payload: { to: otherId, from: deviceId, candidate: ev.candidate.toJSON() },
          });
        }
      };

      pc.ontrack = (ev) => {
        const [stream] = ev.streams;
        if (!stream) return;
        setRemotePeers((prev) => {
          const next = new Map(prev);
          const existing = next.get(otherId);
          next.set(otherId, {
            deviceId: otherId,
            displayName: existing?.displayName || "Participant",
            stream,
          });
          return next;
        });
      };

      pc.onnegotiationneeded = async () => {
        try {
          makingOfferRef.current.set(otherId, true);
          await pc.setLocalDescription();
          channel.send({
            type: "broadcast",
            event: "signal",
            payload: { to: otherId, from: deviceId, sdp: pc.localDescription },
          });
        } catch (e) {
          console.error("[rtc] negotiation error", e);
        } finally {
          makingOfferRef.current.set(otherId, false);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed" || pc.connectionState === "closed") {
          pcsRef.current.delete(otherId);
          setRemotePeers((prev) => {
            const next = new Map(prev);
            next.delete(otherId);
            return next;
          });
        }
      };

      return pc;
    };

    const closePeer = (otherId: string) => {
      const pc = pcsRef.current.get(otherId);
      if (pc) {
        pc.close();
        pcsRef.current.delete(otherId);
      }
      setRemotePeers((prev) => {
        const next = new Map(prev);
        next.delete(otherId);
        return next;
      });
    };

    channel
      .on("broadcast", { event: "signal" }, async ({ payload }) => {
        const { to, from, sdp, candidate } = payload || {};
        if (to !== deviceId || !from) return;
        const polite = deviceId > from;
        const pc = createPeer(from, polite);

        try {
          if (sdp) {
            const desc = sdp as RTCSessionDescriptionInit;
            const offerCollision =
              desc.type === "offer" &&
              (makingOfferRef.current.get(from) || pc.signalingState !== "stable");
            if (offerCollision && !polite) return;
            await pc.setRemoteDescription(desc);
            if (desc.type === "offer") {
              await pc.setLocalDescription();
              channel.send({
                type: "broadcast",
                event: "signal",
                payload: { to: from, from: deviceId, sdp: pc.localDescription },
              });
            }
          } else if (candidate) {
            try {
              await pc.addIceCandidate(candidate);
            } catch {
              // ignore stray candidates
            }
          }
        } catch (e) {
          console.error("[rtc] signal handling failed", e);
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState() as Record<string, Array<{ displayName: string }>>;
        const presentIds = Object.keys(state).filter((id) => id !== deviceId);

        setRemotePeers((prev) => {
          const next = new Map(prev);
          for (const id of presentIds) {
            const meta = state[id]?.[0];
            const existing = next.get(id);
            if (existing && meta?.displayName) {
              next.set(id, { ...existing, displayName: meta.displayName });
            }
          }
          for (const id of Array.from(next.keys())) {
            if (!presentIds.includes(id)) {
              closePeer(id);
            }
          }
          return next;
        });

        for (const otherId of presentIds) {
          if (pcsRef.current.has(otherId)) continue;
          if (deviceId < otherId) {
            const pc = createPeer(otherId, false);
            (async () => {
              try {
                makingOfferRef.current.set(otherId, true);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                channel.send({
                  type: "broadcast",
                  event: "signal",
                  payload: { to: otherId, from: deviceId, sdp: pc.localDescription },
                });
              } catch (e) {
                console.error("[rtc] initial offer failed", e);
              } finally {
                makingOfferRef.current.set(otherId, false);
              }
            })();
          } else {
            createPeer(otherId, true);
          }
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ displayName, deviceId });
        }
      });

    return () => {
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      setRemotePeers(new Map());
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [isActive, sessionId, localStream, deviceId, displayName]);

  // ── Helpers: stop/replace a track on every peer connection ──
  const replaceSenderTrack = useCallback(
    (kind: "audio" | "video", newTrack: MediaStreamTrack | null) => {
      pcsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === kind);
        if (sender) {
          sender.replaceTrack(newTrack).catch((e) =>
            console.warn("[rtc] replaceTrack failed", e),
          );
        } else if (newTrack) {
          // No existing sender (track was removed earlier) — add it back.
          if (localStreamRef.current) {
            pc.addTrack(newTrack, localStreamRef.current);
          }
        }
      });
    },
    [],
  );

  // ── Toggles ── (fully stop the capture, not just `enabled = false`)
  const toggleCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (cameraOn) {
      // Turn OFF: stop video track entirely
      stream.getVideoTracks().forEach((t) => {
        t.stop();
        stream.removeTrack(t);
      });
      replaceSenderTrack("video", null);
      setLocalStream(new MediaStream(stream.getTracks()));
      setCameraOn(false);
    } else {
      // Turn ON: re-acquire video
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" },
        });
        const newTrack = fresh.getVideoTracks()[0];
        if (!newTrack) return;
        stream.addTrack(newTrack);
        replaceSenderTrack("video", newTrack);
        setLocalStream(new MediaStream(stream.getTracks()));
        setCameraOn(true);
      } catch (e: any) {
        console.error("[rtc] camera restart failed", e);
        setError(e?.message || "Could not access camera");
      }
    }
  }, [cameraOn, replaceSenderTrack]);

  const toggleMic = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    if (micOn) {
      // Turn OFF: stop audio track entirely so the OS mic indicator goes off
      // and any other consumer (transcription) sees the track end.
      stream.getAudioTracks().forEach((t) => {
        t.stop();
        stream.removeTrack(t);
      });
      replaceSenderTrack("audio", null);
      setLocalStream(new MediaStream(stream.getTracks()));
      setMicOn(false);
    } else {
      // Turn ON: re-acquire mic
      try {
        const fresh = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        const newTrack = fresh.getAudioTracks()[0];
        if (!newTrack) return;
        stream.addTrack(newTrack);
        replaceSenderTrack("audio", newTrack);
        setLocalStream(new MediaStream(stream.getTracks()));
        setMicOn(true);
      } catch (e: any) {
        console.error("[rtc] mic restart failed", e);
        setError(e?.message || "Could not access microphone");
      }
    }
  }, [micOn, replaceSenderTrack]);

  return {
    localStream,
    remotePeers: Array.from(remotePeers.values()),
    cameraOn,
    micOn,
    toggleCamera,
    toggleMic,
    error,
  };
}
