import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page center">
      <h1>🥒 Pickleball Open Play</h1>
      <p>Run queues, courts, and partner mixing for your open play sessions.</p>
      <div className="btn-row">
        <Link className="btn" to="/create">Create a Room</Link>
        <Link className="btn secondary" to="/join">Join a Room</Link>
      </div>
    </div>
  );
}
