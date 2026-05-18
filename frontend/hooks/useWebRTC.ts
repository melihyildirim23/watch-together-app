import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "@/lib/socket";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
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

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
    { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
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
  const [screenShareError, setScreenShareError] = useState<string | null>(null);

  const peerRef = useRef<PeerInstance | null>(null);
  const hasPeerStarted = useRef(false);
  const isPeerActive = useRef(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => { streamRef.current = stream; }, [stream]);

  const safePeer = useCallback(
    (actionName: string, fn: (peer: PeerInstance) => void): boolean => {
      if (peerRef.current && isPeerActive.current && !peerRef.current.destroyed) {
        try { fn(peerRef.current); return true; }
        catch (err) { console.error(`[WebRTC] safePeer crashed in [${actionName}]:`, err); }
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

        try {
          localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          console.log("[WebRTC] LOCAL STREAM READY");
        } catch (mediaErr) {
          console.warn("[WebRTC] Camera access denied or no device found. Joining as viewer only.", mediaErr);
          localStream = null;
        }

        if (!isMounted) {
          if (localStream) localStream.getTracks().forEach((t) => t.stop());
          return;
        }

        setStream(localStream);

        if (!socket.connected) {
          socket.connect();
          await new Promise<void>((resolve) => {
            const onConnect = () => { console.log("[WebRTC] SOCKET CONNECTED"); socket.off("connect", onConnect); resolve(); };
            socket.on("connect", onConnect);
          });
        }

        if (!isMounted) return;

        socket.off("peer-ready");
        socket.off("offer");
        socket.off("answer");
        socket.off("ice-candidate");
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
          console.log(`[WebRTC] INITIATOR: ${isInitiator ? "TRUE" : "FALSE"}`);

          const peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            ...(streamRef.current || localStream ? { stream: streamRef.current || localStream } : {}),
            config: ICE_SERVERS,
          });

          isPeerActive.current = true;
          peerRef.current = peer;

          // Robust WebRTC signaling (separates SDP offers/answers from ICE candidates)
          peer.on("signal", (data: any) => {
            if (data.renegotiate || data.transceiverRequest) return;

            if (data.type === "offer" || data.type === "answer") {
              if (data.type === "offer") {
                socket.emit("offer", { roomId, sdp: data });
              } else {
                socket.emit("answer", { roomId, sdp: data });
              }
            } else if (data.candidate) {
              socket.emit("ice-candidate", { roomId, candidate: data });
            }
          });

          peer.on("stream", (remote: MediaStream) => {
            console.log("[WebRTC] REMOTE STREAM RECEIVED");
            setRemoteStream(remote);
            setPeerConnected(true);
          });

          peer.on("track", (track: MediaStreamTrack, remoteStream: MediaStream) => {
            console.log(`[WebRTC] DYNAMIC TRACK ADDED: ${track.kind}`);
            setRemoteStream(new MediaStream(remoteStream.getTracks()));
          });

          peer.on("connect", () => { console.log("[WebRTC] PEER CONNECTED"); setPeerConnected(true); });
          peer.on("close", () => { isPeerActive.current = false; setPeerConnected(false); });
          peer.on("error", (err: Error) => { console.error("[WebRTC] Peer error:", err); });
        });

        socket.on("offer", (data: OfferPayload) => {
          safePeer("process offer", (p) => { try { p.signal(data.sdp); } catch (err) { } });
        });

        socket.on("answer", (data: AnswerPayload) => {
          console.log("[WebRTC] ANSWER RECEIVED");
          safePeer("process answer", (p) => { try { p.signal(data.sdp); } catch (err) { } });
        });

        socket.on("ice-candidate", ({ candidate }: { candidate: any }) => {
          safePeer("process ice candidate", (p) => {
            try {
              p.signal(candidate);
            } catch (err) {
              console.warn("[WebRTC] Failed to signal candidate:", err);
            }
          });
        });

        socket.on("peer-disconnected", () => { setRemoteStream(null); setPeerConnected(false); });

        console.log("[WebRTC] JOIN REQUEST SENT");
        socket.emit("join-room", roomId);

      } catch (err) {
        console.error("[WebRTC] init failed:", err);
      }
    };

    init();

    return () => {
      isMounted = false;
      console.log("[WebRTC] Cleanup running...");
      socket.off("peer-ready");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("peer-disconnected");
      hasPeerStarted.current = false;
      isPeerActive.current = false;
      setPeerConnected(false);
      if (peerRef.current) {
        try { if (!peerRef.current.destroyed) peerRef.current.destroy(); } catch (err) { console.warn("[WebRTC] Peer destroy error:", err); }
        peerRef.current = null;
      }
      const activeStream = streamRef.current || localStream;
      if (activeStream) activeStream.getTracks().forEach((t) => { try { t.stop(); } catch { } });
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch { } });
        screenStreamRef.current = null;
      }
      socket.emit("leave-room");
    };
  }, [roomId, safePeer]);

  // ---------------------------------------------------------------------------
  // Controls
  // ---------------------------------------------------------------------------
  const toggleMute = useCallback(() => {
    if (!stream) return;
    const track = stream.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsMuted(!track.enabled); }
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setIsVideoOff(!track.enabled); }
  }, [stream]);

  // ---------------------------------------------------------------------------
  // stopScreenShare
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
          safePeer("revert screen->camera", (p) => p.replaceTrack(oldTrack, camTrack, stream));
          oldTrack.stop();
        }
        const screenAudioTrack = screenStreamRef.current?.getAudioTracks()[0];
        if (screenAudioTrack) safePeer("remove screen audio", (p) => p.removeTrack(screenAudioTrack, stream));
        const audioTracksToKeep = stream.getAudioTracks().filter(t => t !== screenAudioTrack);
        const next = new MediaStream([camTrack, ...audioTracksToKeep]);
        if (isVideoOff) camTrack.enabled = false;
        setStream(next);
      }

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
  // shareScreen — iOS uses minimal video:true (tab capture), others use full constraints
  // ---------------------------------------------------------------------------
  const shareScreen = useCallback(async () => {
    if (isScreenSharing) { await stopScreenShare(); return; }

    try {
      console.log("[WebRTC] Requesting display media...");
      let screenStream: MediaStream;
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      if (isIOS) {
        // iOS Safari 16.4+: tab capture only. Complex constraints cause NotSupportedError.
        console.log("[WebRTC] iOS detected — minimal constraints for tab capture");
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      } else {
        // Desktop / Android: full constraints with audio, fallback to no audio
        try {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 30 } },
            audio: true,
          });
        } catch {
          screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 30 } },
          });
        }
      }

      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      const screenAudioTrack = screenStream.getAudioTracks()[0];

      if (!stream) {
        screenTrack.stop();
        if (screenAudioTrack) screenAudioTrack.stop();
        return;
      }

      const oldTrack = stream.getVideoTracks()[0];
      if (oldTrack) safePeer("camera->screen", (p) => p.replaceTrack(oldTrack, screenTrack, stream));
      if (screenAudioTrack) safePeer("add screen audio", (p) => p.addTrack(screenAudioTrack, stream));

      screenTrack.onended = () => { console.log("[WebRTC] Screen track ended"); stopScreenShare(); };

      const tracksToAdd = [screenTrack, ...stream.getAudioTracks()];
      if (screenAudioTrack) tracksToAdd.push(screenAudioTrack);
      setStream(new MediaStream(tracksToAdd));
      setIsScreenSharing(true);

    } catch (err) {
      console.warn("[WebRTC] Screen share cancelled or unsupported:", err);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
          // User cancelled picker — silent
        } else if (err.name === 'NotSupportedError') {
          setScreenShareError("Ekran paylaşımı desteklenmiyor. iOS için Safari 16.4+ gerekli.");
          setTimeout(() => setScreenShareError(null), 7000);
        } else {
          setScreenShareError("Ekran paylaşımı başlatılamadı: " + err.name);
          setTimeout(() => setScreenShareError(null), 5000);
        }
      } else if (isIOS) {
        setScreenShareError("iOS için Safari 16.4+ kullanın ve sekme seçiciden sekme seçin.");
        setTimeout(() => setScreenShareError(null), 7000);
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch { } });
        screenStreamRef.current = null;
      }
    }
  }, [isScreenSharing, stream, stopScreenShare, safePeer]);

  // ---------------------------------------------------------------------------
  // shareBrowserTab — Captures THIS tab's video+audio with highest compatibility
  // Chrome 94+: uses preferCurrentTab which pre-selects this tab with audio on
  // ---------------------------------------------------------------------------
  const [isTabSharing, setIsTabSharing] = useState(false);
  const tabShareRef = useRef<MediaStream | null>(null);

  const stopTabShare = useCallback(async () => {
    if (!isTabSharing) return;
    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = camStream.getVideoTracks()[0];
      if (stream) {
        const oldTrack = stream.getVideoTracks()[0];
        if (oldTrack) {
          safePeer("revert tab->camera", (p) => p.replaceTrack(oldTrack, camTrack, stream));
          oldTrack.stop();
        }
        const tabAudio = tabShareRef.current?.getAudioTracks()[0];
        if (tabAudio) safePeer("remove tab audio", (p) => p.removeTrack(tabAudio, stream));
        setStream(new MediaStream([camTrack, ...stream.getAudioTracks().filter(t => t !== tabAudio)]));
      }
      tabShareRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
      tabShareRef.current = null;
    } catch {
      // ignore
    } finally {
      setIsTabSharing(false);
    }
  }, [isTabSharing, stream, safePeer]);

  const [showMobileGuide, setShowMobileGuide] = useState(false);

  const shareBrowserTab = useCallback(async () => {
    if (isTabSharing) { await stopTabShare(); return; }
    setScreenShareError(null);

    // Mobile devices (Android/iOS) don't support getDisplayMedia.
    // Show a native screen-recording guide instead of throwing an error.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      setShowMobileGuide(true);
      return;
    }

    try {
      // preferCurrentTab pre-selects this tab and enables audio in Chrome 94+
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constraints: any = {
        video: { width: { max: 1920 }, height: { max: 1080 }, frameRate: { max: 30 } },
        audio: { suppressLocalAudioPlayback: false },
        preferCurrentTab: true,
        selfBrowserSurface: "include",
      };

      let tabStream: MediaStream;
      try {
        tabStream = await navigator.mediaDevices.getDisplayMedia(constraints);
      } catch {
        // fallback without preferCurrentTab for Firefox/Safari
        tabStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      }

      tabShareRef.current = tabStream;
      const tabVideoTrack = tabStream.getVideoTracks()[0];
      const tabAudioTrack = tabStream.getAudioTracks()[0];

      if (!stream) {
        tabStream.getTracks().forEach(t => t.stop());
        setScreenShareError("Kamera akışı bulunamadı. Lütfen önce kameranıza izin verin.");
        setTimeout(() => setScreenShareError(null), 5000);
        return;
      }

      const oldVideoTrack = stream.getVideoTracks()[0];
      if (oldVideoTrack) {
        safePeer("tab video replace", (p) => p.replaceTrack(oldVideoTrack, tabVideoTrack, stream));
        oldVideoTrack.stop();
      }
      if (tabAudioTrack) {
        safePeer("tab audio add", (p) => p.addTrack(tabAudioTrack, stream));
      }

      tabVideoTrack.onended = () => stopTabShare();

      const updatedTracks = [tabVideoTrack, ...stream.getAudioTracks()];
      if (tabAudioTrack) updatedTracks.push(tabAudioTrack);
      setStream(new MediaStream(updatedTracks));
      setIsTabSharing(true);

    } catch (err) {
      if (err instanceof Error && (err.name === "NotAllowedError" || err.name === "AbortError")) {
        // user cancelled — silent
      } else {
        setScreenShareError("Sekme paylaşımı başlatılamadı. Chrome 94+ veya yeni bir Firefox kullanın.");
        setTimeout(() => setScreenShareError(null), 6000);
      }
    }
  }, [isTabSharing, stream, stopTabShare, safePeer]);

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------
  return {
    stream,
    remoteStream,
    toggleMute,
    toggleVideo,
    shareScreen,
    shareBrowserTab,
    isMuted,
    isVideoOff,
    isScreenSharing,
    isTabSharing,
    peerConnected,
    screenShareError,
    showMobileGuide,
    setShowMobileGuide,
  };
};
