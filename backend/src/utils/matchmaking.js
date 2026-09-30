// Picks the next 4 players from the waiting queue and splits them into two
// teams. Rules, in order of importance:
//   1. Nobody partners with the same person twice (teammates only — facing
//      the same opponent again is fine).
//   2. Queue priority: fewest games played, then longest wait.
//   3. (balanced mode) Keep the two teams close in skill.
//
// If every possible arrangement would repeat a partner (e.g. everyone has
// already partnered with everyone), it falls back to the arrangement with the
// fewest repeats so the game can still start.

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pairKey(a, b) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

/** Build the set of teammate pairs from match rows (team1_p1 … team2_p2). */
export function buildUsedPairs(matchRows) {
  const used = new Set();
  for (const m of matchRows) {
    if (m.team1_p1 != null && m.team1_p2 != null) used.add(pairKey(m.team1_p1, m.team1_p2));
    if (m.team2_p1 != null && m.team2_p2 != null) used.add(pairKey(m.team2_p1, m.team2_p2));
  }
  return used;
}

// The 3 ways to split 4 players (indices 0-3) into two teams of 2.
const SPLITS = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

function* combos4(n) {
  for (let a = 0; a < n - 3; a++)
    for (let b = a + 1; b < n - 2; b++)
      for (let c = b + 1; c < n - 1; c++)
        for (let d = c + 1; d < n; d++) yield [a, b, c, d];
}

/**
 * Search the first `poolSize` waiting players for the best 4 + team split.
 * Returns { team1, team2, repeats, cost } or null.
 */
function search(players, usedPairs, poolSize, balanced) {
  const n = Math.min(poolSize, players.length);
  let best = null;

  for (const idxs of combos4(n)) {
    const four = idxs.map((i) => players[i]);
    const queueCost = idxs[0] + idxs[1] + idxs[2] + idxs[3]; // lower = waited longer

    for (const [[a, b], [c, d]] of SPLITS) {
      const repeats =
        (usedPairs.has(pairKey(four[a].id, four[b].id)) ? 1 : 0) +
        (usedPairs.has(pairKey(four[c].id, four[d].id)) ? 1 : 0);

      const skill = (p) => Number(p.skill_level) || 3.0;
      const imbalance = balanced
        ? Math.abs(skill(four[a]) + skill(four[b]) - (skill(four[c]) + skill(four[d])))
        : 0;

      // Lexicographic cost: repeats, then queue priority, then balance, then a
      // random tiebreak so results don't look identical every time.
      const cost = [repeats, balanced ? queueCost : 0, imbalance, Math.random()];

      if (!best || compare(cost, best.cost) < 0) {
        best = { four, split: [[a, b], [c, d]], repeats, cost };
      }
    }
  }

  if (!best) return null;
  const [[a, b], [c, d]] = best.split;
  let team1 = [best.four[a].id, best.four[b].id];
  let team2 = [best.four[c].id, best.four[d].id];
  if (Math.random() < 0.5) [team1, team2] = [team2, team1];
  return { team1: shuffle(team1), team2: shuffle(team2), repeats: best.repeats };
}

function compare(x, y) {
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}

/**
 * @param {Array} waitingPlayers - players with status 'waiting', already
 *   sorted by (games_played ASC, last_played_at ASC NULLS FIRST, joined_at ASC)
 * @param {Set<string>} usedPairs - teammate pairs already played (see buildUsedPairs)
 * @returns {{team1: number[], team2: number[], repeats: number} | null}
 *   `repeats` is 0 when nobody repeats a partner.
 */
export function pickNextMatch(waitingPlayers, usedPairs = new Set()) {
  if (waitingPlayers.length < 4) return null;
  // Look at the front of the queue first; only widen the search if that
  // can't avoid a repeat partner.
  let result = search(waitingPlayers, usedPairs, 8, true);
  if (result.repeats > 0 && waitingPlayers.length > 8) {
    const wider = search(waitingPlayers, usedPairs, 16, true);
    if (wider.repeats < result.repeats) result = wider;
  }
  return result;
}

/** Random mix (ignores skill) — still never repeats a partner if avoidable. */
export function pickNextMatchRandom(waitingPlayers, usedPairs = new Set()) {
  if (waitingPlayers.length < 4) return null;
  let result = search(waitingPlayers, usedPairs, 8, false);
  if (result.repeats > 0 && waitingPlayers.length > 8) {
    const wider = search(waitingPlayers, usedPairs, 16, false);
    if (wider.repeats < result.repeats) result = wider;
  }
  return result;
}
