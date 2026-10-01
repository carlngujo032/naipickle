import { useEffect, useState } from "react";
import { FiFlag } from "react-icons/fi";

// A round is a block of games. Partners never repeat within a round, and the
// host can cap how many games a round has. Starting the next round resets the
// partner history. Everyone sees the progress; only the host gets controls.
export default function RoundCard({ round, playerCount, isHost, closed, onSetLimit, onNextRound }) {
  const { number, limit, played } = round;
  const [draft, setDraft] = useState(limit ?? "");
  useEffect(() => setDraft(limit ?? ""), [limit]);

  const maxFresh = Math.floor((playerCount * (playerCount - 1)) / 4);
  const pct = limit ? Math.min(Math.round((played / limit) * 100), 100) : 0;
  const complete = limit != null && played >= limit;

  function save() {
    const n = Number(draft);
    onSetLimit(draft === "" || n === 0 ? null : n);
  }

  return (
    <div className="round-card">
      <div className="round-head">
        <h4><FiFlag aria-hidden="true" /> Round {number}</h4>
        <span className={`pill ${complete ? "warn" : ""}`}>
          {limit ? `${played} / ${limit} games` : `${played} games \u00b7 no limit`}
        </span>
      </div>
      {limit ? (
        <div className="pairing-bar"><div className="pairing-bar-fill" style={{ width: `${pct}%` }} /></div>
      ) : null}
      {complete && <p className="hint">Round complete.</p>}

      {isHost && !closed && (
        <>
          <div className="round-controls">
            <label className="hint" htmlFor="round-limit">Games per round</label>
            <input
              id="round-limit"
              className="round-input"
              type="number"
              min="1"
              max="500"
              inputMode="numeric"
              placeholder="No limit"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <button className="btn tiny secondary" onClick={save} disabled={String(draft) === String(limit ?? "")}>Set</button>
            <button className="btn tiny" onClick={onNextRound}>Next round</button>
          </div>
          {playerCount >= 4 && (
            <p className="hint">
              {playerCount} players: up to {maxFresh} games with no repeat partners.
            </p>
          )}
        </>
      )}
    </div>
  );
}
