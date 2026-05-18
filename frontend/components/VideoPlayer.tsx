"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { socket, SOCKET_URL } from "@/lib/socket";
import Hls from "hls.js";

const getYoutubeId = (url: string) => {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  return m ? m[1] : null;
};

type Props = { roomId: string; initialUrl?: string | null; onClose: () => void };

type PlayerSource = {
  type: "direct" | "iframe";
  url: string;
};

export default function VideoPlayer({ roomId, initialUrl, onClose }: Props) {
  const [source, setSource] = useState<PlayerSource | null>(null);
  const [inputVal, setInputVal] = useState("");
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const isSyncing = useRef(false);

  // Resolve arbitrary movie/video webpage links
  const submitUrl = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    
    setIsResolving(true);
    setResolveError(null);

    try {
      console.log(`[VideoPlayer] Asking server to resolve URL: ${trimmed}`);
      const res = await fetch(`${SOCKET_URL}/api/resolve?url=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error("Sunucu linki çözümlerken hata oluşturdu.");
      }
      
      const data = (await res.json()) as PlayerSource;
      console.log(`[VideoPlayer] Resolved successfully:`, data);
      
      setSource(data);
      socket.emit("video-url", { roomId, url: JSON.stringify(data) });
      setInputVal("");
    } catch (err: unknown) {
      console.error("[VideoPlayer] Resolution failed:", err);
      setResolveError(
        err instanceof Error 
          ? err.message 
          : "Film sayfası ayrıştırılamadı. Doğrudan video (.mp4/.m3u8) veya YouTube linki girmeyi deneyebilirsiniz."
      );
    } finally {
      setIsResolving(false);
    }
  };

  // Automatically resolve initialUrl if passed
  useEffect(() => {
    if (initialUrl) {
      submitUrl(initialUrl);
    }
  }, [initialUrl]);

  // Socket Listener for synchronized player events
  useEffect(() => {
    socket.on("video-url", ({ url: rawUrl }: { url: string }) => {
      try {
        const parsed = JSON.parse(rawUrl) as PlayerSource;
        setSource(parsed);
      } catch {
        // Fallback for older direct strings
        setSource({ type: "direct", url: rawUrl });
      }
    });

    socket.on("video-sync", ({ action, currentTime }: { action: string; currentTime: number }) => {
      const v = videoRef.current;
      if (!v) return;
      isSyncing.current = true;
      if (currentTime !== undefined) v.currentTime = currentTime;
      if (action === "play") v.play().catch(() => {});
      if (action === "pause") v.pause();
      setTimeout(() => { isSyncing.current = false; }, 600);
    });

    return () => {
      socket.off("video-url");
      socket.off("video-sync");
    };
  }, []);

  // Set up HLS playback on the video element if needed
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source || source.type !== "direct") return;

    const isHls = source.url.includes(".m3u8");

    // Clean up previous HLS instance if any
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hls.loadSource(source.url);
        hls.attachMedia(video);
        hlsRef.current = hls;
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Native HLS for Safari/iOS
        video.src = source.url;
      }
    } else {
      // Direct MP4 / WebM
      video.src = source.url;
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [source]);

  const emitSync = useCallback((action: string) => {
    if (isSyncing.current || !videoRef.current) return;
    socket.emit("video-sync", {
      roomId,
      action,
      currentTime: videoRef.current.currentTime,
    });
  }, [roomId]);

  const ytId = source && source.type === "direct" ? getYoutubeId(source.url) : null;

  return (
    <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col transition-all duration-300">
      {/* Player Area */}
      <div className="flex-1 relative flex items-center justify-center">
        {isResolving ? (
          <div className="flex flex-col items-center gap-4 text-white">
            <div className="w-12 h-12 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-semibold tracking-wide text-indigo-300">Film sayfası ayrıştırılıyor, lütfen bekleyin...</p>
            <p className="text-xs text-white/40">Sayfa içerisindeki en kaliteli video akışı aranıyor.</p>
          </div>
        ) : !source ? (
          <div className="flex flex-col items-center justify-center h-full gap-5 p-6 w-full max-w-lg">
            <div className="text-6xl animate-bounce">🎬</div>
            <h3 className="text-xl font-bold text-white tracking-wide">Watch Together Sinema Modu</h3>
            <p className="text-white/60 text-center text-sm leading-relaxed">
              Google üzerinden açtığınız herhangi bir film/dizi izleme sayfasının linkini, YouTube videosunu veya doğrudan video (.mp4/.m3u8) linkini aşağıya yapıştırın.
            </p>
            <div className="flex gap-2 w-full mt-2">
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submitUrl(inputVal)}
                placeholder="Örn: https://hdfilmcehennemi... veya https://youtube.com..."
                className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-5 py-3 text-white text-sm outline-none focus:border-indigo-400 placeholder:text-white/30 transition-all"
              />
              <button onClick={() => submitUrl(inputVal)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-6 py-3 rounded-2xl text-sm font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95">
                Oynat
              </button>
            </div>
            {resolveError && (
              <p className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2 mt-2">{resolveError}</p>
            )}
            <p className="text-white/30 text-xs text-center leading-relaxed">
              💡 Sistem, pasted sayfayı otomatik tarayarak içerisindeki gerçek video akışını (.m3u8 / .mp4) bulur ve her iki tarafta <b>%100 sesli ve senkronize</b> başlatır!
            </p>
          </div>
        ) : ytId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
            className="w-full h-full border-none shadow-2xl"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : source.type === "iframe" ? (
          <iframe
            src={source.url}
            className="w-full h-full border-none shadow-2xl"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-contain"
            onPlay={() => emitSync("play")}
            onPause={() => emitSync("pause")}
            onSeeked={() => emitSync("seek")}
          />
        )}
      </div>

      {/* Control bar to change stream */}
      {source && !isResolving && (
        <div className="flex flex-col md:flex-row items-center gap-3 p-3 bg-zinc-900/90 border-t border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs text-white/50 w-full md:w-auto">
            <span className="bg-green-500/20 border border-green-500/30 text-green-400 px-2.5 py-1 rounded-full font-bold">
              {source.type === "direct" ? "SENKRONİZE MOD (SES+VİDEO)" : "YERLEŞİK PLAYER MODU"}
            </span>
          </div>
          <div className="flex gap-2 w-full md:flex-1">
            <input
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitUrl(inputVal)}
              placeholder="Yeni film, dizi veya YouTube linki yapıştır..."
              className="flex-1 bg-white/15 border border-white/10 rounded-xl px-4 py-2 text-white text-xs outline-none focus:border-indigo-400 placeholder:text-white/30 transition-all"
            />
            <button onClick={() => submitUrl(inputVal)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-lg shadow-indigo-500/10 transition-all active:scale-95">
              Değiştir
            </button>
          </div>
        </div>
      )}

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 bg-black/60 hover:bg-black/80 text-white w-9 h-9 rounded-full flex items-center justify-center text-lg backdrop-blur-md border border-white/15 shadow-xl transition-all active:scale-90"
      >
        ✕
      </button>
    </div>
  );
}
