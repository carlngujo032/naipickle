import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { findMyRoom, saveMyRoom } from "../myRooms.js";

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [skillLevel, setSkillLevel] = useState(3.0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const upperCode = code.trim().toUpperCase();
      const { room } = await api.verifyRoom(upperCode, password);

      // If this browser already joined this room, don't add the same player
      // twice — just reuse the existing spot (if the host hasn't removed it).
      const existing = findMyRoom(upperCode);
      let playerId = existing?.playerId;
      let playerToken = existing?.playerToken;
      let playerName = existing?.name || name;
      if (playerId) {
        const d = await api.getRoom(upperCode);
        if (!d.players.some((p) => p.id === playerId)) playerId = undefined;
      }
      if (!playerId) {
        const { player } = await api.joinRoom(upperCode, name, Number(skillLevel));
        playerId = player.id;
        playerToken = player.player_token; // lets this device manage its own break
        playerName = name;
      }

      saveMyRoom({ code: upperCode, title: room.title, role: "guest", name: playerName, playerId, playerToken });
      // replace: pressing Back from the room goes Home, not to this form
      navigate(`/room/${upperCode}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="back-link">← Back</Link>
        <h2>Join a Room</h2>
        <p className="hint">Enter the room code your host shared with you.</p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Room Code
            <input value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
          <label>
            Password (if required)
            <input value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label>
            Your Name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Skill Level (2.0–5.0)
            <input
              type="number" step="0.5" min={2} max={5}
              value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}
            />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Joining…" : "Join"}
          </button>
        </form>
      </div>
    </div>
  );
}
