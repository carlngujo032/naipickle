import { Router } from "express";
import bcrypt from "bcryptjs";
import { query } from "../db.js";
import { createSession, requireAccount } from "../utils/auth.js";
import { publicAccount } from "../utils/level.js";

const router = Router();
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

// Answers are compared case-insensitively and ignoring extra spaces
const normAnswer = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");

function readSecurity(body) {
  const question = String(body.securityQuestion || "").trim().slice(0, 120);
  const answer = normAnswer(body.securityAnswer);
  if (question.length < 3) return { error: "Choose a security question" };
  if (answer.length < 2) return { error: "Enter an answer to your security question" };
  return { question, answer };
}

// POST /api/accounts/register  { username, displayName?, password }
router.post("/register", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const displayName = String(req.body.displayName || "").trim().slice(0, 60) || username;
    const password = String(req.body.password || "");
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: "Username must be 3-20 characters: letters, numbers, _ or ." });
    }
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const sec = readSecurity(req.body);
    if (sec.error) return res.status(400).json({ error: sec.error });

    const hash = await bcrypt.hash(password, 10);
    const answerHash = await bcrypt.hash(sec.answer, 10);
    const { rows } = await query(
      `INSERT INTO accounts (username, display_name, password_hash, security_question, security_answer_hash)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (username) DO NOTHING RETURNING *`,
      [username, displayName, hash, sec.question, answerHash]
    );
    if (!rows[0]) return res.status(409).json({ error: "That username is already taken" });

    const token = await createSession(rows[0].id);
    res.status(201).json({ token, account: publicAccount(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create account" });
  }
});

// POST /api/accounts/login  { username, password }
router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const { rows } = await query("SELECT * FROM accounts WHERE username = $1", [username]);
    const ok = rows[0] && (await bcrypt.compare(password, rows[0].password_hash));
    if (!ok) return res.status(401).json({ error: "Wrong username or password" });

    const token = await createSession(rows[0].id);
    res.json({ token, account: publicAccount(rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/accounts/security-question?username=x — step 1 of "forgot password"
router.get("/security-question", async (req, res) => {
  const username = String(req.query.username || "").trim().toLowerCase();
  const { rows } = await query("SELECT security_question FROM accounts WHERE username = $1", [username]);
  if (!rows[0]) return res.status(404).json({ error: "No account with that username" });
  if (!rows[0].security_question) {
    return res.status(400).json({ error: "This account has no security question yet, so it can't be reset here" });
  }
  res.json({ question: rows[0].security_question });
});

// POST /api/accounts/reset-password  { username, answer, newPassword } — step 2
router.post("/reset-password", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim().toLowerCase();
    const newPassword = String(req.body.newPassword || "");
    if (newPassword.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters" });

    const { rows } = await query("SELECT * FROM accounts WHERE username = $1", [username]);
    const a = rows[0];
    const ok = a && a.security_answer_hash && (await bcrypt.compare(normAnswer(req.body.answer), a.security_answer_hash));
    if (!ok) return res.status(401).json({ error: "That answer doesn't match" });

    await query("UPDATE accounts SET password_hash = $1 WHERE id = $2", [await bcrypt.hash(newPassword, 10), a.id]);
    await query("DELETE FROM sessions WHERE account_id = $1", [a.id]); // log out everywhere
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

// POST /api/accounts/security  { password, securityQuestion, securityAnswer }
// Set or change your security question (needed for accounts made before it existed).
router.post("/security", requireAccount, async (req, res) => {
  try {
    const ok = await bcrypt.compare(String(req.body.password || ""), req.account.password_hash);
    if (!ok) return res.status(401).json({ error: "Wrong password" });
    const sec = readSecurity(req.body);
    if (sec.error) return res.status(400).json({ error: sec.error });
    await query("UPDATE accounts SET security_question = $1, security_answer_hash = $2 WHERE id = $3", [
      sec.question,
      await bcrypt.hash(sec.answer, 10),
      req.account.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save security question" });
  }
});

// POST /api/accounts/logout
router.post("/logout", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) await query("DELETE FROM sessions WHERE token = $1", [token]);
  res.json({ ok: true });
});

// GET /api/accounts/me — my profile + lifetime stats + level
router.get("/me", requireAccount, async (req, res) => {
  res.json({ account: publicAccount(req.account) });
});

// GET /api/accounts?code=ROOM&search=mar — the host's "add player" dropdown.
// Host-only (needs that room's host token). Hides people already in the room.
router.get("/", async (req, res) => {
  try {
    const code = String(req.query.code || "");
    const search = String(req.query.search || "").trim().toLowerCase();
    const { rows: roomRows } = await query("SELECT id, host_token FROM rooms WHERE code = $1", [code]);
    const room = roomRows[0];
    const token = req.headers["x-host-token"];
    if (!room || !token || token !== room.host_token) {
      return res.status(403).json({ error: "Host token required" });
    }

    const { rows } = await query(
      `SELECT a.* FROM accounts a
       WHERE (a.username LIKE $2 OR lower(a.display_name) LIKE $2)
         AND NOT EXISTS (
           SELECT 1 FROM players p
           WHERE p.room_id = $1 AND p.account_id = a.id AND p.status != 'inactive')
       ORDER BY a.display_name ASC
       LIMIT 200`,
      [room.id, `%${search.replace(/[%_]/g, "")}%`]
    );
    res.json({
      accounts: rows.map((a) => {
        const { id, username, display_name, level, games_played } = publicAccount(a);
        return { id, username, display_name, level, games_played };
      }),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load players" });
  }
});

export default router;
