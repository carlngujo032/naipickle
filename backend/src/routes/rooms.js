import { Router } from "express";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { query } from "../db.js";

const router = Router();
const genCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const genToken = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);

// Middleware: verify host token for a room (admin-only actions)
async function requireHost(req, res, next) {
  const { code } = req.params;
  const token = req.headers["x-host-token"];
  const { rows } = await query("SELECT * FROM rooms WHERE code = $1", [code]);
  if (!rows[0]) return res.status(404).json({ error: "Room not found" });
  if (!token || token !== rows[0].host_token) {
    return res.status(403).json({ error: "Host token required" });
  }
  req.room = rows[0];
  next();
}

// POST /api/rooms — create a room
router.post("/", async (req, res) => {
  try {
    const { title, password, maxPlayers = 24, maxCourts = 4 } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });

    const code = genCode();
    const hostToken = genToken();
    const passwordHash = password ? await bcrypt.hash(password, 8) : null;

    const { rows } = await query(
      `INSERT INTO rooms (code, title, password_hash, host_token, max_players, max_courts)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, code, title, max_players, max_courts, status, created_at`,
      [code, title, passwordHash, hostToken, maxPlayers, maxCourts]
    );

    // create courts
    const courtInserts = [];
    for (let i = 1; i <= maxCourts; i++) {
      courtInserts.push(query(
        "INSERT INTO courts (room_id, court_number) VALUES ($1, $2)",
        [rows[0].id, i]
      ));
    }
    await Promise.all(courtInserts);

    res.status(201).json({ room: rows[0], hostToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create room" });
  }
});

// POST /api/rooms/:code/verify — check password before joining
router.post("/:code/verify", async (req, res) => {
  const { code } = req.params;
  const { password } = req.body;
  const { rows } = await query("SELECT * FROM rooms WHERE code = $1", [code]);
  if (!rows[0]) return res.status(404).json({ error: "Room not found" });
  const room = rows[0];
  if (room.password_hash) {
    const ok = password && (await bcrypt.compare(password, room.password_hash));
    if (!ok) return res.status(401).json({ error: "Incorrect password" });
  }
  res.json({ ok: true, room: { code: room.code, title: room.title } });
});

// GET /api/rooms/:code — full room state (players, queue, courts, matches)
router.get("/:code", async (req, res) => {
  const { code } = req.params;
  const { rows: roomRows } = await query("SELECT * FROM rooms WHERE code = $1", [code]);
  if (!roomRows[0]) return res.status(404).json({ error: "Room not found" });
  const room = roomRows[0];

  const { rows: players } = await query(
    `SELECT * FROM players WHERE room_id = $1
     ORDER BY games_played ASC, last_played_at ASC NULLS FIRST, joined_at ASC`,
    [room.id]
  );
  const { rows: courts } = await query(
    "SELECT * FROM courts WHERE room_id = $1 ORDER BY court_number ASC",
    [room.id]
  );
  const { rows: activeMatches } = await query(
    "SELECT * FROM matches WHERE room_id = $1 AND status = 'in_progress'",
    [room.id]
  );

  delete room.password_hash;
  delete room.host_token;

  res.json({
    room,
    players,
    queue: players.filter((p) => p.status === "waiting"),
    courts,
    activeMatches,
  });
});

// PATCH /api/rooms/:code — update room (host only): close/reopen, lock, etc.
router.patch("/:code", requireHost, async (req, res) => {
  const { status, title, maxPlayers } = req.body;
  const fields = [];
  const values = [];
  let i = 1;
  if (status) { fields.push(`status = $${i++}`); values.push(status); }
  if (title) { fields.push(`title = $${i++}`); values.push(title); }
  if (maxPlayers) { fields.push(`max_players = $${i++}`); values.push(maxPlayers); }
  if (!fields.length) return res.status(400).json({ error: "Nothing to update" });
  values.push(req.room.id);
  await query(`UPDATE rooms SET ${fields.join(", ")} WHERE id = $${i}`, values);
  res.json({ ok: true });
});

export { requireHost };
export default router;
