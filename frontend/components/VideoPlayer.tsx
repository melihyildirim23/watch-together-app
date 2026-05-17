"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "@/lib/socket";

const getYoutubeId = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
};

type Props = { roomId: string; onClose: () => void };

export default function VideoPlayer({ roomId, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const isSyncing = useRef(false);

  const submitUrl = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    setUrl(trimmed);
    socket.emit("video-url", { roomId, url: trimmed });
    setInputVal("");
  };

  useEffect(() => {
    socket.on("video-url", ({ url: u }: { url: string }) => setUrl(u));
    socket.on("video-sync", ({ action, currentTime }: { action: string; currentTime: number }) => {
      const v = videoRef.current;
      if (!v) return;
      isSyncing.current = true;
      if (currentTime !== undefined) v.currentTime = currentTime;
      if (action === "play") v.play().catch(() => {});
      if (action === "pause") v.pause();
      setTimeout(() => { isSyncing.current = false; }, 600);
    });
    return () => { socket.off("video-url"); socket.off("video-sync"); };
  }, []);

  const emit = useCallback((action: string) => {
    if (isSyncing.current) return;
    socket.emit("video-sync", { roomId, action, currentTime: videoRef.current?.currentTime ?? 0 });
  }, [roomId]);

  const ytId = url ? getYoutubeId(url) : null;

  return (
    <div className="absolute inset-0 z-10 bg-black flex flex-col">
      {/* Player Area */}
      <div className="flex-1 relative">
        {!url ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
            <div className="text-5xl">📺</div>
            <p className="text-white/70 text-center text-sm">YouTube veya direkt video linki yapıştır</p>
            <div className="flex gap-2 w-full max-w-md">
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitUrl(inputVal)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-indigo-400 placeholder:text-white/30"
              />
              <button onClick={() => submitUrl(inputVal)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold">
                Oynat
              </button>
            </div>
            <p className="text-white/30 text-xs">iOS dahil tüm cihazlarda ses çalışır ✅</p>
          </div>
        ) : ytId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
            className="w-full h-full"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            src={url}
            controls
            autoPlay
            className="w-full h-full"
            onPlay={() => emit("play")}
            onPause={() => emit("pause")}
            onSeeked={() => emit("seek")}
          />
        )}
      </div>

      {/* URL Bar */}
      {url && (
        <div className="flex items-center gap-2 p-2 bg-zinc-900/80 border-t border-white/10">
          <input
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submitUrl(inputVal)}
            placeholder="Yeni link..."
            className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-indigo-400 placeholder:text-white/30"
          />
          <button onClick={() => submitUrl(inputVal)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold">Değiştir</button>
        </div>
      )}

      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 bg-black/60 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg backdrop-blur-md border border-white/10"
      >✕</button>
    </div>
  );
}
