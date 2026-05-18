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

// Real-Time Google/DuckDuckGo Search Scraper
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing q parameter" });
  }

  try {
    console.log(`[Search Resolver] Searching for: ${query}`);
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch results from search engine`);
    }

    const html = await response.text();
    const regex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const results = [];
    let match;

    while ((match = regex.exec(html)) !== null) {
      let rawUrl = match[1];
      if (rawUrl.includes("uddg=")) {
        const fullUrlStr = rawUrl.startsWith("//") ? "https:" + rawUrl : "https://duckduckgo.com" + rawUrl;
        const u = new URL(fullUrlStr);
        rawUrl = decodeURIComponent(u.searchParams.get("uddg") || "");
      }

      const title = match[2].replace(/<[^>]*>/g, "").trim();
      
      // Extract snippet
      const postHtml = html.slice(regex.lastIndex, regex.lastIndex + 1200);
      const snippetMatch = postHtml.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i);
      const snippet = snippetMatch ? snippetMatch[1].replace(/<[^>]*>/g, "").trim() : "";

      if (rawUrl.startsWith("http")) {
        results.push({ title, url: rawUrl, snippet });
      }
    }

    return res.json(results.slice(0, 10));
  } catch (error) {
    console.error("[Search Resolver] Error:", error);
    return res.status(500).json({ error: "Arama sırasında bir sunucu hatası oluştu." });
  }
});

// Real-Time Web Proxy for Interactive Co-Browsing
app.get("/api/proxy", async (req, res) => {
  let targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== "string") {
    return res.status(400).send("Gecersiz veya eksik URL parametresi.");
  }

  // Set default scheme if missing
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = "https://" + targetUrl;
  }

  // Reconstruct query string by appending all other incoming query parameters to the target URL
  try {
    const urlObj = new URL(targetUrl);
    Object.keys(req.query).forEach(key => {
      if (key !== "url") {
        urlObj.searchParams.set(key, req.query[key]);
      }
    });
    targetUrl = urlObj.href;
  } catch (e) {
    console.error("[Web Proxy] Failed to parse target url for query reconstruction:", e);
  }

  try {
    console.log(`[Web Proxy] Loading target: ${targetUrl}`);
    const response = await fetch(targetUrl, {
      headers: {
        // High fidelity iPhone mobile user agent so Google and video sites load beautifully tailored for touch & mobile!
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
      }
    });

    const html = await response.text();

    // Remove CSP and X-Frame-Options tags inside the HTML to bypass iframe blocking completely
    let cleanedHtml = html.replace(/<meta[^>]*http-equiv="?content-security-policy"?[^>]*>/gi, "");
    cleanedHtml = cleanedHtml.replace(/<meta[^>]*http-equiv="?x-frame-options"?[^>]*>/gi, "");

    // Inject base href tag so that images, stylesheets, scripts and fonts load directly from original server
    const urlObj = new URL(targetUrl);
    const baseTag = `<base href="${urlObj.protocol}//${urlObj.host}${urlObj.pathname}">`;

    if (cleanedHtml.includes("<head>")) {
      cleanedHtml = cleanedHtml.replace("<head>", `<head>${baseTag}`);
    } else if (cleanedHtml.includes("<html>")) {
      cleanedHtml = cleanedHtml.replace("<html>", `<html><head>${baseTag}</head>`);
    } else {
      cleanedHtml = baseTag + cleanedHtml;
    }

    // Server-Side URL Rewriter: Intercept links, forms, and inner iframes before they reach the user
    const absoluteProxyBase = `${req.protocol}://${req.get("host")}/api/proxy`;
    let rewrittenHtml = cleanedHtml;

    // 1. Rewrite <a href="..."> links
    rewrittenHtml = rewrittenHtml.replace(/(<a\s+[^>]*href=["'])([^"']*)(["'])/gi, (match, prefix, link, suffix) => {
      if (!link || link.startsWith("#") || link.startsWith("javascript:") || link.startsWith("mailto:") || link.startsWith("tel:")) return match;
      try {
        const absoluteUrl = new URL(link, targetUrl).href;
        return `${prefix}${absoluteProxyBase}?url=${encodeURIComponent(absoluteUrl)}${suffix}`;
      } catch (e) {
        return match;
      }
    });

    // 2. Rewrite <form action="..."> submissions
    rewrittenHtml = rewrittenHtml.replace(/(<form\s+[^>]*action=["'])([^"']*)(["'])/gi, (match, prefix, link, suffix) => {
      try {
        const absoluteUrl = new URL(link || "", targetUrl).href;
        return `${prefix}${absoluteProxyBase}?url=${encodeURIComponent(absoluteUrl)}${suffix}`;
      } catch (e) {
        return match;
      }
    });

    // 3. Rewrite <iframe src="..."> embedded video players/links to ensure they are also fully proxied
    rewrittenHtml = rewrittenHtml.replace(/(<iframe\s+[^>]*src=["'])([^"']*)(["'])/gi, (match, prefix, link, suffix) => {
      if (!link || link.startsWith("javascript:")) return match;
      try {
        const absoluteUrl = new URL(link, targetUrl).href;
        return `${prefix}${absoluteProxyBase}?url=${encodeURIComponent(absoluteUrl)}${suffix}`;
      } catch (e) {
        return match;
      }
    });

    // Injected navigation, scrolling, and HTML5 video synchronization script
    const syncScript = `
      <script>
        (function() {
          console.log("[Co-Browsing Proxy] Injected synchronization scripts.");

          // Intercept window.open popups to redirect inside our frame
          window.open = function(url) {
            if (url) {
              try {
                var absolute = new URL(url, window.location.href).href;
                window.parent.postMessage({ type: 'iframe-navigate', url: absolute }, '*');
              } catch(e) {}
            }
            return null;
          };

          // Sync Scroll events
          var isSyncingScroll = false;
          window.addEventListener('scroll', function() {
            if (isSyncingScroll) return;
            window.parent.postMessage({
              type: 'iframe-scroll',
              scrollX: window.scrollX,
              scrollY: window.scrollY
            }, '*');
          });

          // Sync HTML5 Video controls inside target site
          var syncingVideo = false;
          setInterval(function() {
            var videos = document.querySelectorAll('video');
            videos.forEach(function(vid) {
              if (!vid.dataset.hasSync) {
                vid.dataset.hasSync = 'true';
                
                vid.addEventListener('play', function() {
                  if (syncingVideo) return;
                  window.parent.postMessage({ type: 'iframe-video', action: 'play', time: vid.currentTime }, '*');
                });
                
                vid.addEventListener('pause', function() {
                  if (syncingVideo) return;
                  window.parent.postMessage({ type: 'iframe-video', action: 'pause', time: vid.currentTime }, '*');
                });
                
                vid.addEventListener('seeked', function() {
                  if (syncingVideo) return;
                  window.parent.postMessage({ type: 'iframe-video', action: 'seek', time: vid.currentTime }, '*');
                });
              }
            });
          }, 1000);

          // Listen to synchronization events from parent
          window.addEventListener('message', function(e) {
            if (!e.data || typeof e.data !== 'object') return;

            if (e.data.type === 'sync-scroll') {
              isSyncingScroll = true;
              window.scrollTo(e.data.scrollX, e.data.scrollY);
              setTimeout(function() { isSyncingScroll = false; }, 80);
            }

            if (e.data.type === 'sync-video') {
              var videos = document.querySelectorAll('video');
              videos.forEach(function(vid) {
                syncingVideo = true;
                vid.currentTime = e.data.time;
                if (e.data.action === 'play') {
                  vid.play().catch(function(){});
                } else if (e.data.action === 'pause') {
                  vid.pause();
                }
                setTimeout(function() { syncingVideo = false; }, 150);
              });
            }
          });
        })();
      </script>
    `;

    let finalHtml = rewrittenHtml;
    if (finalHtml.includes("</body>")) {
      finalHtml = finalHtml.replace("</body>", `${syncScript}</body>`);
    } else {
      finalHtml = finalHtml + syncScript;
    }

    // Set mobile responsive & secure headers
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.removeHeader("X-Frame-Options");
    res.removeHeader("Content-Security-Policy");
    return res.send(finalHtml);

  } catch (error) {
    console.error(`[Web Proxy] Error proxying ${targetUrl}:`, error);
    return res.status(500).send(`
      <html>
        <body style="background:#0f0f11;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:20px;">
            <h3 style="color:#ef4444;margin-bottom:8px;">Sayfa Yüklenemedi</h3>
            <p style="color:#a1a1aa;font-size:13px;margin-bottom:16px;">Girdiğiniz adres veya Google arama sayfası yüklenemedi.</p>
            <p style="color:#52525b;font-size:11px;margin-bottom:8px;">URL: ${targetUrl}</p>
            <p style="color:#ef4444;font-size:11px;font-family:monospace;background:#27272a;padding:8px;border-radius:4px;">Error: ${error.message || String(error)}</p>
          </div>
        </body>
      </html>
    `);
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

  socket.on("browser-navigate", ({ roomId, url }) => {
    console.log(`[Socket] browser-navigate: ${url}`);
    socket.to(roomId).emit("browser-navigate", { url });
  });

  socket.on("browser-scroll", ({ roomId, scrollX, scrollY }) => {
    socket.to(roomId).emit("browser-scroll", { scrollX, scrollY });
  });

  socket.on("browser-video", ({ roomId, action, time }) => {
    console.log(`[Socket] browser-video: ${action} at ${time}`);
    socket.to(roomId).emit("browser-video", { action, time });
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
