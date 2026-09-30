import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight, FiUser, FiLogIn, FiX, FiUsers, FiShuffle, FiTrendingUp, FiMonitor,
  FiBarChart2, FiCoffee, FiPlusCircle, FiUserPlus, FiPlayCircle, FiZap,
} from "react-icons/fi";
import { api } from "../api.js";
import { getMyRooms, removeMyRoom } from "../myRooms.js";
import { getAuth } from "../auth.js";
<<<<<<< HEAD
import Brand from "../components/Brand.jsx";

const STEPS = [
  { icon: FiPlusCircle, title: "Create a room", text: "Name your session, choose the number of courts, and share the room code." },
  { icon: FiUserPlus, title: "Players join", text: "Players join from their phones with the code. Registered players bring their level with them." },
  { icon: FiPlayCircle, title: "Run the games", text: "Assign courts in one tap, enter scores, and the queue and stats update for everyone." },
];

const FEATURES = [
  { icon: FiUsers, title: "Fair rotation queue", text: "Players rotate by games played and wait time, so nobody sits out all night." },
  { icon: FiShuffle, title: "Smart pairing", text: "Balanced mode mixes skill levels across teams. Random mode keeps things fresh." },
  { icon: FiTrendingUp, title: "Player levels", text: "Accounts earn a level from 1 to 5 based on lifetime win rate, recalculated after every game." },
  { icon: FiZap, title: "Instant updates", text: "Courts, queue and scores sync live on every device. No refreshing." },
  { icon: FiMonitor, title: "TV board", text: "A read-only big-screen view of courts, the queue and top players for your venue." },
  { icon: FiBarChart2, title: "Session summary", text: "Top player, most games played and attendance, ready when the session ends." },
  { icon: FiCoffee, title: "Break mode", text: "Players can sit out a round and keep their stats. Matchmaking skips them until they return." },
];
=======
>>>>>>> a3f517009490b327dc1dba091cf1048e3b9ed8ba

export default function Home() {
  const [rooms, setRooms] = useState(() => getMyRooms());
  const me = getAuth()?.account;
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
<<<<<<< HEAD
    <div className="site">
      <header className="site-nav">
        <Brand light />
        <nav>
          {me ? (
            <Link to="/profile" className="nav-link">
              <FiUser aria-hidden="true" /> {me.display_name}
              <span className="nav-level">{me.level ? `Lv ${me.level}` : "Unrated"}</span>
            </Link>
          ) : (
            <Link to="/login" className="nav-link"><FiLogIn aria-hidden="true" /> Log in</Link>
          )}
        </nav>
      </header>
=======
    <div className="landing">
      <div className="landing-glow" />
      <div className="landing-content">
        <div className="auth-bar">
          {me ? (
            <Link to="/profile">👤 {me.display_name}{me.level ? ` · Lv ${me.level}` : " · Unrated"}</Link>
          ) : (
            <Link to="/login">Log in / Sign up</Link>
          )}
        </div>
        <span className="landing-badge">🥒 Open Play, Organized</span>
        <h1>Pickleball<br />Open Play</h1>
        <p className="landing-sub">
          Run the queue, courts, and partner mixing for your open play
          session — no more whiteboards, no more "who's next?"
        </p>
>>>>>>> a3f517009490b327dc1dba091cf1048e3b9ed8ba

      <section className="hero">
        <div className="hero-inner">
          <div className="hero-copy">
            <span className="eyebrow">Open play management</span>
            <h1>Run open play without the whiteboard.</h1>
            <p className="hero-sub">
              Queue, courts, partner mixing and player levels in one place. Built for
              clubs and groups who want every session to run smoothly.
            </p>
            <div className="btn-row">
              <Link className="btn on-dark" to="/create">Create a room <FiArrowRight aria-hidden="true" /></Link>
              <Link className="btn outline-light" to="/join">Join a room</Link>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="mock">
              <div className="mock-head"><strong>Court 1</strong><span className="pill live">In play</span></div>
              <div className="mock-team"><span className="team-dot t1" />Alex &amp; Sam<b>11</b></div>
              <div className="mock-vs">vs</div>
              <div className="mock-team"><span className="team-dot t2" />Jordan &amp; Casey<b>8</b></div>
              <div className="mock-queue">
                <span>Up next</span>
                <ol>
                  <li><i>1</i>Riley</li>
                  <li><i>2</i>Morgan</li>
                  <li><i>3</i>Taylor</li>
                </ol>
              </div>
            </div>
          </div>
        </div>

        {rooms.length > 0 && (
          <div className="my-rooms">
            <h3>Your rooms</h3>
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
                        <Link className="btn tiny on-dark" to={`/room/${r.code}`}>Open</Link>
                      )}
                      <button
                        className="my-room-remove"
                        onClick={() => handleRemove(r.code)}
                        title="Remove from this list (the room itself is not deleted)"
                        aria-label={`Remove ${r.title} from your list`}
                      >
                        <FiX aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-inner">
          <h2 className="section-title">How it works</h2>
          <p className="section-sub">From an empty court to a full rotation in three steps.</p>
          <ol className="steps">
            {STEPS.map((s, idx) => (
              <li key={s.title} className="step">
                <span className="step-num">{idx + 1}</span>
                <s.icon className="step-icon" aria-hidden="true" />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section alt">
        <div className="section-inner">
          <h2 className="section-title">Everything a session needs</h2>
          <p className="section-sub">Tools for hosts, and a simple experience for players.</p>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="feature-card">
                <span className="feature-icon"><f.icon aria-hidden="true" /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-band">
        <div className="section-inner">
          <h2>Ready for your next session?</h2>
          <p>Create a room in under a minute and invite your players.</p>
          <div className="btn-row">
            <Link className="btn on-dark" to="/create">Create a room <FiArrowRight aria-hidden="true" /></Link>
            <Link className="btn outline-light" to="/login">Create a player account</Link>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <Brand light />
        <span>Open play, organized.</span>
      </footer>
    </div>
  );
}
