"use strict";

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 5000;          // Render sets PORT=10000
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";    // Set to your Vercel URL

// ---------------------------------------------------------------------------
// Express + HTTP
// ---------------------------------------------------------------------------
const app = express();

app.use(cors({ origin: CORS_ORIGIN, methods: ["GET", "POST", "OPTIONS"] }));
app.use(express.json());

// Health-check endpoint — Render pings this to verify the service is alive
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// Universal Video Link Scraper & Stream Resolver
app.get("/api/resolve", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== "string") {
    return res.status(400).json({ error: "Missing url parameter" });
  }

  try {
    console.log(`[Resolver] Attempting to resolve: ${targetUrl}`);

    // If it's already a direct video stream or YouTube, no need to scrape
    const isDirect = /\.(mp4|m3u8|webm)(\?.*)?$/i.test(targetUrl);
    const isYT = /(youtube\.com|youtu\.be)/i.test(targetUrl);
    if (isDirect || isYT) {
      console.log(`[Resolver] Direct video or YouTube detected instantly: ${targetUrl}`);
      return res.json({ type: "direct", url: targetUrl });
    }

    // Fetch the target webpage with full desktop browser headers
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": targetUrl
      },
      redirect: "follow"
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Siteye ulaşılamadı (Status: ${response.status})` });
    }

    const html = await response.text();

    // 1. Direct stream match (.m3u8, .mp4, .webm) inside page scripts/tags
    const streamRegex = /(https?:\/\/[^\s"'`<>]+?\.(?:mp4|m3u8|webm)(?:\?[^\s"'`<>]*)?)/gi;
    const directMatches = [];
    let match;
    while ((match = streamRegex.exec(html)) !== null) {
      const cleanUrl = match[1].replace(/\\/g, "");
      if (!directMatches.includes(cleanUrl)) {
        directMatches.push(cleanUrl);
      }
    }

    // Filter to find the best HLS or MP4 stream
    let bestDirect = directMatches.find(u => u.includes(".m3u8") || u.includes(".mp4"));
    if (bestDirect) {
      console.log(`[Resolver] Found direct stream in base page source: ${bestDirect}`);
      return res.json({ type: "direct", url: bestDirect });
    }

    // 2. Scan for iframe players (Vidsrc, Mixdrop, Streamtape, Fembed, etc.)
    const iframeRegex = /<iframe[^>]+src=["'](https?:\/\/[^\s"'<>]+?)["']/gi;
    const iframes = [];
    while ((match = iframeRegex.exec(html)) !== null) {
      const cleanIframe = match[1].replace(/\\/g, "");
      if (!iframes.includes(cleanIframe)) {
        iframes.push(cleanIframe);
      }
    }

    console.log(`[Resolver] Found iframes to scan: ${iframes.length}`);

    // Scan each promising iframe for hidden video streams
    for (const iframeUrl of iframes) {
      // Exclude common tracking, advertising or non-video iframes
      if (
        /google|facebook|disqus|ads|twitter|yandex|analytics|doubleclick/i.test(iframeUrl)
      ) {
        continue;
      }

      try {
        console.log(`[Resolver] Inspecting player iframe: ${iframeUrl}`);
        const iframeRes = await fetch(iframeUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": targetUrl
          },
          redirect: "follow"
        });

        if (iframeRes.ok) {
          const iframeHtml = await iframeRes.text();
          const iframeMatches = [];
          while ((match = streamRegex.exec(iframeHtml)) !== null) {
            const cleanUrl = match[1].replace(/\\/g, "");
            if (!iframeMatches.includes(cleanUrl)) {
              iframeMatches.push(cleanUrl);
            }
          }

          const bestIframeDirect = iframeMatches.find(u => u.includes(".m3u8") || u.includes(".mp4"));
          if (bestIframeDirect) {
            console.log(`[Resolver] Successfully resolved direct stream from player iframe: ${bestIframeDirect}`);
            return res.json({ type: "direct", url: bestIframeDirect });
          }
        }
      } catch (err) {
        console.warn(`[Resolver] Failed to parse player iframe ${iframeUrl}:`, err);
      }
    }

    // 3. Fallback: If we couldn't parse a direct stream, try to embed the movie iframe itself
    const goodIframe = iframes.find(u => 
      !/google|facebook|disqus|ads|twitter|yandex|analytics|doubleclick/i.test(u)
    );

    if (goodIframe) {
      console.log(`[Resolver] No direct stream found, falling back to iframe embed: ${goodIframe}`);
      return res.json({ type: "iframe", url: goodIframe });
    }

    // 4. Ultimate Fallback: Just return the URL itself
    console.log(`[Resolver] Resolution failed completely. Returning target url directly.`);
    return res.json({ type: "direct", url: targetUrl });

  } catch (error) {
    console.error(`[Resolver] Scraping error:`, error);
    return res.status(500).json({ error: "Film sayfası ayrıştırılamadı. Lütfen geçerli bir film veya video linki girin." });
  }
});

const server = http.createServer(app);

// ---------------------------------------------------------------------------
// Socket.IO
// ---------------------------------------------------------------------------
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
  // Allow polling as fallback in case WebSocket upgrade fails on Render's proxy
  transports: ["websocket", "polling"],
  pingTimeout: 60000,
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

    // Deterministic Peer setup trigger
    // Since clients only emit 'join-room' AFTER their media and listeners are fully ready,
    // we can safely emit 'peer-ready' instantly without any artificial delays.
    if (room.size === 2) {
      console.log(`[Server] Room ${roomId} reached 2 users. Emitting "peer-ready" immediately.`);
      io.to(roomId).emit("peer-ready", { initiatorId: socket.id });
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

  socket.on("reaction", (payload) => {
    const { roomId, ...rest } = payload;
    socket.to(roomId).emit("reaction", rest);
  });

  socket.on("video-url", ({ roomId, url }) => {
    socket.to(roomId).emit("video-url", { url });
  });

  socket.on("video-sync", ({ roomId, action, currentTime }) => {
    socket.to(roomId).emit("video-sync", { action, currentTime });
  });

  socket.on("screen-share-state", ({ roomId, active }) => {
    socket.to(roomId).emit("screen-share-state", { active });
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
