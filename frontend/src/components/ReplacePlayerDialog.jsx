import { useEffect, useState } from "react";
import { api } from "../api.js";

// Replace ONE player in a game that's already on court. The other three keep
// playing; the replacement is picked from the people waiting in the queue
// (players who wouldn't repeat a partner are listed first).
export default function ReplacePlayerDialog({ code, hostToken, match, outPlayerId, nextUpIds, onClose, onDone }) {
  const [info, setInfo] = useState(null); // { out, partner, candidates }
  const [chosen, setChosen] = useState(null);
  const [outStatus, setOutStatus] = useState("waiting");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .replaceOptions(code, match.id, outPlayerId, hostToken)
      .then((d) => {
        if (cancelled) return;
        setInfo(d);
        setChosen(d.candidates[0]?.id ?? null);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [code, match.id, outPlayerId, hostToken]);

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api.replacePlayer(code, match.id, { outPlayerId, inPlayerId: chosen, outStatus }, hostToken);
      onDone();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  }

  const outName = info?.out.name || "this player";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={`Replace ${outName}`} onClick={(e) => e.stopPropagation()}>
        <h3>Replace {outName}</h3>
        <p className="hint">
          The other three keep playing{info ? <>; {info.partner.name} teams up with the replacement</> : null}.
          {" "}{outName} gets no stats for this game.
        </p>

        {!info && !error && <p className="hint">Loading…</p>}

        {info && info.candidates.length === 0 && (
          <p className="hint">Nobody is waiting in the queue right now. Add a player first, or cancel the match.</p>
        )}

        {info && info.candidates.length > 0 && (
          <ul className="replace-list">
            {info.candidates.map((c) => (
              <li key={c.id}>
                <label>
                  <input type="radio" name="replacement" checked={chosen === c.id} onChange={() => setChosen(c.id)} />
                  <span className="replace-name">{c.name}</span>
                  <span className="games">{c.games_played} games</span>
                  {nextUpIds.has(c.id) && <span className="pill">Next up</span>}
                  {c.repeat && <span className="pill warn">partnered before</span>}
                </label>
              </li>
            ))}
          </ul>
        )}

        {info && (
          <label className="replace-out">
            <span className="hint">What happens to {outName}?</span>
            <select value={outStatus} onChange={(e) => setOutStatus(e.target.value)}>
              <option value="waiting">Back to the queue</option>
              <option value="break">Take a break</option>
              <option value="inactive">Leaves the session</option>
            </select>
          </label>
        )}

        {error && <p className="hint" style={{ color: "#b91c1c" }}>{error}</p>}

        <div className="court-actions-row">
          <button className="btn tiny secondary" onClick={onClose} disabled={busy}>Close</button>
          <button className="btn tiny" onClick={confirm} disabled={busy || chosen == null}>
            {busy ? "Replacing…" : "Replace"}
          </button>
        </div>
      </div>
    </div>
  );
}
