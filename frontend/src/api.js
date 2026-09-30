import { getAuth } from "./auth.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      // logged-in players send their login token with every request
      ...(getAuth() ? { Authorization: `Bearer ${getAuth().token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export const api = {
  createRoom: (body) => request("/api/rooms", { method: "POST", body: JSON.stringify(body) }),
  verifyRoom: (code, password) =>
    request(`/api/rooms/${code}/verify`, { method: "POST", body: JSON.stringify({ password }) }),
  getRoom: (code) => request(`/api/rooms/${code}`),
  joinRoom: (code, name, skillLevel) =>
    request(`/api/rooms/${code}/players`, {
      method: "POST",
      body: JSON.stringify({ name, skillLevel }),
    }),
  // ---- accounts
  register: (username, displayName, password, securityQuestion, securityAnswer) =>
    request("/api/accounts/register", {
      method: "POST",
      body: JSON.stringify({ username, displayName, password, securityQuestion, securityAnswer }),
    }),
  securityQuestion: (username) =>
    request(`/api/accounts/security-question?username=${encodeURIComponent(username)}`),
  resetPassword: (username, answer, newPassword) =>
    request("/api/accounts/reset-password", { method: "POST", body: JSON.stringify({ username, answer, newPassword }) }),
  setSecurity: (password, securityQuestion, securityAnswer) =>
    request("/api/accounts/security", { method: "POST", body: JSON.stringify({ password, securityQuestion, securityAnswer }) }),
  login: (username, password) =>
    request("/api/accounts/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request("/api/accounts/logout", { method: "POST" }),
  me: () => request("/api/accounts/me"),
  listAccounts: (code, search, hostToken) =>
    request(`/api/accounts?code=${encodeURIComponent(code)}&search=${encodeURIComponent(search || "")}`, {
      headers: { "x-host-token": hostToken },
    }),
  joinRoomAsAccount: (code) =>
    request(`/api/rooms/${code}/players`, { method: "POST", body: JSON.stringify({ asAccount: true }) }),
  addRegisteredPlayer: (code, accountId, hostToken) =>
    request(`/api/rooms/${code}/players`, {
      method: "POST",
      headers: { "x-host-token": hostToken },
      body: JSON.stringify({ accountId }),
    }),
  removePlayer: (code, playerId, hostToken) =>
    request(`/api/rooms/${code}/players/${playerId}`, {
      method: "DELETE",
      headers: { "x-host-token": hostToken },
    }),
  nextMatch: (code, courtId, hostToken, mode = "balanced") =>
    request(`/api/rooms/${code}/queue/next`, {
      method: "POST",
      headers: { "x-host-token": hostToken },
      body: JSON.stringify({ courtId, mode }),
    }),
  finishMatch: (code, matchId, score1, score2, hostToken) =>
    request(`/api/rooms/${code}/matches/${matchId}/finish`, {
      method: "POST",
      headers: { "x-host-token": hostToken },
      body: JSON.stringify({ score1, score2 }),
    }),
  cancelMatch: (code, matchId, hostToken) =>
    request(`/api/rooms/${code}/matches/${matchId}/cancel`, {
      method: "POST",
      headers: { "x-host-token": hostToken },
    }),
  setBreak: (code, playerId, onBreak, { hostToken, playerToken } = {}) =>
    request(`/api/rooms/${code}/players/${playerId}/break`, {
      method: "POST",
      headers: {
        ...(hostToken ? { "x-host-token": hostToken } : {}),
        ...(playerToken ? { "x-player-token": playerToken } : {}),
      },
      body: JSON.stringify({ onBreak }),
    }),
  updateRoom: (code, body, hostToken) =>
    request(`/api/rooms/${code}`, {
      method: "PATCH",
      headers: { "x-host-token": hostToken },
      body: JSON.stringify(body),
    }),
  summary: (code) => request(`/api/rooms/${code}/summary`),
  leaderboard: (code) => request(`/api/rooms/${code}/players/leaderboard`),
  pairingProgress: (code) => request(`/api/rooms/${code}/players/pairing-progress`),
};
