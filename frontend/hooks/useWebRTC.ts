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
  destroy(err?: Error): void;
  on(event: string, listener: (...args: unknown[]) => void): this;
  readonly destroyed: boolean;
}


type SignalData   = unknown;
type OfferPayload = { roomId?: string; sdp: SignalData };
type AnswerPayload = { sdp: SignalData };

// STUN servers for NAT traversal — required in production
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useWebRTC = (roomId: string) => {
  const [stream,          setStream]          = useState<MediaStream | null>(null);
  const [remoteStream,    setRemoteStream]    = useState<MediaStream | null>(null);
  const [isMuted,         setIsMuted]         = useState(false);
  const [isVideoOff,      setIsVideoOff]      = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peerConnected,   setPeerConnected]   = useState(false);

  const peerRef        = useRef<PeerInstance | null>(null);
  const hasPeerStarted = useRef(false);
  const isPeerActive   = useRef(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  // Always reflects the latest stream value so cleanup can stop all tracks
  const streamRef      = useRef<MediaStream | null>(null);

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

    let localStream: MediaStream | null = null;

    const init = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const Peer = (await import("simple-peer")).default as any;


        // Acquire camera + mic
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(localStream);

        // ── Socket lifecycle ─────────────────────────────────────────────────
        // Connect on room entry, disconnect on leave
        if (!socket.connected) socket.connect();

        // Remove any stale listeners before re-attaching (StrictMode / hot-reload)
        socket.off("ready");
        socket.off("offer");
        socket.off("answer");
        socket.off("peer-disconnected");

        socket.emit("join-room", roomId);

        // ── READY ─────────────────────────────────────────────────────────────
        socket.on("ready", () => {
          if (hasPeerStarted.current) return;
          hasPeerStarted.current = true;

          console.log("[WebRTC] ready → creating initiator peer");
          const peer = new Peer({
            initiator: true,
            trickle:   true,
            stream:    localStream!,
            config:    ICE_SERVERS,
          });

          isPeerActive.current = true;
          peerRef.current      = peer;

          peer.on("signal", (data: SignalData) => {
            socket.emit("offer", { roomId, sdp: data } as OfferPayload);
          });

          peer.on("stream", (remote: MediaStream) => {
            console.log("[WebRTC] Remote stream received (initiator)");
            setRemoteStream(remote);
            setPeerConnected(true);
          });

          peer.on("connect", () => {
            console.log("[WebRTC] Peer data-channel connected (initiator)");
            setPeerConnected(true);
          });

          peer.on("close", () => {
            console.log("[WebRTC] Peer closed (initiator)");
            isPeerActive.current = false;
            setPeerConnected(false);
          });

          peer.on("error", (err: Error) => {
            console.error("[WebRTC] Peer error (initiator):", err);
          });
        });

        // ── OFFER ──────────────────────────────────────────────────────────────
        socket.on("offer", (data: OfferPayload) => {
          // Already have a peer → just forward the SDP (trickle ICE)
          if (peerRef.current && !peerRef.current.destroyed) {
            safePeer("forward offer SDP", (p) => p.signal(data.sdp));
            return;
          }

          console.log("[WebRTC] offer received → creating receiver peer");
          const peer = new Peer({
            initiator: false,
            trickle:   true,
            stream:    localStream!,
            config:    ICE_SERVERS,
          });

          isPeerActive.current = true;
          peerRef.current      = peer;

          peer.on("signal", (answer: SignalData) => {
            socket.emit("answer", { roomId, sdp: answer } as AnswerPayload);
          });

          peer.on("stream", (remote: MediaStream) => {
            console.log("[WebRTC] Remote stream received (receiver)");
            setRemoteStream(remote);
            setPeerConnected(true);
          });

          peer.on("connect", () => {
            console.log("[WebRTC] Peer data-channel connected (receiver)");
            setPeerConnected(true);
          });

          peer.on("close", () => {
            console.log("[WebRTC] Peer closed (receiver)");
            isPeerActive.current = false;
            setPeerConnected(false);
          });

          peer.on("error", (err: Error) => {
            console.error("[WebRTC] Peer error (receiver):", err);
          });

          try {
            peer.signal(data.sdp);
          } catch (err) {
            console.error("[WebRTC] Failed to signal initial offer:", err);
          }
        });

        // ── ANSWER ─────────────────────────────────────────────────────────────
        socket.on("answer", (data: AnswerPayload) => {
          safePeer("process answer SDP", (p) => p.signal(data.sdp));
        });

        // ── PEER DISCONNECTED (server event) ───────────────────────────────────
        socket.on("peer-disconnected", () => {
          console.log("[WebRTC] Remote peer disconnected");
          setRemoteStream(null);
          setPeerConnected(false);
        });

      } catch (err) {
        console.error("[WebRTC] init failed:", err);
      }
    };

    init();

    // ── Cleanup ──────────────────────────────────────────────────────────────
    return () => {
      console.log("[WebRTC] Cleanup running...");

      // 1. Detach socket listeners
      socket.off("ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("peer-disconnected");

      // 2. Reset flags
      hasPeerStarted.current = false;
      isPeerActive.current   = false;
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
        activeStream.getTracks().forEach((t) => { try { t.stop(); } catch {} });
      }

      // 5. Stop dangling screen tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch {} });
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
      const camTrack  = camStream.getVideoTracks()[0];

      if (stream) {
        const oldTrack = stream.getVideoTracks()[0];
        if (oldTrack) {
          safePeer("revert screen→camera", (p) =>
            p.replaceTrack(oldTrack, camTrack, stream),
          );
          oldTrack.stop();
        }
        const next = new MediaStream([camTrack, ...stream.getAudioTracks()]);
        if (isVideoOff) camTrack.enabled = false;
        setStream(next);
      }

      // Stop screen tracks
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch {} });
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
      console.log("[WebRTC] Requesting display media...");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      if (!stream) {
        screenTrack.stop();
        return;
      }

      const oldTrack = stream.getVideoTracks()[0];

      // Attempt track replacement — abort if peer is inactive
      if (oldTrack) {
        const replaced = safePeer("camera→screen", (p) =>
          p.replaceTrack(oldTrack, screenTrack, stream),
        );
        if (!replaced) {
          console.warn("[WebRTC] replaceTrack blocked — aborting screen share");
          screenTrack.stop();
          screenStreamRef.current = null;
          return;
        }
      }

      // Restore camera when user clicks browser "Stop sharing"
      screenTrack.onended = () => {
        console.log("[WebRTC] Screen track ended natively");
        stopScreenShare();
      };

      const next = new MediaStream([screenTrack, ...stream.getAudioTracks()]);
      setStream(next);
      setIsScreenSharing(true);
    } catch (err) {
      // User cancelled the picker — silent cleanup
      console.warn("[WebRTC] Screen share aborted:", err);
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch {} });
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
