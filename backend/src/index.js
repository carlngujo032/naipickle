import "dotenv/config";
import express from "express";
import cors from "cors";
import roomsRouter from "./routes/rooms.js";
import playersRouter from "./routes/players.js";
import matchesRouter from "./routes/matches.js";

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
app.use(express.json());

app.get("/", (req, res) => res.json({ ok: true, service: "pickleball-open-play-api" }));

app.use("/api/rooms", roomsRouter);
app.use("/api/rooms/:code/players", playersRouter);
app.use("/api/rooms/:code", matchesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🥒 Pickleball API running on port ${PORT}`));
