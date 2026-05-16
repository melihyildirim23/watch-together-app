import { useEffect, useRef, useState, useCallback } from "react";
import type { Instance as PeerInstance } from "simple-peer";
import { socket } from "@/lib/socket";

type SignalData = unknown;
type OfferPayload = { roomId?: string; sdp: SignalData };
type AnswerPayload = { sdp: SignalData };

export const useWebRTC = (roomId: string) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peerRef = useRef<PeerInstance | null>(null);
  const hasPeerStarted = useRef(false);
  
  // Explicitly track active state to prevent crashes on async callbacks
  const isPeerActive = useRef(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Keep a ref of the latest stream so the unmount cleanup can stop ALL tracks
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Final safety wrapper: ensures peer is valid before executing any async action
  const safePeer = useCallback((actionName: string, fn: (peer: PeerInstance) => void) => {
    if (peerRef.current && isPeerActive.current && !peerRef.current.destroyed) {
      try {
        fn(peerRef.current);
      } catch (err) {
        console.error(`[WebRTC] Crash prevented in safePeer during [${actionName}]:`, err);
      }
    } else {
      console.warn(`[WebRTC] safePeer prevented [${actionName}]: peer is null, inactive, or destroyed.`);
    }
  }, []);

  useEffect(() => {
    if (!roomId) return;

    let currentPeer: PeerInstance | null = null;
    let localStream: MediaStream | null = null;

    const init = async () => {
      try {
        const Peer = (await import("simple-peer")).default;
        
        localStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        setStream(localStream);

        // SOCKET HARDENING: Clear any stale listeners before attaching to prevent duplicates
        socket.off("ready");
        socket.off("offer");
        socket.off("answer");

        socket.emit("join-room", roomId);

        // ======================
        // READY (2 kişi)
        // ======================
        socket.on("ready", () => {
          if (hasPeerStarted.current) return;
          hasPeerStarted.current = true;

          console.log("[WebRTC] Initializing initiator peer");
          currentPeer = new Peer({
            initiator: true,
            trickle: true,
            stream: localStream!,
          });

          isPeerActive.current = true;
          peerRef.current = currentPeer;

          currentPeer.on("signal", (data: SignalData) => {
            socket.emit("offer", {
              roomId,
              sdp: data,
            } as OfferPayload);
          });

          currentPeer.on("stream", (remote: MediaStream) => {
            console.log("[WebRTC] Remote stream received");
            setRemoteStream(remote);
          });

          currentPeer.on("close", () => {
            console.log("[WebRTC] Peer connection closed natively");
            isPeerActive.current = false;
          });
          
          currentPeer.on("error", (err) => {
            console.error("[WebRTC] Peer error (initiator):", err);
          });
        });

        // ======================
        // OFFER
        // ======================
        socket.on("offer", (data: OfferPayload) => {
          // If peer is already initialized, just forward the SDP safely
          if (peerRef.current && !peerRef.current.destroyed) {
            safePeer("process offer SDP", (peer) => peer.signal(data.sdp));
            return;
          }

          console.log("[WebRTC] Initializing receiver peer");
          currentPeer = new Peer({
            initiator: false,
            trickle: true,
            stream: localStream!,
          });

          isPeerActive.current = true;
          peerRef.current = currentPeer;

          currentPeer.on("signal", (answer: SignalData) => {
            socket.emit("answer", {
              roomId,
              sdp: answer,
            } as AnswerPayload);
          });

          currentPeer.on("stream", (remote: MediaStream) => {
            console.log("[WebRTC] Remote stream received");
            setRemoteStream(remote);
          });

          currentPeer.on("close", () => {
            console.log("[WebRTC] Peer connection closed natively");
            isPeerActive.current = false;
          });
          
          currentPeer.on("error", (err) => {
            console.error("[WebRTC] Peer error (receiver):", err);
          });

          // Process the initial offer safely
          try {
            currentPeer.signal(data.sdp);
          } catch (err) {
            console.error("[WebRTC] Failed to process initial offer SDP:", err);
          }
        });

        // ======================
        // ANSWER
        // ======================
        socket.on("answer", (data: AnswerPayload) => {
          safePeer("process answer SDP", (peer) => peer.signal(data.sdp));
        });

      } catch (err) {
        console.error("[WebRTC] Failed to get local stream or init WebRTC:", err);
      }
    };

    init();

    // MEMORY + CLEANUP AUDIT
    return () => {
      console.log("[WebRTC] Running unmount cleanup...");
      
      // 1. Clear socket listeners safely
      socket.off("ready");
      socket.off("offer");
      socket.off("answer");

      hasPeerStarted.current = false;
      isPeerActive.current = false;

      // 2. Safely destroy peer
      if (peerRef.current) {
        try {
          if (!peerRef.current.destroyed) {
            peerRef.current.destroy();
          }
        } catch (err) {
          console.warn("[WebRTC] Error during peer unmount destroy:", err);
        }
        peerRef.current = null;
      }
      
      // 3. Stop all media tracks safely using the latest stream reference
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
            try { track.stop(); } catch {}
        });
      } else if (localStream) {
        localStream.getTracks().forEach(track => {
            try { track.stop(); } catch {}
        });
      }
      
      // 4. Stop dangling screen share tracks if they exist
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
            try { track.stop(); } catch {}
        });
        screenStreamRef.current = null;
      }
    };
  }, [roomId, safePeer]);

  const toggleMute = useCallback(() => {
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTrack = stream.getVideoTracks().find(t => t.kind === 'video');
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  }, [stream]);

  const stopScreenShare = useCallback(async () => {
    if (!isScreenSharing) return;

    try {
      console.log("[WebRTC] Stopping screen share, restoring camera...");
      const userStream = await navigator.mediaDevices.getUserMedia({ video: true });
      const camTrack = userStream.getVideoTracks()[0];
      
      if (stream) {
          const oldVideoTrack = stream.getVideoTracks().find(t => t.kind === 'video');
          
          if (oldVideoTrack) {
             safePeer("revert screen to camera", (peer) => {
                 peer.replaceTrack(oldVideoTrack, camTrack, stream);
             });
             oldVideoTrack.stop();
          }

          const newStream = new MediaStream([camTrack, ...stream.getAudioTracks()]);
          if (isVideoOff) camTrack.enabled = false;
          setStream(newStream);
      }
      
      if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(t => {
              try { t.stop(); } catch {}
          });
          screenStreamRef.current = null;
      }
      
      setIsScreenSharing(false);
    } catch (err) {
      console.error("[WebRTC] Crash caught in stopScreenShare:", err);
      setIsScreenSharing(false);
      screenStreamRef.current = null;
    }
  }, [stream, isVideoOff, isScreenSharing, safePeer]);

  const shareScreen = useCallback(async () => {
    if (isScreenSharing) {
      stopScreenShare();
      return;
    }

    try {
      console.log("[WebRTC] Requesting display media permissions...");
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];

      if (stream) {
        const oldVideoTrack = stream.getVideoTracks().find(t => t.kind === 'video');
        
        let trackReplaced = false;
        if (oldVideoTrack) {
           safePeer("replace camera with screen", (peer) => {
               peer.replaceTrack(oldVideoTrack, screenTrack, stream);
               trackReplaced = true;
           });
        }
        
        // If safePeer prevented the replaceTrack (e.g. peer destroyed), we abort
        if (oldVideoTrack && !trackReplaced) {
            console.warn("[WebRTC] Aborting screen share UI update because peer is inactive.");
            screenTrack.stop();
            return;
        }
        
        screenTrack.onended = () => {
            console.log("[WebRTC] Screen share ended by user/browser.");
            stopScreenShare();
        };

        const newStream = new MediaStream([screenTrack, ...stream.getAudioTracks()]);
        setStream(newStream);
        setIsScreenSharing(true);
      }
    } catch (err) {
      // User cancelled permission or system denied
      console.warn("[WebRTC] Screen share aborted cleanly:", err);
    }
  }, [isScreenSharing, stream, stopScreenShare, safePeer]);

  return { 
    stream, 
    remoteStream, 
    toggleMute, 
    toggleVideo, 
    shareScreen, 
    isMuted, 
    isVideoOff, 
    isScreenSharing 
  };
};