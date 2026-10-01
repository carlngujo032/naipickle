import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { api } from "../api.js";
import { getAuth } from "../auth.js";
import { findMyRoom, saveMyRoom } from "../myRooms.js";

export default function JoinRoom() {
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState((searchParams.get("code") || "").toUpperCase());
  const [password, setPassword] = useState("");
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
      let playerName = existing?.name || me.display_name;
      if (playerId) {
        const d = await api.getRoom(upperCode);
        if (!d.players.some((p) => p.id === playerId)) playerId = undefined;
      }
      if (!playerId) {
        // Join as your account (name + level come from your profile). Joining
        // twice can't create a duplicate: the server reuses your existing spot.
        const { player } = await api.joinRoomAsAccount(upperCode);
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
          <>
            <p className="joining-as">
              Joining as <strong>{me.display_name}</strong>
              <span className={`level-badge lv-${me.level || 0}`}>{me.level ? `Lv ${me.level}` : "Unrated"}</span>
            </p>
            {error && <p className="error">{error}</p>}
            <button className="btn block" type="submit" disabled={submitting}>
              {submitting ? "Joining…" : "Join room"}
            </button>
          </>
        ) : (
          <>
            <p className="hint">
              You need an account to join a room, so your level and stats are saved and you can't
              be added twice.
            </p>
            <Link
              className="btn block"
              to={`/login?next=${encodeURIComponent(`/join${code ? `?code=${code.trim().toUpperCase()}` : ""}`)}`}
            >
              Log in or create an account
            </Link>
          </>
        )}
      </form>
    </AuthLayout>
  );
}
