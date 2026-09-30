import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { api } from "../api.js";
import { getAuth } from "../auth.js";
import { findMyRoom, saveMyRoom } from "../myRooms.js";

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [skillLevel, setSkillLevel] = useState(3.0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const auth = getAuth();
  const me = auth?.account;

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
      let playerName = existing?.name || (me ? me.display_name : name);
      if (playerId) {
        const d = await api.getRoom(upperCode);
        if (!d.players.some((p) => p.id === playerId)) playerId = undefined;
      }
      if (!playerId) {
        // Logged in: join as your account (name + level come from your profile)
        const { player } = me
          ? await api.joinRoomAsAccount(upperCode)
          : await api.joinRoom(upperCode, name, Number(skillLevel));
        playerId = player.id;
        playerToken = player.player_token; // lets this device manage its own break
        playerName = player.name;
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
    <AuthLayout title="Join a room" subtitle="Enter the room code your host shared with you.">
      <form onSubmit={handleSubmit} className="form">
        <label>
          Room code
          <input
            className="code-input"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            required
          />
        </label>
        <label>
          Password (if required)
          <input value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {me ? (
          <p className="joining-as">
            Joining as <strong>{me.display_name}</strong>
            <span className={`level-badge lv-${me.level || 0}`}>{me.level ? `Lv ${me.level}` : "Unrated"}</span>
          </p>
        ) : (
          <>
            <label>
              Your name
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label>
              Skill level (2.0 to 5.0)
              <input
                type="number" step="0.5" min={2} max={5}
                value={skillLevel} onChange={(e) => setSkillLevel(e.target.value)}
              />
            </label>
            <p className="hint">
              <Link to="/login?next=/join">Log in</Link> to play with your own level and stats.
            </p>
          </>
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? "Joining…" : "Join room"}
        </button>
      </form>
    </AuthLayout>
  );
}
