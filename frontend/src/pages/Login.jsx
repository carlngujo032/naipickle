import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api.js";
import { saveAuth } from "../auth.js";
import AuthLayout from "../components/AuthLayout.jsx";
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
    <AuthLayout
      title={mode === "login" ? "Log in" : "Create your account"}
      subtitle={
        mode === "login"
          ? "Log in to keep your level and stats across sessions."
          : "Your level (1 to 5) is based on your win rate across all your games."
      }
    >
      <form onSubmit={handleSubmit} className="form">
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" autoComplete="username" required />
        </label>
        {mode === "register" && (
          <label>
            Display name (shown to everyone)
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={username} />
          </label>
        )}
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
          />
        </label>
        {mode === "register" && (
          <SecurityQuestionFields question={secQ} answer={secA} onQuestion={setSecQ} onAnswer={setSecA} />
        )}
        {error && <p className="error">{error}</p>}
        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
        </button>
      </form>
      {mode === "login" && (
        <p className="hint center"><Link to="/forgot">Forgot your password?</Link></p>
      )}
      <p className="hint center">
        {mode === "login" ? "No account yet? " : "Already have one? "}
        <button type="button" className="link-btn" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </p>
    </AuthLayout>
  );
}
