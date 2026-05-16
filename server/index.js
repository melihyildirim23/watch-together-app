const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ODA STATE
const rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // =========================
  // JOIN ROOM
  // =========================
  socket.on("join-room", (roomId) => {
    if (!rooms[roomId]) {
      rooms[roomId] = [];
    }

    // 🔥 aynı kullanıcıyı 2 kere ekleme FIX
    if (rooms[roomId].includes(socket.id)) {
      return;
    }

    // 🔥 max 2 kişi
    if (rooms[roomId].length >= 2) {
      socket.emit("room-full");
      return;
    }

    rooms[roomId].push(socket.id);
    socket.join(roomId);

    console.log(`${socket.id} joined ${roomId}`);

    // oda bilgisi gönder
    io.to(roomId).emit("users-in-room", rooms[roomId]);

    // 2 kişi olunca ready sinyali
    // 🔥 Sadece son katılan kişiyi initiator yapıyoruz (çifte peer oluşumunu engeller)
    if (rooms[roomId].length === 2) {
      socket.emit("ready");
    }
  });

  // =========================
  // WEBRTC SIGNALING
  // =========================

  socket.on("offer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("offer", { sdp });
  });

  socket.on("answer", ({ roomId, sdp }) => {
    socket.to(roomId).emit("answer", { sdp });
  });

  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", {
      candidate,
      sender: socket.id,
    });
  });

  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    for (const roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(
        (id) => id !== socket.id
      );

      io.to(roomId).emit("users-in-room", rooms[roomId]);

      // boş oda temizle
      if (rooms[roomId].length === 0) {
        delete rooms[roomId];
      }
    }
  });
});

// =========================
// START SERVER
// =========================
server.listen(5000, () => {
  console.log("Server running on port 5000");
});