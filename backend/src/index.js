import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";

import roomsRouter from "./routes/rooms.js";
import playersRouter from "./routes/players.js";
import matchesRouter from "./routes/matches.js";

import { query } from "./db.js";
import { initRealtime, notifyRoom } from "./realtime.js";

const app = express();

const PORT = process.env.PORT || 4000;
const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/", (req, res) => {
res.json({
ok: true,
service: "pickleball-open-play-api"
});
});

app.get("/api/health", (req, res) => {
res.status(200).json({
ok: true
});
});

app.use("/api/rooms/:code", (req, res, next) => {
  const changes = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);

  if (changes && !req.path.endsWith("/verify")) {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        notifyRoom(req.params.code);
      }
    });
  }

  next();
});

app.use("/api/rooms", roomsRouter);
app.use("/api/rooms/:code/players", playersRouter);
app.use("/api/rooms/:code", matchesRouter);

app.use((err, req, res, next) => {
console.error(err);

res.status(500).json({
error: "Internal server error"
});
});

try {
await query(
"ALTER TABLE players ADD COLUMN IF NOT EXISTS player_token VARCHAR(64)"
);
} catch (err) {
console.error("Schema check failed:", err.message);
}

const server = http.createServer(app);

initRealtime(server, corsOrigin);

server.listen(PORT, "0.0.0.0", () => {
console.log("Pickleball API running on port " + PORT);
});
