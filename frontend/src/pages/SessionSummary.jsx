import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api.js";
import { useRoomLive } from "../useRoomLive.js";

function formatMinutes(m) {
  if (m == null) return "—";
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}
const pct = (rate) => `${Math.round(rate * 100)}%`;
const signed = (n) => (n > 0 ? `+${n}` : `${n}`);
const names = (list) => {
  const n = list.map((p) => p.name);
  return n.length > 2 ? `${n.slice(0, -1).join(", ")} & ${n[n.length - 1]}` : n.join(" & ");
};

// Recap of the session: top player, most games played, attendance, totals.
// Works mid-session too (it's just "so far"); it becomes final once the host
// ends the session.
export default function SessionSummary() {
  const { code } = useParams();
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  const hostToken = localStorage.getItem(`host_${code}`);
  const isHost = Boolean(hostToken);

  const refresh = useCallback(async () => {
    try {
      setS(await api.summary(code));
      setError("");
    } catch (err) {
      if (err.message === "Room not found") setError(err.message);
    }
  }, [code]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useRoomLive(code, refresh);

  async function handleReopen() {
    try {
      await api.updateRoom(code, { status: "open" }, hostToken);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <div className="page">
        <p className="error">{error}</p>
        <Link to="/" className="back-link">← Back to Your Rooms</Link>
      </div>
    );
  }
  if (!s) return <div className="page">Loading…</div>;

  const { room, totals, topPlayers, mostGames, attendance } = s;
  const ended = room.status === "closed";
  const top = topPlayers[0];

  return (
    <div className="page summary-page">
      <Link to={`/room/${code}`} className="back-link">← Back to the room</Link>
      <h2>
        {room.title} <span className="code">#{room.code}</span>
      </h2>
      <p className="hint">
        {ended ? "Session ended — final summary." : "Session still running — this is the summary so far."}
        {isHost && ended && (
          <button className="btn tiny secondary" onClick={handleReopen}>Reopen session</button>
        )}
      </p>

      <div className="summary-tiles">
        <div className="tile"><strong>{totals.players}</strong><span>players came</span></div>
        <div className="tile"><strong>{totals.matches}</strong><span>games played</span></div>
        <div className="tile"><strong>{totals.points}</strong><span>total points</span></div>
        <div className="tile"><strong>{formatMinutes(totals.playMinutes)}</strong><span>of play</span></div>
      </div>

      {totals.matches === 0 ? (
        <p className="hint">No completed games yet — highlights will show up here.</p>
      ) : (
        <div className="summary-highlights">
          <div className="highlight">
            <span className="highlight-label">🏆 Top Player{topPlayers.length > 1 ? "s (tied)" : ""}</span>
            <strong>{names(topPlayers)}</strong>
            <span className="highlight-detail">
              {top.wins}W–{top.losses}L · {pct(top.win_rate)} win rate
            </span>
          </div>
          <div className="highlight">
            <span className="highlight-label">🎾 Most Games Played</span>
            <strong>{names(mostGames.players)}</strong>
            <span className="highlight-detail">{mostGames.games} games{mostGames.players.length > 1 ? " each" : ""}</span>
          </div>
        </div>
      )}

      <h3>Attendance ({totals.players})</h3>
      <div className="table-scroll">
        <table className="summary-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Games</th>
              <th>W–L</th>
              <th>Win %</th>
              <th>Pts +/−</th>
            </tr>
          </thead>
          <tbody>
            {attendance.map((p) => (
              <tr key={p.id} className={p.status === "inactive" ? "left" : ""}>
                <td>
                  {p.name}
                  {p.status === "inactive" && <span className="skill"> (left early)</span>}
                  {p.status === "break" && <span className="skill"> (on break)</span>}
                </td>
                <td>{p.games_played}</td>
                <td>{p.wins}–{p.losses}</td>
                <td>{p.games_played ? pct(p.win_rate) : "—"}</td>
                <td>{p.games_played ? signed(p.point_diff) : "—"}</td>
              </tr>
            ))}
            {!attendance.length && (
              <tr><td colSpan={5} className="hint">Nobody joined this session.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="hint">
        Top Player = most wins, then best win rate, then best point difference.
      </p>
    </div>
  );
}
