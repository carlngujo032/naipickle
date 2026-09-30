import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { saveAuth } from "../auth.js";
import SecurityQuestionFields from "../components/SecurityQuestionFields.jsx";

export default function Login() {
  const [mode, setMode] = useState("login"); // login | register
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [secQ, setSecQ] = useState("");
  const [secA, setSecA] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { token, account } =
        mode === "login"
          ? await api.login(username, password)
          : await api.register(username, displayName, password, secQ, secA);
      saveAuth(token, account);
      navigate(next, { replace: true });
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
        <h2>{mode === "login" ? "Log in" : "Create your account"}</h2>
        <p className="hint">
          {mode === "login"
            ? "Log in to keep your level and stats across sessions."
            : "Your level (1–5) is based on your win rate across all your games."}
        </p>
        <form onSubmit={handleSubmit} className="form">
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" required />
          </label>
          {mode === "register" && (
            <label>
              Display name (shown to everyone)
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={username} />
            </label>
          )}
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {mode === "register" && (
            <SecurityQuestionFields question={secQ} answer={secA} onQuestion={setSecQ} onAnswer={setSecA} />
          )}
          {error && <p className="error">{error}</p>}
          <button className="btn" type="submit" disabled={submitting}>
            {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
          </button>
        </form>
        {mode === "login" && (
          <p className="hint"><Link to="/forgot">Forgot your password?</Link></p>
        )}
        <p className="hint">
          {mode === "login" ? "No account yet? " : "Already have one? "}
          <button type="button" className="link-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
}
