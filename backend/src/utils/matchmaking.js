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
  const preview = previewNextMatch(waitingPlayers, usedPairs);
  if (!preview) return null;
  const top = preview.options[0];
  return { team1: top.team1, team2: top.team2, repeats: top.repeats };
}

/**
 * Deterministic preview of the next match (no randomness), so what the host
 * sees in "Next up" is exactly what gets assigned. Returns
 *   { options: [{ team1: [id,id], team2: [id,id], repeats }, ...] }
 * `options` are the valid ways to split the SAME four players (best first);
 * the UI's Shuffle button cycles through them.
 */
export function previewNextMatch(waitingPlayers, usedPairs = new Set()) {
  if (waitingPlayers.length < 4) return null;
  let best = searchDeterministic(waitingPlayers, usedPairs, 8);
  if (best.repeats > 0 && waitingPlayers.length > 8) {
    const wider = searchDeterministic(waitingPlayers, usedPairs, 16);
    if (wider.repeats < best.repeats) best = wider;
  }
  return { options: best.options };
}

function searchDeterministic(players, usedPairs, poolSize) {
  const n = Math.min(poolSize, players.length);
  const skill = (p) => Number(p.skill_level) || 3.0;
  let bestCost = null;
  let bestIdxs = null;

  for (const idxs of combos4(n)) {
    const four = idxs.map((i) => players[i]);
    const queueCost = idxs[0] + idxs[1] + idxs[2] + idxs[3];
    let groupBest = null;
    for (const [[a, b], [c, d]] of SPLITS) {
      const repeats =
        (usedPairs.has(pairKey(four[a].id, four[b].id)) ? 1 : 0) +
        (usedPairs.has(pairKey(four[c].id, four[d].id)) ? 1 : 0);
      const imbalance = Math.abs(skill(four[a]) + skill(four[b]) - (skill(four[c]) + skill(four[d])));
      const cost = [repeats, queueCost, imbalance];
      if (!groupBest || compare(cost, groupBest) < 0) groupBest = cost;
    }
    if (!bestCost || compare(groupBest, bestCost) < 0) {
      bestCost = groupBest;
      bestIdxs = idxs;
    }
  }

  // All ways to split the chosen four, best first; keep only the ones that
  // are as good as the best on repeat partners.
  const four = bestIdxs.map((i) => players[i]);
  const options = [];
  for (const [[a, b], [c, d]] of SPLITS) {
    const repeats =
      (usedPairs.has(pairKey(four[a].id, four[b].id)) ? 1 : 0) +
      (usedPairs.has(pairKey(four[c].id, four[d].id)) ? 1 : 0);
    const imbalance = Math.abs(skill(four[a]) + skill(four[b]) - (skill(four[c]) + skill(four[d])));
    options.push({ team1: [four[a].id, four[b].id], team2: [four[c].id, four[d].id], repeats, imbalance });
  }
  options.sort((x, y) => x.repeats - y.repeats || x.imbalance - y.imbalance);
  const minRepeats = options[0].repeats;
  return {
    repeats: minRepeats,
    options: options
      .filter((o) => o.repeats === minRepeats)
      .map(({ team1, team2, repeats }) => ({ team1, team2, repeats })),
  };
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

/** True if ANY four of these players can be split into teams with no repeat partner. */
export function hasFreshGroup(players, usedPairs) {
  const n = players.length;
  for (const [a, b, c, d] of combos4(n)) {
    const f = [players[a].id, players[b].id, players[c].id, players[d].id];
    for (const [[i, j], [k, l]] of SPLITS) {
      if (!usedPairs.has(pairKey(f[i], f[j])) && !usedPairs.has(pairKey(f[k], f[l]))) return true;
    }
  }
  return false;
}

/**
 * Decide what "Next up" can show. Pure function (no database) so it is easy
 * to test.
 *   waiting – waiting players in queue order
 *   used    – teammate pairs already played this round
 *   played  – games already started/finished this round
 *   limit   – games allowed this round (null = unlimited)
 *   active  – everyone who could still play (waiting + on court)
 * Returns { options, blocked } where blocked is one of
 *   null | "round_complete" | "no_new_partners" | "wait"
 * and `options` is empty whenever blocked is set (or fewer than 4 are waiting).
 */
export function computeNextUp({ waiting, used, played, limit, active }) {
  if (limit != null && played >= limit) return { options: [], blocked: "round_complete" };
  if (waiting.length < 4) return { options: [], blocked: null };
  const preview = previewNextMatch(waiting, used);
  if (preview.options[0].repeats === 0) return { options: preview.options, blocked: null };
  // Everyone waiting has partnered already. Is there a fresh group at all if
  // the players on court are counted? If so, just wait; if not, it's over.
  return { options: [], blocked: hasFreshGroup(active ?? waiting, used) ? "wait" : "no_new_partners" };
}
