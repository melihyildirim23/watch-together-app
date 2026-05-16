"use strict";

const express = require("express");
const http    = require("http");
const { Server } = require("socket.io");
const cors    = require("cors");

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const PORT        = process.env.PORT || 5000;          // Render sets PORT=10000
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";    // Set to your Vercel URL

// ---------------------------------------------------------------------------
// Express + HTTP
// ---------------------------------------------------------------------------
const app = express();

app.use(cors({ origin: CORS_ORIGIN, methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json());

// Health-check endpoint — Render pings this to verify the service is alive
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Socket.IO
// ---------------------------------------------------------------------------
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
  // Allow polling as fallback in case WebSocket upgrade fails on Render's proxy
  transports: ["websocket", "polling"],
  pingTimeout:  60000,
  pingInterval: 25000,
});

// ---------------------------------------------------------------------------
// Room state  { roomId: Set<socketId> }
// ---------------------------------------------------------------------------
const rooms = {};

// Helper: clean a socket out of every room it occupies
function removeFromRooms(socketId) {
  for (const roomId of Object.keys(rooms)) {
    const set = rooms[roomId];
    if (!set.has(socketId)) continue;

    set.delete(socketId);
    // Notify remaining peer
    io.to(roomId).emit("peer-disconnected");
    io.to(roomId).emit("users-in-room", [...set]);

    if (set.size === 0) delete rooms[roomId];
  }
}

// ---------------------------------------------------------------------------
// Connection handler
// ---------------------------------------------------------------------------
io.on("connection", (socket) => {
  console.log(`[Server] Connected  ${socket.id}`);

  // ── JOIN ROOM ────────────────────────────────────────────────────────────
  socket.on("join-room", (roomId) => {
    if (typeof roomId !== "string" || !roomId.trim()) return;

    if (!rooms[roomId]) rooms[roomId] = new Set();
    const room = rooms[roomId];

    // Already in this room — ignore duplicate join-room emits
    if (room.has(socket.id)) {
      console.log(`[Server] ${socket.id} already in ${roomId} — skipping`);
      return;
    }

    // Hard cap: 2 users per room
    if (room.size >= 2) {
      socket.emit("room-full");
      console.log(`[Server] ${socket.id} rejected from ${roomId} (full)`);
      return;
    }

    room.add(socket.id);
    socket.join(roomId);
    // Store which room this socket is in so disconnect can clean up fast
    socket.data.roomId = roomId;

    console.log(`[Server] ${socket.id} joined ${roomId}  (${room.size}/2)`);
    io.to(roomId).emit("users-in-room", [...room]);

    // Only the 2nd joiner becomes the WebRTC initiator
    if (room.size === 2) {
      console.log(`[Server] Room ${roomId} is ready — sending "ready" to ${socket.id}`);
      socket.emit("ready");
    }
  });

  // ── WEBRTC SIGNALING ──────────────────────────────────────────────────────
  socket.on("offer", ({ roomId, sdp }) => {
    console.log(`[Server] offer  ${socket.id} → ${roomId}`);
    socket.to(roomId).emit("offer", { sdp });
  });

  socket.on("answer", ({ roomId, sdp }) => {
    console.log(`[Server] answer ${socket.id} → ${roomId}`);
    socket.to(roomId).emit("answer", { sdp });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  // ── DISCONNECT ────────────────────────────────────────────────────────────
  socket.on("disconnect", (reason) => {
    console.log(`[Server] Disconnected ${socket.id}  reason=${reason}`);
    removeFromRooms(socket.id);
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
server.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}  CORS_ORIGIN=${CORS_ORIGIN}`);
});