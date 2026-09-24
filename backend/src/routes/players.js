import { Router } from "express";
import { query } from "../db.js";
import { customAlphabet } from "nanoid";
import { requireHost } from "./rooms.js";

const router = Router({ mergeParams: true });
const genPlayerToken = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 32);

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
    `INSERT INTO players (room_id, name, skill_level, player_token) VALUES ($1, $2, $3, $4) RETURNING *`,
    [room.id, name, skillLevel, genPlayerToken()]
  );
  res.status(201).json({ player: rows[0] });
});

// DELETE /api/rooms/:code/players/:playerId — host removes a player
// A player who has never been in a match is deleted. Anyone who has (their
// stats are part of the session) is marked 'inactive' instead, so their games
// still count in the leaderboard and the end-of-session summary.
router.delete("/:playerId", requireHost, async (req, res) => {
  try {
    const playerId = Number.parseInt(req.params.playerId, 10);
    if (!Number.isInteger(playerId)) return res.status(400).json({ error: "Invalid player" });

    const { rows } = await query("SELECT status FROM players WHERE id = $1 AND room_id = $2", [
      playerId,
      req.room.id,
    ]);
    if (!rows[0]) return res.status(404).json({ error: "Player not found" });
    if (rows[0].status === "playing") {
      return res.status(400).json({ error: "Player is on court — finish or cancel the match first" });
    }

    const { rows: used } = await query(
      `SELECT 1 FROM matches
       WHERE room_id = $1 AND $2 IN (team1_p1, team1_p2, team2_p1, team2_p2) LIMIT 1`,
      [req.room.id, playerId]
    );
    if (used.length) {
      await query("UPDATE players SET status = 'inactive' WHERE id = $1 AND room_id = $2", [
        playerId,
        req.room.id,
      ]);
      return res.json({ ok: true, removed: false, kept: "stats" });
    }

    await query("DELETE FROM players WHERE id = $1 AND room_id = $2", [playerId, req.room.id]);
    res.json({ ok: true, removed: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove player" });
  }
});

// POST /api/rooms/:code/players/:playerId/break — sit out (or come back).
// body: { onBreak: true | false }
// Allowed for the host, or for the player themself (x-player-token). A player
// on break keeps all their stats but is skipped when matches are assigned.
router.post("/:playerId/break", async (req, res) => {
  try {
    const { code } = req.params;
    const playerId = Number.parseInt(req.params.playerId, 10);
    const { onBreak } = req.body;
    if (!Number.isInteger(playerId)) return res.status(400).json({ error: "Invalid player" });
    if (typeof onBreak !== "boolean") return res.status(400).json({ error: "onBreak must be true or false" });

    const room = await getRoomByCode(code);
    if (!room) return res.status(404).json({ error: "Room not found" });

    const { rows } = await query("SELECT * FROM players WHERE id = $1 AND room_id = $2", [playerId, room.id]);
    const player = rows[0];
    if (!player) return res.status(404).json({ error: "Player not found" });

    const hostToken = req.headers["x-host-token"];
    const playerToken = req.headers["x-player-token"];
    const isHost = Boolean(hostToken) && hostToken === room.host_token;
    const isSelf = Boolean(playerToken) && Boolean(player.player_token) && playerToken === player.player_token;
    if (!isHost && !isSelf) return res.status(403).json({ error: "Only that player or the host can do this" });

    // Conditional updates so a match being assigned at the same moment can't
    // be overwritten: the status must still be what we checked.
    let result;
    if (onBreak) {
      result = await query(
        "UPDATE players SET status = 'break' WHERE id = $1 AND room_id = $2 AND status = 'waiting' RETURNING id",
        [playerId, room.id]
      );
    } else {
      // The host can also bring back someone who was marked inactive
      const from = isHost ? ["break", "inactive"] : ["break"];
      result = await query(
        "UPDATE players SET status = 'waiting' WHERE id = $1 AND room_id = $2 AND status = ANY($3::text[]) RETURNING id",
        [playerId, room.id, from]
      );
    }
    if (result.rows.length) return res.json({ ok: true });

    // Nothing changed — either it's already in the requested state, or it can't be done right now
    const { rows: now } = await query("SELECT status FROM players WHERE id = $1", [playerId]);
    const status = now[0]?.status;
    if (onBreak && status === "break") return res.json({ ok: true });
    if (!onBreak && status === "waiting") return res.json({ ok: true });
    if (status === "playing") {
      return res.status(400).json({ error: "You're on court right now — finish your game first" });
    }
    if (status === "inactive") {
      return res.status(400).json({ error: "This player was removed from the session — ask the host" });
    }
    res.status(400).json({ error: "Can't change break status right now" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update break status" });
  }
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

// GET /api/rooms/:code/players/pairing-progress — how many unique partner
// pairings (teammates, not opponents) have happened vs. how many are possible
// among the currently active players. Useful signal for "has everyone played
// with everyone" so the host knows when to wrap up or start repeating.
router.get("/pairing-progress", async (req, res) => {
  const { code } = req.params;
  const room = await getRoomByCode(code);
  if (!room) return res.status(404).json({ error: "Room not found" });

  const { rows: activePlayers } = await query(
    "SELECT id FROM players WHERE room_id = $1 AND status != 'inactive'",
    [room.id]
  );
  const activeIds = new Set(activePlayers.map((p) => p.id));
  const n = activePlayers.length;
  const totalPossiblePairs = n >= 2 ? (n * (n - 1)) / 2 : 0;

  const { rows: matches } = await query(
    `SELECT team1_p1, team1_p2, team2_p1, team2_p2 FROM matches
     WHERE room_id = $1 AND status = 'finished'`,
    [room.id]
  );

  const playedPairs = new Set();
  for (const m of matches) {
    for (const [a, b] of [
      [m.team1_p1, m.team1_p2],
      [m.team2_p1, m.team2_p2],
    ]) {
      if (activeIds.has(a) && activeIds.has(b)) {
        playedPairs.add([a, b].sort((x, y) => x - y).join("-"));
      }
    }
  }

  res.json({
    totalPlayers: n,
    totalPossiblePairs,
    uniquePairsPlayed: playedPairs.size,
    pairsRemaining: Math.max(totalPossiblePairs - playedPairs.size, 0),
    complete: totalPossiblePairs > 0 && playedPairs.size >= totalPossiblePairs,
  });
});

export default router;
