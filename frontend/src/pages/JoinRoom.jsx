import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api.js";

export default function JoinRoom() {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [skillLevel, setSkillLevel] = useState(3.0);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const upperCode = code.trim().toUpperCase();
      await api.verifyRoom(upperCode, password);
      await api.joinRoom(upperCode, name, Number(skillLevel));
      navigate(`/room/${upperCode}`);
    } catch (err) {
      setError(err.message);
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
          <button className="btn" type="submit">Join</button>
        </form>
      </div>
    </div>
  );
}
