import { Router } from "express";
import { query } from "../db.js";
import { requireHost } from "./rooms.js";

const router = Router({ mergeParams: true });

async function getRoomByCode(code) {
  const { rows } = await query("SELECT * FROM rooms WHERE code = $1", [code]);
  return rows[0];
}

// POST /api/rooms/:code/players — self-join OR host adding a walk-in
router.post("/", async (req, res) => {
  const { code } = req.params;
  const { name, skillLevel = 3.0 } = req.body;
  if (!name) return res.status(400).json({ error: "Name is required" });

  const room = await getRoomByCode(code);
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.status !== "open") return res.status(400).json({ error: "Room is not accepting players" });

  const { rows: countRows } = await query(
    "SELECT COUNT(*) FROM players WHERE room_id = $1 AND status != 'inactive'",
    [room.id]
  );
  if (Number(countRows[0].count) >= room.max_players) {
    return res.status(400).json({ error: "Room is full" });
  }

  const { rows } = await query(
    `INSERT INTO players (room_id, name, skill_level) VALUES ($1, $2, $3) RETURNING *`,
    [room.id, name, skillLevel]
  );
  res.status(201).json({ player: rows[0] });
});

// DELETE /api/rooms/:code/players/:playerId — host removes a player
router.delete("/:playerId", requireHost, async (req, res) => {
  const { playerId } = req.params;
  await query("DELETE FROM players WHERE id = $1 AND room_id = $2", [playerId, req.room.id]);
  res.json({ ok: true });
});

// PATCH /api/rooms/:code/players/:playerId — host edits status/skill (e.g. mark inactive)
router.patch("/:playerId", requireHost, async (req, res) => {
  const { playerId } = req.params;
  const { status, skillLevel } = req.body;
  const fields = [];
  const values = [];
  let i = 1;
  if (status) { fields.push(`status = $${i++}`); values.push(status); }
  if (skillLevel !== undefined) { fields.push(`skill_level = $${i++}`); values.push(skillLevel); }
  if (!fields.length) return res.status(400).json({ error: "Nothing to update" });
  values.push(playerId, req.room.id);
  await query(
    `UPDATE players SET ${fields.join(", ")} WHERE id = $${i} AND room_id = $${i + 1}`,
    values
  );
  res.json({ ok: true });
});

// GET /api/rooms/:code/players/leaderboard — top players by wins / win rate
router.get("/leaderboard", async (req, res) => {
  const { code } = req.params;
  const room = await getRoomByCode(code);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const { rows } = await query(
    `SELECT id, name, games_played, wins, losses, points_for, points_against,
            CASE WHEN games_played > 0 THEN ROUND(wins::numeric / games_played, 3) ELSE 0 END AS win_rate
     FROM players
     WHERE room_id = $1 AND games_played > 0
     ORDER BY win_rate DESC, wins DESC, points_for DESC
     LIMIT 20`,
    [room.id]
  );
  res.json({ leaderboard: rows });
});

export default router;
