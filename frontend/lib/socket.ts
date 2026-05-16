import { io } from "socket.io-client";

export const socket = io("https://watch-together-app-ofq0.onrender.com", {
  transports: ["websocket"],
});