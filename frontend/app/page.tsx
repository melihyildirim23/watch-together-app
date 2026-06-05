"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export default function Home() {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    const play = () => {
      audio.play().catch(() => {});
    };
    // Try to autoplay; if blocked, play on first user interaction
    play();
    document.addEventListener("click", play, { once: true });
    document.addEventListener("keydown", play, { once: true });
    return () => {
      document.removeEventListener("click", play);
      document.removeEventListener("keydown", play);
    };
  }, []);

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

      {/* Background video — very low opacity, minimal blur */}
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
          opacity: 0.55,
          filter: "blur(1px)",
        }}
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      {/* Very subtle dark veil — no blur */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.30)",
        }}
      />

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
          gap: "0",
        }}
      >
        {/* Big title */}
        <h1
          style={{
            fontSize: "clamp(3.5rem, 12vw, 7rem)",
            fontWeight: 800,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
            marginBottom: "20px",
            background:
              "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.65) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          À Deux, Sempre
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: "rgba(235,235,245,0.55)",
            fontSize: "clamp(14px, 2vw, 17px)",
            lineHeight: 1.6,
            marginBottom: "44px",
            maxWidth: "480px",
          }}
        >
          Watch movies, series and videos together with ultra low latency.
        </p>

        {/* Side-by-side pill buttons — no background behind them */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "14px",
          }}
        >
          <button
            onClick={createRoom}
            style={{
              padding: "15px 36px",
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
              padding: "15px 36px",
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
          background: "rgba(255,255,255,0.30)",
        }}
      />
    </main>
  );
}
