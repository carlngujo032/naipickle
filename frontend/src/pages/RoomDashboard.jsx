import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import QueueList from "../components/QueueList.jsx";
import CourtCard from "../components/CourtCard.jsx";
import AddPlayerForm from "../components/AddPlayerForm.jsx";
import PlayerManageList from "../components/PlayerManageList.jsx";
import PairingProgress from "../components/PairingProgress.jsx";
import NextUpCard from "../components/NextUpCard.jsx";

export default function RoomDashboard() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const hostToken = localStorage.getItem(`host_${code}`);
  const isHost = Boolean(hostToken);

  const refresh = useCallback(async () => {
    try {
      const d = await api.getRoom(code);
      setData(d);
      const lb = await api.leaderboard(code);
      setLeaderboard(lb.leaderboard);
      const pp = await api.pairingProgress(code);
      setProgress(pp);
    } catch (err) {
      setError(err.message);
    }
  }, [code]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2500); // simple polling; swap for Socket.io later
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

  async function handleFinishMatch(matchId, score1, score2, courtId) {
    try {
      await api.finishMatch(code, matchId, Number(score1), Number(score2), hostToken);
      // Auto-assign the next match to this same court immediately, using the
      // live queue at this exact moment — not whatever the "Next Up" preview
      // showed a few seconds earlier. If there aren't 4 players waiting yet,
      // this just fails quietly and the court stays empty for manual assign.
      try {
        await api.nextMatch(code, courtId, hostToken);
      } catch (nextErr) {
        // not enough players waiting — that's fine, leave court empty
      }
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCancelMatch(matchId) {
    try {
      await api.cancelMatch(code, matchId, hostToken);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleReassignMatch(matchId, courtId) {
    try {
      await api.cancelMatch(code, matchId, hostToken);
      try {
        await api.nextMatch(code, courtId, hostToken);
      } catch (nextErr) {
        // not enough players waiting right after cancel — that's fine,
        // leave the court empty for manual assign
      }
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

  async function handleAddPlayer(name, skillLevel) {
    try {
      await api.joinRoom(code, name, skillLevel);
      refresh();
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  if (error) return <div className="page"><p className="error">{error}</p></div>;
  if (!data) return <div className="page">Loading…</div>;

  const { room, queue, courts, activeMatches, players } = data;
  const findPlayer = (id) => players.find((p) => p.id === id);

  return (
    <div className="page dashboard-page">
      <h2>{room.title} <span className="code">#{room.code}</span></h2>
      {!isHost && <p className="hint">Viewing as player. Only the host's browser can control matches.</p>}

      <div className="dashboard-grid">
        <div className="dashboard-main">
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
                    onCancelMatch={handleCancelMatch}
                    onReassignMatch={handleReassignMatch}
                  />
                );
              })}
              {isHost && (
                <NextUpCard queue={queue} courts={courts} onMatch={handleNextMatch} />
              )}
            </div>
          </section>

          <section>
            <h3>Queue ({queue.length} waiting)</h3>
            <QueueList queue={queue} isHost={isHost} onRemove={handleRemovePlayer} />
          </section>

          <section>
            <h3>Session Progress</h3>
            <PairingProgress progress={progress} />
          </section>
        </div>

        <aside className="dashboard-side">
          {isHost && (
            <section>
              <h3>Add Player</h3>
              <AddPlayerForm onAdd={handleAddPlayer} />
            </section>
          )}

          {isHost && (
            <section>
              <h3>Manage Players ({players.length})</h3>
              <PlayerManageList players={players} onRemove={handleRemovePlayer} />
            </section>
          )}

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
        </aside>
      </div>
    </div>
  );
}
