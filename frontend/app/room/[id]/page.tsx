"use client";

import { useParams, useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "@/lib/socket";

type ReactionItem = { id: number; type: "emoji" | "gif"; content: string };

const QUICK_EMOJIS = [
  "👍","❤️","😂","😮","🎉","🔥","😍","🥰","🤩","😭",
  "🙌","💯","✨","😎","🤣","😱","💪","🥳","😊","🫶",
  "👏","💥","🙏","😴","🤔","😅","💀","🫠","🤯","🫡",
];

const GIFS = [
  { label: "👍", url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" },
  { label: "🔥", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
  { label: "😂", url: "https://media.giphy.com/media/Vbtc9VG53qLCg/giphy.gif" },
  { label: "🎉", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  { label: "😍", url: "https://media.giphy.com/media/26Ff3yDMoOp5ySMkc/giphy.gif" },
  { label: "👏", url: "https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif" },
  { label: "😮", url: "https://media.giphy.com/media/26ufdipQqU84H52sg/giphy.gif" },
  { label: "💪", url: "https://media.giphy.com/media/l0HlvtIPzPdt2uO0E/giphy.gif" },
];

export default function Room() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const { stream, remoteStream, toggleMute, toggleVideo, shareScreen, isMuted, isVideoOff, isScreenSharing, peerConnected } = useWebRTC(roomId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [reactionTab, setReactionTab] = useState<"emoji" | "gif">("emoji");
  const [activeReactions, setActiveReactions] = useState<ReactionItem[]>([]);
  const reactionIdCounter = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => { if (localVideoRef.current && stream) localVideoRef.current.srcObject = stream; }, [stream]);
  useEffect(() => { if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream; }, [remoteStream]);

  // Show reaction locally + broadcast
  const showReaction = useCallback((type: "emoji" | "gif", content: string) => {
    const id = reactionIdCounter.current++;
    setActiveReactions(prev => [...prev, { id, type, content }]);
    setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== id)), 3500);
  }, []);

  const sendReaction = useCallback((type: "emoji" | "gif", content: string) => {
    socket.emit("reaction", { roomId, type, content });
    showReaction(type, content);
    setShowReactionPanel(false);
  }, [roomId, showReaction]);

  useEffect(() => {
    const handler = ({ type, content }: { type: "emoji" | "gif"; content: string }) => {
      showReaction(type, content);
    };
    socket.on("reaction", handler);
    return () => { socket.off("reaction", handler); };
  }, [showReaction]);

  useEffect(() => {
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  };

  const btnBase = "flex-shrink-0 p-3 md:p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center";
  const btnGhost = `${btnBase} bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20`;
  const isDefaultPos = position.x === 20 && position.y === 20;

  return (
    <div className="w-screen h-screen bg-[#0f0f11] relative overflow-hidden flex items-center justify-center font-sans text-white">

      {/* ANIMATION CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popInFadeOut {
          0%   { transform: translate(-50%,-50%) scale(0.1); opacity:0; }
          15%  { transform: translate(-50%,-50%) scale(1.2); opacity:1; }
          30%  { transform: translate(-50%,-50%) scale(1);   opacity:1; }
          80%  { transform: translate(-50%,-50%) scale(1);   opacity:1; }
          100% { transform: translate(-50%,-60%) scale(0.85); opacity:0; }
        }
        .reaction-pop { animation: popInFadeOut 3.5s forwards; }
      `}} />

      {/* REMOTE VIDEO */}
      {remoteStream ? (
        <video ref={remoteVideoRef} autoPlay playsInline
          className="absolute inset-0 w-full h-full object-contain md:object-cover bg-black cursor-pointer"
          onClick={() => { if (isImmersive) setIsImmersive(false); }}
        />
      ) : (
        <div className="flex flex-col items-center justify-center z-0">
          <div className="w-24 h-24 mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-xl font-medium text-white/70">{peerConnected ? "Peer left the room" : "Waiting for peer to join..."}</p>
          <p className="text-sm text-white/40 mt-2">Room ID: {roomId}</p>
        </div>
      )}

      {/* ACTIVE REACTIONS */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {activeReactions.map(r => (
          <div key={r.id} className="reaction-pop absolute left-1/2 top-1/2 drop-shadow-2xl">
            {r.type === "emoji"
              ? <span className="text-7xl md:text-9xl">{r.content}</span>
              : <img src={r.content} alt="reaction" className="w-40 h-40 md:w-56 md:h-56 object-contain rounded-2xl" />
            }
          </div>
        ))}
      </div>

      {/* TOP BAR */}
      {!isImmersive && (
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight drop-shadow-md">Watch<span className="text-indigo-500">Together</span></h1>
            <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border border-indigo-500/30 w-max">Room: {roomId}</span>
          </div>
        </div>
      )}

      {/* LOCAL CAMERA */}
      {!isImmersive && (
        <div
          className={`absolute z-20 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 transition-shadow ${isDragging ? "cursor-grabbing scale-105" : "cursor-grab hover:border-white/30"}`}
          style={{ width: 160, height: 110, left: isDefaultPos ? "auto" : position.x, top: isDefaultPos ? "auto" : position.y, right: isDefaultPos ? 16 : "auto", bottom: isDefaultPos ? 100 : "auto", touchAction: "none" }}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}
        >
          {stream && <video ref={localVideoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${isVideoOff ? "opacity-0" : "opacity-100"}`} style={{ transform: isScreenSharing ? "none" : "scaleX(-1)" }} />}
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-1.5 left-2 pointer-events-none">
            <span className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10">You {isScreenSharing ? "(Screen)" : ""}</span>
          </div>
        </div>
      )}

      {/* REACTION PANEL */}
      {showReactionPanel && (
        <div className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden w-[92vw] sm:w-96">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            {(["emoji", "gif"] as const).map(tab => (
              <button key={tab} onClick={() => setReactionTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${reactionTab === tab ? "text-indigo-400 border-b-2 border-indigo-400" : "text-white/40 hover:text-white/70"}`}>
                {tab === "emoji" ? "😀 Emoji" : "🎥 GIF"}
              </button>
            ))}
            <button onClick={() => setShowReactionPanel(false)} className="px-4 text-white/40 hover:text-white/80 text-lg">✕</button>
          </div>

          {/* Emoji Grid */}
          {reactionTab === "emoji" && (
            <div className="grid grid-cols-6 gap-1 p-3 max-h-52 overflow-y-auto">
              {QUICK_EMOJIS.map(e => (
                <button key={e} onClick={() => sendReaction("emoji", e)}
                  className="text-2xl md:text-3xl p-1.5 rounded-xl hover:bg-white/10 active:scale-125 transition-transform text-center">
                  {e}
                </button>
              ))}
            </div>
          )}

          {/* GIF Grid */}
          {reactionTab === "gif" && (
            <div className="grid grid-cols-4 gap-2 p-3 max-h-52 overflow-y-auto">
              {GIFS.map(g => (
                <button key={g.url} onClick={() => sendReaction("gif", g.url)}
                  className="relative rounded-xl overflow-hidden aspect-square bg-zinc-800 hover:ring-2 hover:ring-indigo-400 active:scale-95 transition-all">
                  <img src={g.url} alt={g.label} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTROLS */}
      {!isImmersive && (
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-2 md:gap-3 bg-zinc-900/60 backdrop-blur-xl px-3 py-2 md:px-5 md:py-3 rounded-3xl border border-white/10 shadow-2xl overflow-x-auto max-w-[97vw]">

          {/* Mute */}
          <button onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}
            className={`${btnBase} ${isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              {isMuted && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
            </svg>
          </button>

          {/* Camera */}
          <button onClick={toggleVideo} title={isVideoOff ? "Camera On" : "Camera Off"}
            className={`${btnBase} ${isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              {isVideoOff && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
            </svg>
          </button>

          {/* Screen Share */}
          <button onClick={shareScreen} title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            className={`${btnBase} ${isScreenSharing ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/30" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          <div className="w-px h-8 bg-white/10 mx-0.5" />

          {/* Reaction Button */}
          <button onClick={() => setShowReactionPanel(v => !v)} title="Reactions / GIF"
            className={`${btnBase} ${showReactionPanel ? "bg-indigo-500 text-white" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Immersive */}
          <button onClick={() => setIsImmersive(true)} title="Cinema Mode" className={btnGhost}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          {/* Fullscreen */}
          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} className={btnGhost}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isFullscreen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              }
            </svg>
          </button>

          <div className="w-px h-8 bg-white/10 mx-0.5" />

          {/* Leave */}
          <button onClick={() => { if (stream) stream.getTracks().forEach(t => { try { t.stop(); } catch {} }); router.push("/"); }}
            className={`${btnBase} bg-red-600 text-white hover:bg-red-700 border border-red-500 shadow-red-600/30`} title="Leave Room">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: "rotate(180deg)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

        </div>
      )}

      {/* IMMERSIVE HINT */}
      {isImmersive && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white/70 px-4 py-2 rounded-full text-sm font-medium pointer-events-none animate-pulse">
          Ekrana dokun → UI göster
        </div>
      )}
    </div>
  );
}