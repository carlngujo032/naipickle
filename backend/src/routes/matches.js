import { Router } from "express";
import { query } from "../db.js";
import { requireHost } from "./rooms.js";
import { pickNextMatch, pickNextMatchRandom, buildUsedPairs } from "../utils/matchmaking.js";
import { computeLevel } from "../utils/level.js";

// Add one game to the lifetime totals of every registered player in `playerIds`.
async function updateAccountStats(playerIds, won) {
  await query(
    `UPDATE accounts SET games_played = games_played + 1, wins = wins + $1, losses = losses + $2
     WHERE id IN (SELECT account_id FROM players WHERE id = ANY($3::int[]) AND account_id IS NOT NULL)`,
    [won ? 1 : 0, won ? 0 : 1, playerIds]
  );
}

const router = Router({ mergeParams: true });

// POST /api/rooms/:code/queue/next — assign next 4 waiting players to an open court
// body: { courtId, mode: 'balanced' | 'random' }
router.post("/queue/next", requireHost, async (req, res) => {
  const { courtId, mode = "balanced" } = req.body;
  const room = req.room;
  if (room.status !== "open") return res.status(400).json({ error: "This session has ended" });

  const { rows: courtRows } = await query(
    "SELECT * FROM courts WHERE id = $1 AND room_id = $2",
    [courtId, room.id]
  );
  const court = courtRows[0];
  if (!court) return res.status(404).json({ error: "Court not found" });
  if (court.status === "playing") return res.status(400).json({ error: "Court already in use" });

  const { rows: waitingRows } = await query(
    `SELECT p.*, a.wins AS acc_wins, a.games_played AS acc_games
     FROM players p LEFT JOIN accounts a ON a.id = p.account_id
     WHERE p.room_id = $1 AND p.status = 'waiting'
     ORDER BY p.games_played ASC, p.last_played_at ASC NULLS FIRST, p.joined_at ASC`,
    [room.id]
  );
  // Balanced mode uses each registered player's current level (unrated = 3)
  const waiting = waitingRows.map((p) =>
    p.account_id ? { ...p, skill_level: computeLevel(p.acc_wins, p.acc_games) ?? 3 } : p
  );

  // Teammate pairs already used in this room (finished or currently playing),
  // so the same two players are never put on the same team twice.
  const { rows: pastMatches } = await query(
    `SELECT team1_p1, team1_p2, team2_p1, team2_p2 FROM matches
     WHERE room_id = $1 AND status IN ('finished', 'in_progress')`,
    [room.id]
  );
  const usedPairs = buildUsedPairs(pastMatches);

  const picked =
    mode === "random" ? pickNextMatchRandom(waiting, usedPairs) : pickNextMatch(waiting, usedPairs);
  if (!picked) return res.status(400).json({ error: "Not enough players in queue (need 4)" });

  const { team1, team2 } = picked;
  const allIds = [...team1, ...team2];

  const { rows: matchRows } = await query(
    `INSERT INTO matches (room_id, court_id, team1_p1, team1_p2, team2_p1, team2_p2)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [room.id, courtId, team1[0], team1[1], team2[0], team2[1]]
  );

  await query("UPDATE courts SET status = 'playing' WHERE id = $1", [courtId]);
  await query(
    `UPDATE players SET status = 'playing' WHERE id = ANY($1::int[])`,
    [allIds]
  );

  res.status(201).json({
    match: matchRows[0],
    // > 0 only when every possible arrangement repeats a partner
    repeatedPartners: picked.repeats,
  });
});

// POST /api/rooms/:code/matches/:matchId/finish — report score, return players to queue
// body: { score1, score2 }
router.post("/matches/:matchId/finish", requireHost, async (req, res) => {
  const { matchId } = req.params;
  const { score1, score2 } = req.body;
  const room = req.room;

  const { rows: mRows } = await query(
    "SELECT * FROM matches WHERE id = $1 AND room_id = $2 AND status = 'in_progress'",
    [matchId, room.id]
  );
  const match = mRows[0];
  if (!match) return res.status(404).json({ error: "Active match not found" });

  const team1Won = score1 > score2;
  const team1 = [match.team1_p1, match.team1_p2];
  const team2 = [match.team2_p1, match.team2_p2];

  await query(
    `UPDATE matches SET score1 = $1, score2 = $2, status = 'finished', ended_at = now() WHERE id = $3`,
    [score1, score2, matchId]
  );
  await query("UPDATE courts SET status = 'empty' WHERE id = $1", [match.court_id]);

  for (const pid of team1) {
    await query(
      `UPDATE players SET status = 'waiting', games_played = games_played + 1,
         wins = wins + $1, losses = losses + $2,
         points_for = points_for + $3, points_against = points_against + $4,
         last_played_at = now()
       WHERE id = $5`,
      [team1Won ? 1 : 0, team1Won ? 0 : 1, score1, score2, pid]
    );
  }
  for (const pid of team2) {
    await query(
      `UPDATE players SET status = 'waiting', games_played = games_played + 1,
         wins = wins + $1, losses = losses + $2,
         points_for = points_for + $3, points_against = points_against + $4,
         last_played_at = now()
       WHERE id = $5`,
      [team1Won ? 0 : 1, team1Won ? 1 : 0, score2, score1, pid]
    );
  }

  await updateAccountStats(team1, team1Won);
  await updateAccountStats(team2, !team1Won);

  res.json({ ok: true });
});

// POST /api/rooms/:code/matches/:matchId/cancel — cancel an in-progress match
// (e.g. a player backed out). No stats are recorded; all 4 players return to
// the queue exactly as they were, and the court opens back up.
router.post("/matches/:matchId/cancel", requireHost, async (req, res) => {
  const { matchId } = req.params;
  const room = req.room;

  const { rows: mRows } = await query(
    "SELECT * FROM matches WHERE id = $1 AND room_id = $2 AND status = 'in_progress'",
    [matchId, room.id]
  );
  const match = mRows[0];
  if (!match) return res.status(404).json({ error: "Active match not found" });

  const allIds = [match.team1_p1, match.team1_p2, match.team2_p1, match.team2_p2];

  await query(
    `UPDATE matches SET status = 'cancelled', ended_at = now() WHERE id = $1`,
    [matchId]
  );
  await query("UPDATE courts SET status = 'empty' WHERE id = $1", [match.court_id]);
  await query(`UPDATE players SET status = 'waiting' WHERE id = ANY($1::int[])`, [allIds]);

  res.json({ ok: true });
});

export default router;
