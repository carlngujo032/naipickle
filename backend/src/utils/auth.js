import { customAlphabet } from "nanoid";
import { query } from "../db.js";

const genSession = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 48);

export async function createSession(accountId) {
  const token = genSession();
  await query("INSERT INTO sessions (token, account_id) VALUES ($1, $2)", [token, accountId]);
  return token;
}

// Returns the logged-in account row for "Authorization: Bearer <token>", or null.
export async function accountFromRequest(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const { rows } = await query(
    `SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account_id
     WHERE s.token = $1 AND s.created_at > now() - interval '90 days'`,
    [token]
  );
  return rows[0] || null;
}

export async function requireAccount(req, res, next) {
  const account = await accountFromRequest(req);
  if (!account) return res.status(401).json({ error: "Please log in" });
  req.account = account;
  next();
}
