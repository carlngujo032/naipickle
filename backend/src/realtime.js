import { Server } from "socket.io";

let io = null;

// Attach Socket.io to the HTTP server. Clients join a "room:<CODE>" channel
// and get a tiny "room:update" ping whenever anything in that room changes.
// The ping carries no data — clients simply re-fetch the room state, so the
// existing GET endpoints stay the single source of truth.
export function initRealtime(httpServer, corsOrigin = "*") {
  io = new Server(httpServer, { cors: { origin: corsOrigin } });

  io.on("connection", (socket) => {
    socket.on("room:join", (code) => {
      if (typeof code === "string" && code.length > 0 && code.length <= 8) {
        socket.join(`room:${code}`);
      }
    });
    socket.on("room:leave", (code) => {
      if (typeof code === "string") socket.leave(`room:${code}`);
    });
  });

  return io;
}

export function notifyRoom(code) {
  if (io) io.to(`room:${code}`).emit("room:update");
}
