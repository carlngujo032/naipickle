import { useState } from "react";
<<<<<<< HEAD
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
=======
import { Link, useNavigate } from "react-router-dom";
>>>>>>> a3f517009490b327dc1dba091cf1048e3b9ed8ba
import { api } from "../api.js";

export default function ForgotPassword() {
  const [username, setUsername] = useState("");
  const [question, setQuestion] = useState(null); // null = step 1
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function findAccount(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const d = await api.securityQuestion(username.trim());
      setQuestion(d.question);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function reset(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await api.resetPassword(username.trim(), answer, newPassword);
      navigate("/login", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
<<<<<<< HEAD
    <AuthLayout title="Reset your password" back="/login" backLabel="Back to log in">
      {question === null ? (
        <form onSubmit={findAccount} className="form">
          <p className="hint">Enter your username and we'll ask your security question.</p>
          <label>
            Username
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn block" type="submit" disabled={submitting}>Continue</button>
        </form>
      ) : (
        <form onSubmit={reset} className="form">
          <p className="question">{question}</p>
          <label>
            Your answer
            <input value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" required />
          </label>
          <label>
            New password
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required />
          </label>
          {error && <p className="error">{error}</p>}
          <button className="btn block" type="submit" disabled={submitting}>Set new password</button>
        </form>
      )}
    </AuthLayout>
=======
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/login" className="back-link">← Back to log in</Link>
        <h2>Reset your password</h2>
        {question === null ? (
          <form onSubmit={findAccount} className="form">
            <p className="hint">Enter your username and we'll ask your security question.</p>
            <label>
              Username
              <input value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn" type="submit" disabled={submitting}>Continue</button>
          </form>
        ) : (
          <form onSubmit={reset} className="form">
            <p><strong>{question}</strong></p>
            <label>
              Your answer
              <input value={answer} onChange={(e) => setAnswer(e.target.value)} autoComplete="off" required />
            </label>
            <label>
              New password
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </label>
            {error && <p className="error">{error}</p>}
            <button className="btn" type="submit" disabled={submitting}>Set new password</button>
          </form>
        )}
      </div>
    </div>
>>>>>>> a3f517009490b327dc1dba091cf1048e3b9ed8ba
  );
}
