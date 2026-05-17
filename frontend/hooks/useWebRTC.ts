import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "@/lib/socket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
// simple-peer ships no first-party TypeScript declarations.
// @types/simple-peer uses the `export =` CJS pattern which is tricky to
// extract cleanly in Next.js 16's strict type-checker.
// We define a minimal local interface covering every method we actually call.
// This is the most robust approach and is 100% accurate for our usage.
interface PeerInstance {
  signal(data: unknown): void;
  replaceTrack(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack, stream: MediaStream): void;
  addTrack(track: MediaStreamTrack, stream: MediaStream): void;
  removeTrack(track: MediaStreamTrack, stream: MediaStream): void;
  destroy(err?: Error): void;
  on(event: string, listener: (...args: unknown[]) => void): this;
  readonly destroyed: boolean;
}


type SignalData = unknown;
type OfferPayload = { roomId?: string; sdp: SignalData };
type AnswerPayload = { sdp: SignalData };

// STUN and TURN servers for strict NAT traversal (Cellular, Corporate networks)
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ],
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useWebRTC = (roomId: string) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerConnected, setPeerConnected] = useState(false);

  const peerRef = useRef<PeerInstance | null>(null);
  const hasPeerStarted = useRef(false);
  const isPeerActive = useRef(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  // Always reflects the latest stream value so cleanup can stop all tracks
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { streamRef.current = stream; }, [stream]);

  // ---------------------------------------------------------------------------
  // safePeer — execute fn only when peer is alive
  // ---------------------------------------------------------------------------
  const safePeer = useCallback(
    (actionName: string, fn: (peer: PeerInstance) => void): boolean => {
      if (peerRef.current && isPeerActive.current && !peerRef.current.destroyed) {
        try {
          fn(peerRef.current);
          return true;
        } catch (err) {
          console.error(`[WebRTC] safePeer crashed in [${actionName}]:`, err);
        }
      } else {
        console.warn(`[WebRTC] safePeer blocked [${actionName}]: peer unavailable`);
      }
      return false;
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Core WebRTC effect
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!roomId) return;
    let isMounted = true;
    let localStream: MediaStream | null = null;

    const init = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Peer = (await import("simple-peer")).default as any;

        // 1. Acquire media FIRST (this takes time and user permission)
        // Wrapped in try/catch so if the user denies camera, or has no webcam, they can STILL JOIN and WATCH.
        try {
          localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          console.log("[WebRTC] LOCAL STREAM READY");
        } catch (mediaErr) {
          console.warn("[WebRTC] Camera access denied or no device found. Joining as viewer only.", mediaErr);
          localStream = null;
        }

        // StrictMode Unmount Guard
        if (!isMounted) {
          if (localStream) localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(localStream);

        // 2. Ensure Socket is fully connected
        if (!socket.connected) {
          socket.connect();
          await new Promise<void>((resolve) => {
            const onConnect = () => {
              console.log("[WebRTC] SOCKET CONNECTED");
              socket.off("connect", onConnect);
              resolve();
            };
            socket.on("connect", onConnect);
          });
        }

        if (!isMounted) return;

        // 3. Attach listeners BEFORE emitting join-room
        socket.off("peer-ready");
        socket.off("offer");
        socket.off("answer");
        socket.off("peer-disconnected");

        socket.on("peer-ready", ({ initiatorId }: { initiatorId: string }) => {
          console.log("[WebRTC] PEER READY RECEIVED");

          if (peerRef.current) {
            console.warn("[WebRTC] Destroying existing stale peer instance...");
            try { if (!peerRef.current.destroyed) peerRef.current.destroy(); } catch (err) { }
            peerRef.current = null;
          }
          hasPeerStarted.current = true;

          const isInitiator = socket.id === initiatorId;
          console.log(`[WebRTC] INITIATOR TRUE/FALSE: ${isInitiator ? "TRUE" : "FALSE"}`);
          console.log("[WebRTC] PEER CREATED");

          const peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            ...(streamRef.current || localStream ? { stream: streamRef.current || localStream } : {}),
            config: ICE_SERVERS,
          });

          isPeerActive.current = true;
          peerRef.current = peer;

          peer.on("signal", (data: SignalData) => {
            if (isInitiator) {
              console.log("[WebRTC] OFFER CREATED");
              socket.emit("offer", { roomId, sdp: data } as OfferPayload);
              console.log("[WebRTC] OFFER SENT");
            } else {
              socket.emit("answer", { roomId, sdp: data } as AnswerPayload);
            }
          });

          peer.on("stream", (remote: MediaStream) => {
            setRemoteStream(remote);
            setPeerConnected(true);
          });

          peer.on("connect", () => {
            console.log("[WebRTC] PEER CONNECTED");
            setPeerConnected(true);
          });

          peer.on("close", () => {
            isPeerActive.current = false;
            setPeerConnected(false);
          });

          peer.on("error", (err: Error) => {
            console.error("[WebRTC] Peer error:", err);
          });
        });

        socket.on("offer", (data: OfferPayload) => {
          safePeer("process offer", (p) => {
            try { p.signal(data.sdp); } catch (err) { }
          });
        });

        socket.on("answer", (data: AnswerPayload) => {
          console.log("[WebRTC] ANSWER RECEIVED");
          safePeer("process answer", (p) => {
            try { p.signal(data.sdp); } catch (err) { }
          });
        });

        socket.on("peer-disconnected", () => {
          setRemoteStream(null);
          setPeerConnected(false);
        });

        // 4. HANDSHAKE: Emit join-room ONLY when media is ready, socket is connected, and listeners are attached.
        // This guarantees that if the server replies with peer-ready, we will never miss it.
        console.log("[WebRTC] JOIN REQUEST SENT");
        socket.emit("join-room", roomId);

      } catch (err) {
        console.error("[WebRTC] init failed:", err);
      }
    };

    init();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      isMounted = false;
      console.log("[WebRTC] Cleanup running...");

      // 1. Detach socket listeners
      socket.off("peer-ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("peer-disconnected");

      // 2. Reset flags
      hasPeerStarted.current = false;
      isPeerActive.current = false;
      setPeerConnected(false);

      // 3. Destroy peer
      if (peerRef.current) {
        try {
          if (!peerRef.current.destroyed) peerRef.current.destroy();
        } catch (err) {
          console.warn("[WebRTC] Peer destroy error:", err);
        }
        peerRef.current = null;
      }

      // 4. Stop all local media tracks (use ref so we always have the latest stream)
      const activeStream = streamRef.current || localStream;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => { try { t.stop(); } catch { } });
      }

      // 5. Stop dangling screen tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { } });
        screenStreamRef.current = null;
      }

      // 6. Disconnect socket cleanly
      if (socket.connected) socket.disconnect();
    };
  }, [roomId, safePeer]);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------
  const toggleMute = useCallback(() => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    }
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setIsVideoOff(!track.enabled);
    }
  }, [stream]);

  // ---------------------------------------------------------------------------
  // stopScreenShare — restore camera stream, safe under all conditions
  // ---------------------------------------------------------------------------
  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing) return;

    try {
      console.log("[WebRTC] stopScreenShare — acquiring camera...");
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];

      if (stream) {
        const oldTrack = stream.getVideoTracks()[0];
        if (oldTrack) {
          safePeer("revert screen→camera", (p) =>
            p.replaceTrack(oldTrack, camTrack, stream),
          );
          oldTrack.stop();
        }
        
        // Remove system audio track from peer if it exists
        const screenAudioTrack = screenStreamRef.current?.getAudioTracks()[0];
        if (screenAudioTrack) {
          safePeer("remove screen audio", (p) => p.removeTrack(screenAudioTrack, stream));
        }

        const audioTracksToKeep = stream.getAudioTracks().filter(t => t !== screenAudioTrack);
        const next = new MediaStream([camTrack, ...audioTracksToKeep]);
        if (isVideoOff) camTrack.enabled = false;
        setStream(next);
      }

      // Stop screen tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { } });
        screenStreamRef.current = null;
      }

      setIsScreenSharing(false);
    } catch (err) {
      console.error("[WebRTC] stopScreenShare error:", err);
      setIsScreenSharing(false);
      screenStreamRef.current = null;
    }
  }, [stream, isVideoOff, isScreenSharing, safePeer]);

  // ---------------------------------------------------------------------------
  // shareScreen
  // ---------------------------------------------------------------------------
  const shareScreen = useCallback(async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      console.log("[WebRTC] Requesting display media with audio...");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: true // Prompt user to share system/tab audio
      });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      const screenAudioTrack = screenStream.getAudioTracks()[0];

      if (!stream) {
        screenTrack.stop();
        if (screenAudioTrack) screenAudioTrack.stop();
        return;
      }

      const oldTrack = stream.getVideoTracks()[0];

      // Attempt track replacement — if peer is active, update it dynamically.
      if (oldTrack) {
        safePeer("camera→screen", (p) => p.replaceTrack(oldTrack, screenTrack, stream));
      }
      
      // If user agreed to share system audio, add it to the peer connection!
      if (screenAudioTrack) {
        safePeer("add screen audio", (p) => p.addTrack(screenAudioTrack, stream));
      }

      // Restore camera when user clicks browser "Stop sharing"
      screenTrack.onended = () => {
        console.log("[WebRTC] Screen track ended natively");
        stopScreenShare();
      };

      const tracksToAdd = [screenTrack, ...stream.getAudioTracks()];
      if (screenAudioTrack) tracksToAdd.push(screenAudioTrack);

      const next = new MediaStream(tracksToAdd);
      setStream(next);
      setIsScreenSharing(true);
    } catch (err) {
      // User cancelled the picker — silent cleanup
      console.warn("[WebRTC] Screen share aborted:", err);
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { } });
        screenStreamRef.current = null;
      }
    }
  }, [isScreenSharing, stream, stopScreenShare, safePeer]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    stream,
    remoteStream,
    toggleMute,
    toggleVideo,
    shareScreen,
    isMuted,
    isVideoOff,
    isScreenSharing,
    peerConnected,
  };
};

