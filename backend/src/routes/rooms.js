import { Router } from "express";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { query } from "../db.js";
import { computeLevel } from "../utils/level.js";
import { getNextUp } from "../utils/nextUp.js";
import { accountFromRequest, requireAccount } from "../utils/auth.js";

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
    const { title, password, maxPlayers = 24, maxCourts = 4, isPublic = true } = req.body;
    if (!title) return res.status(400).json({ error: "Title is required" });
    // If the host is logged in, remember the room on their account
    const account = await accountFromRequest(req);

    const code = genCode();
    const hostToken = genToken();
    const passwordHash = password ? await bcrypt.hash(password, 8) : null;

    const { rows } = await query(
      `INSERT INTO rooms (code, title, password_hash, host_token, max_players, max_courts, is_public, host_account_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, code, title, max_players, max_courts, status, created_at`,
      [code, title, passwordHash, hostToken, maxPlayers, maxCourts, isPublic !== false, account ? account.id : null]
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

// GET /api/rooms — public list of open rooms, so anyone on any device can find
// and join a session without needing the code. Hosts can opt out when creating.
router.get("/", async (req, res) => {
  const { rows } = await query(
    `SELECT r.code, r.title, r.max_players, r.created_at,
            (r.password_hash IS NOT NULL) AS has_password,
            COUNT(p.id) FILTER (WHERE p.status <> 'inactive')::int AS players,
            COUNT(p.id) FILTER (WHERE p.status = 'waiting')::int AS waiting
     FROM rooms r LEFT JOIN players p ON p.room_id = r.id
     WHERE r.status = 'open' AND r.is_public AND r.created_at > now() - interval '3 days'
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT 30`
  );
  res.json({ rooms: rows });
});

// GET /api/rooms/mine — rooms the logged-in account hosts (works from any device)
router.get("/mine", requireAccount, async (req, res) => {
  const { rows } = await query(
    `SELECT r.code, r.title, r.created_at,
            COUNT(p.id) FILTER (WHERE p.status <> 'inactive')::int AS players,
            COUNT(p.id) FILTER (WHERE p.status = 'waiting')::int AS waiting
     FROM rooms r LEFT JOIN players p ON p.room_id = r.id
     WHERE r.host_account_id = $1 AND r.status = 'open'
     GROUP BY r.id
     ORDER BY r.created_at DESC
     LIMIT 20`,
    [req.account.id]
  );
  res.json({ rooms: rows });
});

// POST /api/rooms/:code/claim-host — a logged-in host gets host control on a new
// device. Only the account that owns the room can do this.
router.post("/:code/claim-host", requireAccount, async (req, res) => {
  const { rows } = await query("SELECT host_token, host_account_id FROM rooms WHERE code = $1", [req.params.code]);
  const room = rows[0];
  if (!room) return res.status(404).json({ error: "Room not found" });
  if (room.host_account_id !== req.account.id) {
    return res.status(403).json({ error: "This room isn't saved to your account" });
  }
  res.json({ hostToken: room.host_token });
});

// POST /api/rooms/:code/link-account — a host who is also logged in saves an
// existing room to their account (done automatically when they open it)
router.post("/:code/link-account", requireHost, requireAccount, async (req, res) => {
  if (req.room.host_account_id && req.room.host_account_id !== req.account.id) {
    return res.status(409).json({ error: "This room is already saved to another account" });
  }
  await query("UPDATE rooms SET host_account_id = $1 WHERE id = $2", [req.account.id, req.room.id]);
  res.json({ ok: true });
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

  const { rows: playerRows } = await query(
    `SELECT p.*, a.wins AS acc_wins, a.games_played AS acc_games
     FROM players p LEFT JOIN accounts a ON a.id = p.account_id
     WHERE p.room_id = $1
     ORDER BY p.games_played ASC, p.last_played_at ASC NULLS FIRST, p.joined_at ASC`,
    [room.id]
  );
  // player_token is a private key for that one player — don't broadcast it.
  // level is only set for players with an account (null = guest or still unrated).
  const players = playerRows.map(({ player_token, acc_wins, acc_games, ...p }) => ({
    ...p,
    level: p.account_id ? computeLevel(acc_wins, acc_games) : null,
  }));
  const { rows: courts } = await query(
    "SELECT * FROM courts WHERE room_id = $1 ORDER BY court_number ASC",
    [room.id]
  );
  const { rows: activeMatches } = await query(
    "SELECT * FROM matches WHERE room_id = $1 AND status = 'in_progress'",
    [room.id]
  );

  // "Next up" preview — computed by the same code that assigns the match
  const nextUp = await getNextUp(
    room,
    playerRows.filter((p) => p.status === "waiting"),
    playerRows.filter((p) => p.status === "waiting" || p.status === "playing")
  );

  room.host_linked = room.host_account_id != null;
  delete room.password_hash;
  delete room.host_token;
  delete room.host_account_id;

  res.json({
    room,
    players,
    queue: players.filter((p) => p.status === "waiting"),
    courts,
    activeMatches,
    nextUp: { options: nextUp.options, blocked: nextUp.blocked, round: nextUp.round },
  });
});

// GET /api/rooms/:code/summary — end-of-session recap: top player(s), most
// games played, attendance and totals. Safe to view mid-session too.
router.get("/:code/summary", async (req, res) => {
  try {
    const { code } = req.params;
    const { rows: roomRows } = await query(
      "SELECT id, code, title, status, created_at FROM rooms WHERE code = $1",
      [code]
    );
    const room = roomRows[0];
    if (!room) return res.status(404).json({ error: "Room not found" });

    const { rows: playerRows } = await query(
      `SELECT id, name, skill_level, status, games_played, wins, losses, points_for, points_against
       FROM players WHERE room_id = $1`,
      [room.id]
    );
    const { rows: matchRows } = await query(
      `SELECT COUNT(*)::int AS matches,
              COALESCE(SUM(score1 + score2), 0)::int AS points,
              MIN(started_at) AS first_start,
              MAX(ended_at) AS last_end
       FROM matches WHERE room_id = $1 AND status = 'finished'`,
      [room.id]
    );
    const totals = matchRows[0];

    const attendance = playerRows
      .map((p) => ({
        ...p,
        win_rate: p.games_played > 0 ? p.wins / p.games_played : 0,
        point_diff: p.points_for - p.points_against,
      }))
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.win_rate - a.win_rate ||
          b.point_diff - a.point_diff ||
          b.games_played - a.games_played ||
          a.name.localeCompare(b.name)
      );

    const played = attendance.filter((p) => p.games_played > 0);

    // Top player = most wins, then best win rate, then best point difference.
    // Anyone exactly level on all three is returned too (a real tie).
    const sameAsTop = (p) =>
      p.wins === played[0].wins &&
      p.win_rate === played[0].win_rate &&
      p.point_diff === played[0].point_diff;
    const topPlayers = played.length ? played.filter(sameAsTop) : [];

    const maxGames = played.length ? Math.max(...played.map((p) => p.games_played)) : 0;
    const mostGames = {
      games: maxGames,
      players: played.filter((p) => p.games_played === maxGames),
    };

    let playMinutes = null;
    if (totals.first_start && totals.last_end) {
      playMinutes = Math.max(
        Math.round((new Date(totals.last_end) - new Date(totals.first_start)) / 60000),
        0
      );
    }

    res.json({
      room,
      totals: {
        players: attendance.length,
        playersWhoPlayed: played.length,
        matches: totals.matches,
        points: totals.points,
        playMinutes,
      },
      topPlayers,
      mostGames,
      attendance,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load summary" });
  }
});

// POST /api/rooms/:code/round/limit — host sets how many games make up a round
// body: { gameLimit: number | null }   (null / 0 = no limit)
router.post("/:code/round/limit", requireHost, async (req, res) => {
  let { gameLimit } = req.body;
  if (gameLimit === undefined || gameLimit === null || gameLimit === "" || Number(gameLimit) === 0) {
    gameLimit = null;
  } else {
    gameLimit = Number(gameLimit);
    if (!Number.isInteger(gameLimit) || gameLimit < 1 || gameLimit > 500) {
      return res.status(400).json({ error: "Games per round must be a whole number from 1 to 500" });
    }
  }
  await query("UPDATE rooms SET round_game_limit = $1 WHERE id = $2", [gameLimit, req.room.id]);
  res.json({ ok: true, gameLimit });
});

// POST /api/rooms/:code/round/next — start a new round (partner history starts fresh)
router.post("/:code/round/next", requireHost, async (req, res) => {
  if (req.room.status !== "open") return res.status(400).json({ error: "This session has ended" });
  const { rows: active } = await query(
    "SELECT 1 FROM matches WHERE room_id = $1 AND status = 'in_progress' LIMIT 1",
    [req.room.id]
  );
  if (active.length) {
    return res.status(400).json({ error: "Finish or cancel the games on court before starting the next round" });
  }
  const { rows } = await query(
    "UPDATE rooms SET round_number = round_number + 1 WHERE id = $1 RETURNING round_number",
    [req.room.id]
  );
  res.json({ ok: true, round: rows[0].round_number });
});

// PATCH /api/rooms/:code — update room (host only): close/reopen, lock, etc.
router.patch("/:code", requireHost, async (req, res) => {
  const { status, title, maxPlayers, isPublic } = req.body;
  if (status && !["open", "closed"].includes(status)) {
    return res.status(400).json({ error: "Status must be 'open' or 'closed'" });
  }
  if (status === "closed") {
    const { rows: active } = await query(
      "SELECT 1 FROM matches WHERE room_id = $1 AND status = 'in_progress' LIMIT 1",
      [req.room.id]
    );
    if (active.length) {
      return res.status(400).json({ error: "Finish or cancel the matches still on court before ending the session" });
    }
  }
  const fields = [];
  const values = [];
  let i = 1;
  if (status) { fields.push(`status = $${i++}`); values.push(status); }
  if (title) { fields.push(`title = $${i++}`); values.push(title); }
  if (maxPlayers) { fields.push(`max_players = $${i++}`); values.push(maxPlayers); }
  if (typeof isPublic === "boolean") { fields.push(`is_public = $${i++}`); values.push(isPublic); }
  if (!fields.length) return res.status(400).json({ error: "Nothing to update" });
  values.push(req.room.id);
  await query(`UPDATE rooms SET ${fields.join(", ")} WHERE id = $${i}`, values);
  res.json({ ok: true });
});

export { requireHost };
export default router;
