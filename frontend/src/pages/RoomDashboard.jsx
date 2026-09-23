import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import QueueList from "../components/QueueList.jsx";
import CourtCard from "../components/CourtCard.jsx";

export default function RoomDashboard() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const hostToken = localStorage.getItem(`host_${code}`);
  const isHost = Boolean(hostToken);

  const refresh = useCallback(async () => {
    try {
      const d = await api.getRoom(code);
      setData(d);
      const lb = await api.leaderboard(code);
      setLeaderboard(lb.leaderboard);
    } catch (err) {
      setError(err.message);
    }
  }, [code]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 4000); // simple polling; swap for Socket.io later
    return () => clearInterval(interval);
  }, [refresh]);

  async function handleNextMatch(courtId) {
    try {
      await api.nextMatch(code, courtId, hostToken);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleFinishMatch(matchId, score1, score2) {
    try {
      await api.finishMatch(code, matchId, Number(score1), Number(score2), hostToken);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemovePlayer(playerId) {
    try {
      await api.removePlayer(code, playerId, hostToken);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page">Loading…</div>;

  const { room, queue, courts, activeMatches, players } = data;
  const findPlayer = (id) => players.find((p) => p.id === id);

  return (
    <div className="page">
      <h2>{room.title} <span className="code">#{room.code}</span></h2>
      {!isHost && <p className="hint">Viewing as player. Only the host's browser can control matches.</p>}

      <section>
        <h3>Courts</h3>
        <div className="grid">
          {courts.map((court) => {
            const match = activeMatches.find((m) => m.court_id === court.id);
            return (
              <CourtCard
                key={court.id}
                court={court}
                match={match}
                findPlayer={findPlayer}
                isHost={isHost}
                onNextMatch={() => handleNextMatch(court.id)}
                onFinishMatch={handleFinishMatch}
              />
            );
          })}
        </div>
      </section>

      <section>
        <h3>Queue ({queue.length} waiting)</h3>
        <QueueList queue={queue} isHost={isHost} onRemove={handleRemovePlayer} />
      </section>

      <section>
        <h3>🏆 Top Players</h3>
        <ol className="leaderboard">
          {leaderboard.map((p) => (
            <li key={p.id}>
              {p.name} — {p.wins}W / {p.losses}L ({Math.round(p.win_rate * 100)}%)
            </li>
          ))}
          {!leaderboard.length && <p className="hint">No completed games yet.</p>}
        </ol>
      </section>
    </div>
  );
}
