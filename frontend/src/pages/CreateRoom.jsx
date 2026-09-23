import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function CreateRoom() {
  const [title, setTitle] = useState("");
  const [password, setPassword] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(24);
  const [maxCourts, setMaxCourts] = useState(4);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const { room, hostToken } = await api.createRoom({
        title,
        password: password || undefined,
        maxPlayers: Number(maxPlayers),
        maxCourts: Number(maxCourts),
      });
      // Save host token locally so this browser can manage the room
      localStorage.setItem(`host_${room.code}`, hostToken);
      navigate(`/room/${room.code}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h2>Create a Room</h2>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label>
          Password (optional)
          <input value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <label>
          Max Players
          <input type="number" min={4} value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
        </label>
        <label>
          Number of Courts
          <input type="number" min={1} value={maxCourts} onChange={(e) => setMaxCourts(e.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn" type="submit">Create Room</button>
      </form>
    </div>
  );
}
