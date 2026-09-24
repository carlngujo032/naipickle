import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api.js";
import { getMyRooms, removeMyRoom } from "../myRooms.js";

export default function Home() {
  const [rooms, setRooms] = useState(() => getMyRooms());
  // code -> { missing: true } | { players, waiting }  (live info from the server)
  const [info, setInfo] = useState({});

  // Peek at each saved room so we can show player counts and spot rooms
  // that no longer exist. Failures (offline, server waking up) are ignored.
  useEffect(() => {
    let cancelled = false;
    rooms.forEach(async (r) => {
      try {
        const d = await api.getRoom(r.code);
        if (!cancelled) {
          setInfo((prev) => ({
            ...prev,
            [r.code]: { players: d.players.length, waiting: d.queue.length },
          }));
        }
      } catch (err) {
        if (!cancelled && err.message === "Room not found") {
          setInfo((prev) => ({ ...prev, [r.code]: { missing: true } }));
        }
      }
    });
    return () => { cancelled = true; };
    // only on first load — removing a room shouldn't refetch the others
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleRemove(code) {
    removeMyRoom(code);
    setRooms(getMyRooms());
  }

  return (
    <div className="landing">
      <div className="landing-glow" />
      <div className="landing-content">
        <span className="landing-badge">🥒 Open Play, Organized</span>
        <h1>Pickleball<br />Open Play</h1>
        <p className="landing-sub">
          Run the queue, courts, and partner mixing for your open play
          session — no more whiteboards, no more "who's next?"
        </p>

        <div className="btn-row">
          <Link className="btn" to="/create">Create a Room</Link>
          <Link className="btn secondary" to="/join">Join a Room</Link>
        </div>

        {rooms.length > 0 && (
          <div className="my-rooms">
            <h3>Your Rooms</h3>
            <ul>
              {rooms.map((r) => {
                const i = info[r.code];
                const role = r.role === "host" ? "Host" : r.playerId ? "Player" : "Viewing";
                return (
                  <li key={r.code} className="my-room">
                    <div className="my-room-info">
                      <strong>{r.title}</strong>
                      <span className="my-room-meta">
                        #{r.code} · {role}
                        {i?.players != null && ` · ${i.players} players, ${i.waiting} waiting`}
                        {i?.missing && " · Room no longer exists"}
                      </span>
                    </div>
                    <div className="my-room-actions">
                      {!i?.missing && (
                        <Link className="btn tiny" to={`/room/${r.code}`}>Open</Link>
                      )}
                      <button
                        className="my-room-remove"
                        onClick={() => handleRemove(r.code)}
                        title="Remove from this list (the room itself is not deleted)"
                        aria-label={`Remove ${r.title} from your list`}
                      >
                        ×
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="feature-grid">
          <div className="feature-card">
            <span className="feature-icon">🎾</span>
            <h3>Fair Queue</h3>
            <p>Players rotate in based on games played and wait time — nobody sits out all night.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🔀</span>
            <h3>Smart Mixing</h3>
            <p>Balanced or random partner mixing keeps matches competitive and fresh.</p>
          </div>
          <div className="feature-card">
            <span className="feature-icon">🏆</span>
            <h3>Live Leaderboard</h3>
            <p>Wins, losses, and win rate update automatically as matches finish.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
