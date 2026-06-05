"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.18;

    const tryPlay = () => {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    };

    tryPlay();
    document.addEventListener("click", tryPlay, { once: true });
    document.addEventListener("keydown", tryPlay, { once: true });

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      document.removeEventListener("click", tryPlay);
      document.removeEventListener("keydown", tryPlay);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8);
    router.push(`/room/${roomId}`);
  };

  const joinRoom = () => {
    const roomId =
      typeof window !== "undefined" && typeof window.prompt === "function"
        ? window.prompt("Enter Room ID")
        : null;
    if (roomId) {
      router.push(`/room/${roomId}`);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Looping background music */}
      <audio ref={audioRef} loop src="/music.mp3" />

      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.6,
          filter: "blur(1px)",
        }}
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      {/* Very subtle dark veil */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.28)",
        }}
      />

      {/* Music toggle button — top right */}
      <button
        onClick={toggleMusic}
        title={isPlaying ? "Müziği Durdur" : "Müziği Çal"}
        style={{
          position: "absolute",
          top: "20px",
          right: "20px",
          zIndex: 30,
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.10)",
          border: "1px solid rgba(255,255,255,0.18)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: "rgba(255,255,255,0.85)",
          transition: "background 0.15s ease, transform 0.15s ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.20)";
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background =
            "rgba(255,255,255,0.10)";
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {isPlaying ? (
          /* Pause icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1.5" />
            <rect x="15" y="4" width="4" height="16" rx="1.5" />
          </svg>
        ) : (
          /* Play icon */
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.14v14l11-7-11-7z" />
          </svg>
        )}
      </button>

      {/* Main content — NO card behind it */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          height: "100%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          padding: "0 24px",
          textAlign: "center",
        }}
      >
        {/* Big title */}
        <h1
          style={{
            fontSize: "clamp(3.5rem, 13vw, 7.5rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            marginBottom: "44px",
            background:
              "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.65) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          À Deux, Sempre
        </h1>

        {/* Side-by-side pill buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "14px",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={createRoom}
            style={{
              padding: "15px 40px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "16px",
              letterSpacing: "-0.01em",
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 24px rgba(167,139,250,0.45)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1.05)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 8px 32px rgba(167,139,250,0.65)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow =
                "0 4px 24px rgba(167,139,250,0.45)";
            }}
          >
            Create Room
          </button>

          <button
            onClick={joinRoom}
            style={{
              padding: "15px 40px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.10)",
              color: "rgba(235,235,245,0.90)",
              fontWeight: 600,
              fontSize: "16px",
              letterSpacing: "-0.01em",
              border: "1px solid rgba(255,255,255,0.22)",
              cursor: "pointer",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              transition: "transform 0.15s ease, background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1.05)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.18)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.transform =
                "scale(1)";
              (e.currentTarget as HTMLButtonElement).style.background =
                "rgba(255,255,255,0.10)";
            }}
          >
            Join Room
          </button>
        </div>
      </div>

      {/* iOS-style home indicator */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "134px",
          height: "5px",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.28)",
        }}
      />
    </main>
  );
}
