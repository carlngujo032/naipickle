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
const corsOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/", (req, res) => res.json({ ok: true, service: "pickleball-open-play-api" }));

// Any successful change to a room (add player, assign match, finish, break,
// end session, ...) pings everyone watching that room so they refresh
// instantly. Reads and the password check don't count as changes.
app.use("/api/rooms/:code", (req, res, next) => {
  const changes = ["POST", "PATCH", "PUT", "DELETE"].includes(req.method);
  if (changes && !req.path.endsWith("/verify")) {
    res.on("finish", () => {
      if (res.statusCode < 400) notifyRoom(req.params.code);
    });
  }
  next();
});

app.use("/api/rooms", roomsRouter);
app.use("/api/rooms/:code/players", playersRouter);
app.use("/api/rooms/:code", matchesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);
initRealtime(server, corsOrigin);

// Make sure an older database has the newer column, so deploying this
// version doesn't require remembering to run `npm run migrate` first.
try {
  await query("ALTER TABLE players ADD COLUMN IF NOT EXISTS player_token VARCHAR(64)");
} catch (err) {
  console.error("Schema check failed:", err.message);
}

server.listen(PORT, () => console.log(`🥒 Pickleball API running on port ${PORT}`));
