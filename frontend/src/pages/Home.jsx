import { Link } from "react-router-dom";

export default function Home() {
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
