"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const createRoom = () => {
    const roomId = Math.random().toString(36).substring(2, 8);
    router.push(`/room/${roomId}`);
  };

  const joinRoom = () => {
    const roomId = typeof window !== "undefined" && typeof window.prompt === "function"
      ? window.prompt("Enter Room ID")
      : null;

    if (roomId) {
      router.push(`/room/${roomId}`);
    }
  };

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Background video */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover opacity-40"
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      {/* Dark overlay with blur */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />

      {/* Dynamic Island-style status pill */}
      <div
        style={{
          position: "absolute",
          top: "18px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 20,
          background: "#000",
          borderRadius: "999px",
          width: "120px",
          height: "34px",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.8)",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center text-white px-6">

        {/* iOS-style frosted glass card */}
        <div
          style={{
            background: "rgba(28, 28, 30, 0.72)",
            backdropFilter: "blur(40px) saturate(180%)",
            WebkitBackdropFilter: "blur(40px) saturate(180%)",
            borderRadius: "28px",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 8px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
            padding: "48px 40px 44px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "360px",
            width: "100%",
          }}
        >
          {/* Accent glow dot */}
          <div
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              boxShadow: "0 0 16px 4px rgba(167,139,250,0.5)",
              marginBottom: "20px",
            }}
          />

          <h1
            style={{
              fontSize: "clamp(2rem, 8vw, 2.75rem)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              textAlign: "center",
              marginBottom: "12px",
              background: "linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.75) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            À Deux, Sempre
          </h1>

          <p
            style={{
              color: "rgba(235,235,245,0.5)",
              textAlign: "center",
              fontSize: "14px",
              lineHeight: 1.5,
              marginBottom: "36px",
              maxWidth: "260px",
            }}
          >
            Watch movies, series and videos together with ultra low latency.
          </p>

          {/* iOS pill buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
            <button
              onClick={createRoom}
              style={{
                width: "100%",
                padding: "15px 0",
                borderRadius: "999px",
                background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
                color: "#fff",
                fontWeight: 600,
                fontSize: "16px",
                letterSpacing: "-0.01em",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(167,139,250,0.4)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(167,139,250,0.55)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(167,139,250,0.4)";
              }}
            >
              Create Room
            </button>

            <button
              onClick={joinRoom}
              style={{
                width: "100%",
                padding: "15px 0",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.08)",
                color: "rgba(235,235,245,0.85)",
                fontWeight: 600,
                fontSize: "16px",
                letterSpacing: "-0.01em",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                transition: "transform 0.15s ease, background 0.15s ease",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.03)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.08)";
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
            background: "rgba(255,255,255,0.35)",
          }}
        />
      </div>
    </main>
  );
}
