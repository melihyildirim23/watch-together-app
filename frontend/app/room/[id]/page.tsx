"use client";

import { useParams, useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useEffect, useRef, useState } from "react";

export default function Room() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const { 
    stream, 
    remoteStream, 
    toggleMute, 
    toggleVideo, 
    shareScreen, 
    isMuted, 
    isVideoOff, 
    isScreenSharing,
    peerConnected,
  } = useWebRTC(roomId);


  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  return (
    <div className="w-screen h-screen bg-[#0f0f11] relative overflow-hidden flex items-center justify-center font-sans text-white">
      
      {/* REMOTE SCREEN (Main Background) */}
      {remoteStream ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-contain md:object-cover bg-black"
        />
      ) : (
        <div className="flex flex-col items-center justify-center z-0">
          <div className="w-24 h-24 mb-4 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin"></div>
          {peerConnected ? (
            <p className="text-xl font-medium text-red-400">Peer left the room</p>
          ) : (
            <p className="text-xl font-medium text-white/70">Waiting for peer to join...</p>
          )}
          <p className="text-sm text-white/40 mt-2">Room ID: {roomId}</p>
        </div>
      )}

      {/* TOP BAR / OVERLAY INFO */}
      <div className="absolute top-0 left-0 w-full p-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start pointer-events-none">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight drop-shadow-md">Watch<span className="text-indigo-500">Together</span></h1>
          <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border border-indigo-500/30 w-max shadow-sm">
            Room: {roomId}
          </span>
        </div>
      </div>

      {/* LOCAL CAMERA (Draggable) */}
      <div 
        className={`absolute z-20 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 transition-shadow ${isDragging ? 'cursor-grabbing scale-105 shadow-indigo-500/20' : 'cursor-grab hover:border-white/30'}`}
        style={{ 
          width: '240px', 
          height: '160px',
          left: position.x === 20 && position.y === 20 ? 'auto' : `${position.x}px`, 
          top: position.x === 20 && position.y === 20 ? 'auto' : `${position.y}px`,
          right: position.x === 20 && position.y === 20 ? '24px' : 'auto',
          bottom: position.x === 20 && position.y === 20 ? '100px' : 'auto',
          touchAction: 'none'
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {stream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
            style={{ transform: isScreenSharing ? 'none' : 'scaleX(-1)' }}
          />
        ) : null}
        
        {isVideoOff && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
            <svg className="w-12 h-12 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          </div>
        )}
        
        <div className="absolute bottom-2 left-2 flex gap-1 pointer-events-none">
          {isMuted && (
            <div className="bg-red-500/80 p-1 rounded-md backdrop-blur-sm">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </div>
          )}
          <div className="bg-black/60 px-2 py-0.5 rounded-md backdrop-blur-sm text-xs font-medium border border-white/10">
            You {isScreenSharing ? '(Screen)' : ''}
          </div>
        </div>
      </div>

      {/* CONTROLS (Glassmorphism Bottom Bar) */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-zinc-900/60 backdrop-blur-xl px-6 py-4 rounded-3xl border border-white/10 shadow-2xl">
        
        <button
          onClick={toggleMute}
          className={`p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center ${
            isMuted 
              ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" 
              : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"
          }`}
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleVideo}
          className={`p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center ${
            isVideoOff 
              ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" 
              : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"
          }`}
          title={isVideoOff ? "Turn on camera" : "Turn off camera"}
        >
          {isVideoOff ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        <button
          onClick={shareScreen}
          className={`p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center ${
            isScreenSharing 
              ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/30" 
              : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"
          }`}
          title={isScreenSharing ? "Stop sharing" : "Share screen"}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </button>

        <div className="w-px h-10 bg-white/10 mx-2"></div>

        <button
          onClick={() => {
             // Stop ALL tracks via the underlying MediaStream
             if (stream) stream.getTracks().forEach(t => { try { t.stop(); } catch {} });
             router.push('/');
          }}
          className="p-4 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all duration-300 shadow-lg shadow-red-600/30 border border-red-500 flex items-center justify-center"
          title="Leave Room"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: 'rotate(180deg)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>

      </div>
    </div>
  );
}