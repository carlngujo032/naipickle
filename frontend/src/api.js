const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
  leaderboard: (code) => request(`/api/rooms/${code}/players/leaderboard`),
};
