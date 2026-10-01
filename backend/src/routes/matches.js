import { Router } from "express";
import { query } from "../db.js";
import { requireHost } from "./rooms.js";
import { pickNextMatchRandom, pairKey, matchSignature } from "../utils/matchmaking.js";
import { getNextUp, BLOCKED_MESSAGES } from "../utils/nextUp.js";

// Add one game to the lifetime totals of every registered player in `playerIds`.
async function updateAccountStats(playerIds, won) {
  await query(
    `UPDATE accounts SET games_played = games_played + 1, wins = wins + $1, losses = losses + $2
     WHERE id IN (SELECT account_id FROM players WHERE id = ANY($3::int[]) AND account_id IS NOT NULL)`,
    [won ? 1 : 0, won ? 0 : 1, playerIds]
  );
}

// team1/team2 from the client are only trusted if they are 4 distinct players
// who are all still waiting in this room.
function validTeams(team1, team2, waiting) {
  if (!Array.isArray(team1) || !Array.isArray(team2) || team1.length !== 2 || team2.length !== 2) return null;
  const ids = [...team1, ...team2].map(Number);
  if (ids.some((id) => !Number.isInteger(id)) || new Set(ids).size !== 4) return null;
  const waitingIds = new Set(waiting.map((p) => p.id));
  if (!ids.every((id) => waitingIds.has(id))) return null;
  return { team1: ids.slice(0, 2), team2: ids.slice(2) };
}

// Create the match row and mark the court + the four players as playing.
async function bookMatch(room, courtId, team1, team2) {
  const allIds = [...team1, ...team2];
  const { rows: matchRows } = await query(
    `INSERT INTO matches (room_id, court_id, round_number, team1_p1, team1_p2, team2_p1, team2_p2)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [room.id, courtId, room.round_number, team1[0], team1[1], team2[0], team2[1]]
  );
  await query("UPDATE courts SET status = 'playing' WHERE id = $1", [courtId]);
  await query(`UPDATE players SET status = 'playing' WHERE id = ANY($1::int[])`, [allIds]);
  return matchRows[0];
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
  const { rows: activeRows } = await query(
    "SELECT id, skill_level FROM players WHERE room_id = $1 AND status IN ('waiting', 'playing')",
    [room.id]
  );
  const { waiting, used, options, blocked } = await getNextUp(room, waitingRows, activeRows);

  // Round already full — nothing more can be assigned until the next round.
  if (blocked === "round_complete") {
    return res.status(400).json({ error: BLOCKED_MESSAGES.round_complete, blocked });
  }

  // The host's screen shows a "Next up" preview; it sends those exact teams
  // back so what was shown is what gets played. If the queue changed since
  // (someone left, etc.) the teams are ignored and a fresh pick is made.
  const sent = validTeams(req.body.team1, req.body.team2, waiting);
  let picked;
  if (sent) {
    const repeats =
      (used.has(pairKey(sent.team1[0], sent.team1[1])) ? 1 : 0) +
      (used.has(pairKey(sent.team2[0], sent.team2[1])) ? 1 : 0);
    picked = { ...sent, repeats };
  } else if (mode === "random") {
    picked = pickNextMatchRandom(waiting, used);
  } else {
    picked = options[0] || null;
  }
  if (!picked) {
    return res.status(400).json({
      error: BLOCKED_MESSAGES[blocked] || "Not enough players in queue (need 4)",
      blocked,
    });
  }
  // Never put two players together again within a round
  if (picked.repeats > 0) {
    const reason = blocked || "no_new_partners";
    return res.status(400).json({ error: BLOCKED_MESSAGES[reason], blocked: reason });
  }

  const match = await bookMatch(room, courtId, picked.team1, picked.team2);
  res.status(201).json({ match });
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

// POST /api/rooms/:code/matches/:matchId/reassign — swap an in-progress match
// for a DIFFERENT one on the same court. The current match is cancelled (no
// score), then the best arrangement other than the one just cancelled is
// booked. If there is no different match available, nothing changes.
router.post("/matches/:matchId/reassign", requireHost, async (req, res) => {
  const { matchId } = req.params;
  const room = req.room;

  const { rows: mRows } = await query(
    "SELECT * FROM matches WHERE id = $1 AND room_id = $2 AND status = 'in_progress'",
    [matchId, room.id]
  );
  const old = mRows[0];
  if (!old) return res.status(404).json({ error: "Active match not found" });

  const oldIds = [old.team1_p1, old.team1_p2, old.team2_p1, old.team2_p2];

  // 1. cancel (same as /cancel): players back to the queue, court opens
  await query("UPDATE matches SET status = 'cancelled', ended_at = now() WHERE id = $1", [matchId]);
  await query("UPDATE courts SET status = 'empty' WHERE id = $1", [old.court_id]);
  await query("UPDATE players SET status = 'waiting' WHERE id = ANY($1::int[])", [oldIds]);

  // 2. best match that is not the one we just cancelled
  const { rows: waitingRows } = await query(
    `SELECT p.*, a.wins AS acc_wins, a.games_played AS acc_games
     FROM players p LEFT JOIN accounts a ON a.id = p.account_id
     WHERE p.room_id = $1 AND p.status = 'waiting'
     ORDER BY p.games_played ASC, p.last_played_at ASC NULLS FIRST, p.joined_at ASC`,
    [room.id]
  );
  const { rows: activeRows } = await query(
    "SELECT id, skill_level FROM players WHERE room_id = $1 AND status IN ('waiting', 'playing')",
    [room.id]
  );
  const exclude = new Set([
    matchSignature([old.team1_p1, old.team1_p2], [old.team2_p1, old.team2_p2]),
  ]);
  const { options, blocked } = await getNextUp(room, waitingRows, activeRows, exclude);

  if (!options.length) {
    // 3. nothing different available — put the original match back untouched
    await query(
      "UPDATE matches SET status = 'in_progress', ended_at = NULL WHERE id = $1",
      [matchId]
    );
    await query("UPDATE courts SET status = 'playing' WHERE id = $1", [old.court_id]);
    await query("UPDATE players SET status = 'playing' WHERE id = ANY($1::int[])", [oldIds]);
    return res.status(409).json({
      error: BLOCKED_MESSAGES[blocked] || BLOCKED_MESSAGES.no_alternative,
      blocked,
    });
  }

  const pick = options[0];
  const match = await bookMatch(room, old.court_id, pick.team1, pick.team2);
  res.status(201).json({ match });
});

export default router;
