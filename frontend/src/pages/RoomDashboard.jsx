import { useEffect, useState, useCallback, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api.js";
import { saveMyRoom, removeMyRoom, findMyRoom } from "../myRooms.js";
import { useRoomLive } from "../useRoomLive.js";
import QueueList from "../components/QueueList.jsx";
import CourtCard from "../components/CourtCard.jsx";
import AddPlayerForm from "../components/AddPlayerForm.jsx";
import PlayerManageList from "../components/PlayerManageList.jsx";
import PairingProgress from "../components/PairingProgress.jsx";
import NextUpCard from "../components/NextUpCard.jsx";
import MyStatus from "../components/MyStatus.jsx";

export default function RoomDashboard() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loadError, setLoadError] = useState(""); // room can't be shown at all
  const [notice, setNotice] = useState(""); // a failed action — shown briefly, page stays usable
  const noticeTimer = useRef(null);
  const loaded = useRef(false);
  const hostToken = localStorage.getItem(`host_${code}`);
  const isHost = Boolean(hostToken);
  const mine = findMyRoom(code); // this browser's own saved player (playerId / playerToken)

  function showNotice(msg) {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 5000);
  }
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const refresh = useCallback(async () => {
    try {
      const [d, lb, pp] = await Promise.all([
        api.getRoom(code),
        api.leaderboard(code),
        api.pairingProgress(code),
      ]);
      setData(d);
      setLeaderboard(lb.leaderboard);
      setProgress(pp);
      loaded.current = true;
      setLoadError("");
    } catch (err) {
      // Room was deleted on the server — drop it from "Your Rooms"
      if (err.message === "Room not found") {
        removeMyRoom(code);
        setLoadError(err.message);
      } else if (!loaded.current) {
        setLoadError(err.message);
      }
      // Otherwise (a hiccup after the page already loaded) keep showing the
      // last good data; the "Reconnecting…" badge tells the user.
    }
  }, [code]);

  // Remember this room so it shows up in "Your Rooms" on the Home page
  // (also covers opening a room straight from a shared link).
  const roomTitle = data?.room?.title;
  useEffect(() => {
    if (roomTitle) saveMyRoom({ code, title: roomTitle, role: isHost ? "host" : "guest" });
  }, [code, roomTitle, isHost]);

  // First load, and again if the room code in the URL changes
  useEffect(() => {
    loaded.current = false;
    setData(null);
    setLoadError("");
    refresh();
  }, [refresh]);

  // Instant updates pushed by the server (with a slow safety refresh underneath)
  const connected = useRoomLive(code, refresh);

  async function handleNextMatch(courtId) {
    try {
      await api.nextMatch(code, courtId, hostToken);
      refresh();
    } catch (err) {
      showNotice(err.message);
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
      showNotice(err.message);
    }
  }

  async function handleCancelMatch(matchId) {
    try {
      await api.cancelMatch(code, matchId, hostToken);
      refresh();
    } catch (err) {
      showNotice(err.message);
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
      showNotice(err.message);
    }
  }

  async function handleRemovePlayer(playerId) {
    try {
      await api.removePlayer(code, playerId, hostToken);
      refresh();
    } catch (err) {
      showNotice(err.message);
    }
  }

  async function handleAddPlayer(name, skillLevel) {
    try {
      await api.joinRoom(code, name, skillLevel);
      refresh();
    } catch (err) {
      showNotice(err.message);
      throw err;
    }
  }

  // Take a break / come back. Works for your own player (player token) and,
  // in the host's browser, for anyone (host token).
  async function handleToggleBreak(playerId, onBreak) {
    try {
      await api.setBreak(code, playerId, onBreak, {
        hostToken,
        playerToken: mine?.playerId === playerId ? mine.playerToken : undefined,
      });
      refresh();
    } catch (err) {
      showNotice(err.message);
    }
  }

  async function handleEndSession() {
    if (
      !window.confirm(
        "End this session? Nobody can join or be assigned to courts after this. You can still see the summary, and reopen the session later."
      )
    ) {
      return;
    }
    try {
      await api.updateRoom(code, { status: "closed" }, hostToken);
      navigate(`/room/${code}/summary`);
    } catch (err) {
      showNotice(err.message);
    }
  }

  async function handleReopen() {
    try {
      await api.updateRoom(code, { status: "open" }, hostToken);
      refresh();
    } catch (err) {
      showNotice(err.message);
    }
  }

  if (loadError) {
    return (
      <div className="page">
        <p className="error">{loadError}</p>
        <Link to="/" className="back-link">← Back to Your Rooms</Link>
      </div>
    );
  }
  if (!data) return <div className="page">Loading…</div>;

  const { room, queue, courts, activeMatches, players } = data;
  const findPlayer = (id) => players.find((p) => p.id === id);
  const onBreak = players.filter((p) => p.status === "break");
  const closed = room.status === "closed";

  const me = mine?.playerId ? findPlayer(mine.playerId) : null;
  const myMatch = me && activeMatches.find((m) => [m.team1_p1, m.team1_p2, m.team2_p1, m.team2_p2].includes(me.id));
  const myCourt = myMatch && courts.find((c) => c.id === myMatch.court_id);

  return (
    <div className="page dashboard-page">
      <Link to="/" className="back-link">← Your Rooms</Link>
      <div className="room-header">
        <h2>{room.title} <span className="code">#{room.code}</span></h2>
        <div className="room-header-actions">
          <span className={`live-badge ${connected ? "on" : "off"}`}>
            {connected ? "● Live" : "○ Reconnecting…"}
          </span>
          <Link className="btn tiny secondary" to={`/room/${code}/tv`} target="_blank" rel="noreferrer">
            📺 TV Board
          </Link>
          <Link className="btn tiny secondary" to={`/room/${code}/summary`}>📊 Summary</Link>
          {isHost && !closed && (
            <button className="btn tiny danger" onClick={handleEndSession}>End Session</button>
          )}
          {isHost && closed && (
            <button className="btn tiny" onClick={handleReopen}>Reopen</button>
          )}
        </div>
      </div>

      {notice && <p className="notice-banner">{notice}</p>}
      {closed && (
        <p className="closed-banner">
          This session has ended. <Link to={`/room/${code}/summary`}>See the summary</Link>
        </p>
      )}
      {!isHost && <p className="hint">Viewing as player. Only the host's browser can control matches.</p>}

      {me && (
        <MyStatus
          player={me}
          queuePosition={queue.findIndex((p) => p.id === me.id) + 1}
          courtNumber={myCourt?.court_number}
          canToggle={Boolean(mine.playerToken) || isHost}
          onToggleBreak={(onBreakNow) => handleToggleBreak(me.id, onBreakNow)}
        />
      )}

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
              {isHost && !closed && (
                <NextUpCard queue={queue} courts={courts} onMatch={handleNextMatch} />
              )}
            </div>
          </section>

          <section>
            <h3>Queue ({queue.length} waiting)</h3>
            <QueueList queue={queue} isHost={isHost} onRemove={handleRemovePlayer} />
          </section>

          {onBreak.length > 0 && (
            <section>
              <h3>☕ On Break ({onBreak.length})</h3>
              <ul className="break-list">
                {onBreak.map((p) => (
                  <li key={p.id}>
                    {p.name}
                    <span className="games"> · {p.games_played} games</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section>
            <h3>Session Progress</h3>
            <PairingProgress progress={progress} />
          </section>
        </div>

        <aside className="dashboard-side">
          {isHost && !closed && (
            <section>
              <h3>Add Player</h3>
              <AddPlayerForm onAdd={handleAddPlayer} />
            </section>
          )}

          {isHost && (
            <section>
              <h3>Manage Players ({players.length})</h3>
              <PlayerManageList
                players={players}
                onRemove={handleRemovePlayer}
                onBreak={handleToggleBreak}
              />
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
