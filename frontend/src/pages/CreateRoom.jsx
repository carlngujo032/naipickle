import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";
import { saveMyRoom } from "../myRooms.js";
import AuthLayout from "../components/AuthLayout.jsx";

export default function CreateRoom() {
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(24);
  const [maxCourts, setMaxCourts] = useState(4);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { room, hostToken } = await api.createRoom({
        title,
        password: password || undefined,
        maxPlayers: Number(maxPlayers),
        maxCourts: Number(maxCourts),
      });
      // Save host token locally so this browser can manage the room
      localStorage.setItem(`host_${room.code}`, hostToken);
      saveMyRoom({ code: room.code, title: room.title, role: "host" });
      // replace: pressing Back from the room goes Home, not to this form
      navigate(`/room/${room.code}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create a room" subtitle="Set it up, share the code, and start the queue.">
      <form onSubmit={handleSubmit} className="form">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday open play" required />
        </label>
        <label>
          Password (optional)
          <input value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <div className="field-row">
          <label>
            Max players
            <input type="number" inputMode="numeric" min={4} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
          </label>
          <label>
            Courts
            <input type="number" inputMode="numeric" min={1} value={maxCourts} onChange={(e) => setMaxCourts(e.target.value)} />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create room"}
        </button>
      </form>
    </AuthLayout>
  );
}
