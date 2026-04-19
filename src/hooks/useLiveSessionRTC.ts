import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * WebRTC mesh for Live Sessions, signaled via Supabase Realtime broadcast.
 *
 * Each device joins a channel keyed by sessionId, announces itself via presence,
 * and runs the standard "polite peer" handshake against every other peer.
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

  // ── Acquire local media ──
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

    const createPeer = (otherId: string, polite: boolean): RTCPeerConnection => {
      const existing = pcsRef.current.get(otherId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcsRef.current.set(otherId, pc);

      // Add local tracks
      localStream.getTracks().forEach((t) => pc.addTrack(t, localStream));

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
        // We are the polite peer if our id sorts higher
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
            } catch (e) {
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

        // Update names
        setRemotePeers((prev) => {
          const next = new Map(prev);
          for (const id of presentIds) {
            const meta = state[id]?.[0];
            const existing = next.get(id);
            if (existing && meta?.displayName) {
              next.set(id, { ...existing, displayName: meta.displayName });
            }
          }
          // Remove peers no longer present
          for (const id of Array.from(next.keys())) {
            if (!presentIds.includes(id)) {
              closePeer(id);
            }
          }
          return next;
        });

        // Initiate connection to anyone we don't have yet — only the lower id calls
        for (const otherId of presentIds) {
          if (pcsRef.current.has(otherId)) continue;
          if (deviceId < otherId) {
            // We are the "impolite" caller; create offer
            const pc = createPeer(otherId, false);
            // negotiationneeded will fire from addTrack already done inside createPeer
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
            // Pre-create peer so incoming offer finds it
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

  // ── Toggles ──
  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOn;
    stream.getVideoTracks().forEach((t) => (t.enabled = next));
    setCameraOn(next);
  }, [cameraOn]);

  const toggleMic = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !micOn;
    // Only mute the WebRTC outgoing track — Deepgram has its own getUserMedia
    stream.getAudioTracks().forEach((t) => (t.enabled = next));
    setMicOn(next);
  }, [micOn]);

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
