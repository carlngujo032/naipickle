import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut } from "react-icons/fi";
import AuthLayout from "../components/AuthLayout.jsx";
import Loading from "../components/Loading.jsx";
import { api } from "../api.js";
import { clearAuth, getAuth, saveAuth } from "../auth.js";
import SecurityQuestionFields from "../components/SecurityQuestionFields.jsx";

const BANDS = [
  { level: 5, label: "75% and up" },
  { level: 4, label: "60 to 74%" },
  { level: 3, label: "45 to 59%" },
  { level: 2, label: "30 to 44%" },
  { level: 1, label: "under 30%" },
];

export default function Profile() {
  const navigate = useNavigate();
  const auth = getAuth();
  const [account, setAccount] = useState(auth?.account || null);
  const [error, setError] = useState("");
  const [secOpen, setSecOpen] = useState(false);
  const [secPw, setSecPw] = useState("");
  const [secQ, setSecQ] = useState("");
  const [secA, setSecA] = useState("");
  const [secMsg, setSecMsg] = useState("");

  useEffect(() => {
    if (!auth) {
      navigate("/login?next=/profile", { replace: true });
      return;
    }
    api.me()
      .then(({ account }) => {
        setAccount(account);
        saveAuth(auth.token, account);
      })
      .catch((err) => {
        // expired / invalid session
        clearAuth();
        setError(err.message);
        navigate("/login?next=/profile", { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    try { await api.logout(); } catch { /* still log out locally */ }
    clearAuth();
    navigate("/", { replace: true });
  }

  async function saveSecurity(e) {
    e.preventDefault();
    setSecMsg("");
    try {
      await api.setSecurity(secPw, secQ, secA);
      setAccount({ ...account, has_security_question: true });
      setSecOpen(false);
      setSecPw(""); setSecA("");
      setSecMsg("Security question saved.");
    } catch (err) {
      setSecMsg(err.message);
    }
  }

  if (!account) return <Loading />;

  const rate = Math.round(account.win_rate * 100);
  const toGo = Math.max(account.min_rated_games - account.games_played, 0);

  return (
    <AuthLayout title={account.display_name} subtitle={`@${account.username}`}>
      <div className="profile">

        <div className="profile-level">
          <span className={`level-badge big lv-${account.level || 0}`}>
            {account.level ? `Level ${account.level}` : "Unrated"}
          </span>
          {!account.level && (
            <p className="hint">Play {toGo} more game{toGo === 1 ? "" : "s"} to get your level.</p>
          )}
        </div>

        <ul className="profile-stats">
          <li><strong>{account.games_played}</strong><span>Games</span></li>
          <li><strong>{account.wins}</strong><span>Wins</span></li>
          <li><strong>{account.losses}</strong><span>Losses</span></li>
          <li><strong>{rate}%</strong><span>Win rate</span></li>
        </ul>

        <h3>How levels work</h3>
        <p className="hint">
          Your level follows your win rate over all your games — win more and it can go up, lose
          more and it can go down.
        </p>
        <ul className="level-table">
          {BANDS.map((b) => (
            <li key={b.level} className={account.level === b.level ? "you" : ""}>
              <span className={`level-badge lv-${b.level}`}>Lv {b.level}</span> {b.label}
            </li>
          ))}
        </ul>

        <h3>Password reset</h3>
        <p className="hint">
          {account.has_security_question
            ? "Your security question is set. You can use it on the Forgot password page."
            : "Set a security question so you can reset your password if you forget it."}
        </p>
        {secMsg && <p className="hint">{secMsg}</p>}
        {secOpen ? (
          <form onSubmit={saveSecurity} className="form">
            <SecurityQuestionFields question={secQ} answer={secA} onQuestion={setSecQ} onAnswer={setSecA} />
            <label>
              Current password
              <input type="password" value={secPw} onChange={(e) => setSecPw(e.target.value)} required />
            </label>
            <button className="btn block" type="submit">Save</button>
          </form>
        ) : (
          <button className="btn secondary block" onClick={() => setSecOpen(true)}>
            {account.has_security_question ? "Change security question" : "Set security question"}
          </button>
        )}

        <div className="spacer" />
        <button className="btn secondary block" onClick={handleLogout}>
          <FiLogOut aria-hidden="true" /> Log out
        </button>
      </div>
    </AuthLayout>
  );
}
