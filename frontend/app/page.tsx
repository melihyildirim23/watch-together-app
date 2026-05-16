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
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute top-0 left-0 w-full h-full object-cover opacity-40"
      >
        <source src="/background.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div className="relative z-10 flex h-full flex-col items-center justify-center text-white px-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-4">Watch Together</h1>

        <p className="text-zinc-300 text-center max-w-xl mb-10 text-lg">
          Watch movies, series and videos together with ultra low latency screen sharing, voice and webcam communication.
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={createRoom}
            className="px-8 py-4 rounded-2xl bg-white text-black font-semibold hover:scale-105 transition-all duration-300"
          >
            Create Room
          </button>

          <button
            onClick={joinRoom}
            className="px-8 py-4 rounded-2xl border border-white/30 bg-white/10 backdrop-blur-md hover:bg-white/20 transition-all duration-300"
          >
            Join Room
          </button>
        </div>
      </div>
    </main>
  );
}
