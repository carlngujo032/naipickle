import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api.js";
import { useRoomLive } from "../useRoomLive.js";

const minutesSince = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));

// Read-only big-screen board for a TV / projector: open /room/<CODE>/tv on the
// screen. No host token needed, no buttons — it just mirrors the room live.
export default function TVBoard() {
  const { code } = useParams();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [error, setError] = useState("");
  const [, setTick] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [d, lb] = await Promise.all([api.getRoom(code), api.leaderboard(code)]);
      setData(d);
      setLeaderboard(lb.leaderboard);
      setError("");
    } catch (err) {
      // keep showing the last good screen on a hiccup; only a missing room is fatal
      if (err.message === "Room not found") setError(err.message);
    }
  }, [code]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  const connected = useRoomLive(code, refresh);

  // re-render every 30s so the "12 min" court timers keep counting
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  if (error) return <div className="tv"><h1>{error}</h1></div>;
  if (!data) return <div className="tv"><h1>Loading…</h1></div>;

  const { room, queue, courts, activeMatches, players } = data;
  const name = (id) => players.find((p) => p.id === id)?.name || "…";
  const onBreak = players.filter((p) => p.status === "break");
  const nextFour = queue.slice(0, 4);
  const afterThat = queue.slice(4, 12);

  return (
    <div className="tv">
      <header className="tv-header">
        <h1>{room.title}</h1>
        <div className="tv-meta">
          <span className="tv-code">Room code <strong>{room.code}</strong></span>
          <span className={`live-badge ${connected ? "on" : "off"}`}>
            {connected ? "● Live" : "○ Reconnecting…"}
          </span>
        </div>
      </header>

      {room.status === "closed" && (
        <div className="tv-ended">Session ended — thanks for playing! 🥒</div>
      )}

      <div className="tv-body">
        <section>
          <h2>Now Playing</h2>
          <div className="tv-court-grid">
            {courts.map((court) => {
              const m = activeMatches.find((x) => x.court_id === court.id);
              return (
                <div key={court.id} className={`tv-court ${m ? "playing" : "empty"}`}>
                  <div className="tv-court-title">
                    Court {court.court_number}
                    {m && <span className="tv-time">{minutesSince(m.started_at)} min</span>}
                  </div>
                  {m ? (
                    <>
                      <div className="tv-team">🟦 {name(m.team1_p1)} &amp; {name(m.team1_p2)}</div>
                      <div className="tv-vs">vs</div>
                      <div className="tv-team">🟥 {name(m.team2_p1)} &amp; {name(m.team2_p2)}</div>
                    </>
                  ) : (
                    <div className="tv-open">Open</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="tv-side">
          <section className="tv-panel">
            <h2>Up Next ({queue.length} waiting)</h2>
            {nextFour.length ? (
              <ol className="tv-queue">
                {nextFour.map((p, i) => (
                  <li key={p.id} className="next">
                    <span className="tv-pos">{i + 1}</span> {p.name}
                  </li>
                ))}
                {afterThat.map((p, i) => (
                  <li key={p.id}>
                    <span className="tv-pos">{i + 5}</span> {p.name}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tv-muted">Nobody waiting.</p>
            )}
            {queue.length > 12 && <p className="tv-muted">+ {queue.length - 12} more</p>}
            {onBreak.length > 0 && (
              <p className="tv-muted">☕ On break: {onBreak.map((p) => p.name).join(", ")}</p>
            )}
          </section>

          <section className="tv-panel">
            <h2>🏆 Top Players</h2>
            {leaderboard.length ? (
              <ol className="tv-queue">
                {leaderboard.slice(0, 5).map((p, i) => (
                  <li key={p.id}>
                    <span className="tv-pos">{i + 1}</span> {p.name}
                    <span className="tv-record">{p.wins}W–{p.losses}L</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="tv-muted">No completed games yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
