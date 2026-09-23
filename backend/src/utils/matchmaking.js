// Picks the next 4 players from the waiting queue and splits them into
// two balanced teams. Queue priority: fewest games played, then longest wait.

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param {Array} waitingPlayers - players with status 'waiting', already
 *   sorted by (games_played ASC, last_played_at ASC NULLS FIRST, joined_at ASC)
 * @returns {{team1: number[], team2: number[]} | null}
 */
export function pickNextMatch(waitingPlayers) {
  if (waitingPlayers.length < 4) return null;

  // Take the 4 players who've waited longest / played least.
  const pool = waitingPlayers.slice(0, 4);
  const skills = pool.map((p) => Number(p.skill_level) || 3.0);

  // Try to balance teams by skill: sort the 4 by skill, pair
  // (highest + lowest) vs (middle two) — classic "snake" balance.
  const withSkill = pool
    .map((p, idx) => ({ ...p, skill: skills[idx] }))
    .sort((a, b) => a.skill - b.skill);

  const [lo, midLo, midHi, hi] = withSkill;

  // Team A: lowest + highest skill (balances out), Team B: the two middles.
  let team1 = [lo.id, hi.id];
  let team2 = [midLo.id, midHi.id];

  // Shuffle which team is "team1" vs "team2" and which player is p1/p2,
  // so it doesn't always look deterministic.
  if (Math.random() < 0.5) [team1, team2] = [team2, team1];
  team1 = shuffle(team1);
  team2 = shuffle(team2);

  return { team1, team2 };
}

/**
 * Simple random mix (ignores skill) — use when the room prefers pure
 * randomized partner mixing over skill-balancing.
 */
export function pickNextMatchRandom(waitingPlayers) {
  if (waitingPlayers.length < 4) return null;
  const pool = shuffle(waitingPlayers.slice(0, Math.min(8, waitingPlayers.length))).slice(0, 4);
  const ids = shuffle(pool.map((p) => p.id));
  return { team1: [ids[0], ids[1]], team2: [ids[2], ids[3]] };
}
