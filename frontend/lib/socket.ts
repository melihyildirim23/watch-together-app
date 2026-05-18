import { io } from "socket.io-client";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  // Allow polling as a fallback in case WebSocket upgrade fails (Render proxy)
  transports: ["websocket", "polling"],
  // Don't auto-connect on import; the hook controls connection lifetime
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});