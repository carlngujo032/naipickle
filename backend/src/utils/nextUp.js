import { query } from "../db.js";
import { computeLevel } from "./level.js";
import { buildUsedPairs, computeNextUp } from "./matchmaking.js";

// Shared by the room-state endpoint (the "Next up" preview) and the assign
// endpoint, so the preview and the real assignment can never disagree.
//   room        – the rooms row (needs id, round_number, round_game_limit)
//   waitingRows – waiting players in queue order, joined with accounts
//                 (acc_wins / acc_games), as in routes/matches.js
//   activeRows  – waiting + on-court players (anyone who can still play)
export async function getNextUp(room, waitingRows, activeRows, exclude = null) {
  // Registered players use their current level for balancing (unrated = 3)
  const waiting = waitingRows.map((p) =>
    p.account_id ? { ...p, skill_level: computeLevel(p.acc_wins, p.acc_games) ?? 3 } : p
  );
  // Only games of the CURRENT round count for partner history and the cap
  const { rows } = await query(
    `SELECT team1_p1, team1_p2, team2_p1, team2_p2 FROM matches
     WHERE room_id = $1 AND round_number = $2 AND status IN ('finished', 'in_progress')`,
    [room.id, room.round_number]
  );
  const used = buildUsedPairs(rows);
  const limit = room.round_game_limit ?? null;
  const { options, blocked } = computeNextUp({
    waiting,
    used,
    played: rows.length,
    limit,
    active: activeRows,
    exclude,
  });
  return {
    waiting,
    used,
    options,
    blocked,
    round: { number: room.round_number, limit, played: rows.length },
  };
}

export const BLOCKED_MESSAGES = {
  round_complete: "This round is complete. Start the next round to keep playing.",
  no_new_partners: "Everyone waiting has already partnered with each other this round. Start the next round to continue.",
  no_alternative: "There is no different match available right now, so the current match was kept.",
  wait: "No new partner combination among the players waiting yet. Wait for a game to finish.",
};
