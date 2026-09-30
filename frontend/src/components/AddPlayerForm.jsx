import { useEffect, useRef, useState } from "react";
import { FiSearch, FiUserPlus } from "react-icons/fi";
import LevelBadge from "./LevelBadge.jsx";

// Host's "Add player": type to search registered players, pick one from the
// dropdown, or press Add to put the typed name in as a guest (no account/level).
export default function AddPlayerForm({ onAdd, onAddAccount, loadAccounts }) {
  const [text, setText] = useState("");
  const [skillLevel, setSkillLevel] = useState(3.0);
  const [accounts, setAccounts] = useState([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const boxRef = useRef(null);

  // Refresh the list whenever the dropdown opens (so people already added disappear)
  useEffect(() => {
    if (!open || !loadAccounts) return;
    let cancelled = false;
    loadAccounts("")
      .then((d) => { if (!cancelled) setAccounts(d.accounts); })
      .catch(() => { if (!cancelled) setAccounts([]); });
    return () => { cancelled = true; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close when tapping outside
  useEffect(() => {
    function onDoc(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const q = text.trim().toLowerCase();
  const matches = accounts.filter(
    (a) => !q || a.username.includes(q) || a.display_name.toLowerCase().includes(q)
  );

  async function run(fn) {
    setSubmitting(true);
    try {
      await fn();
      setText("");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function pick(a) {
    run(() => onAddAccount(a.id));
  }

  function addGuest(e) {
    e.preventDefault();
    if (!text.trim()) return;
    run(async () => {
      await onAdd(text.trim(), Number(skillLevel));
      setSkillLevel(3.0);
    });
  }

  return (
    <form onSubmit={addGuest} className="add-player-form" ref={boxRef}>
      <div className="combo">
        <FiSearch className="combo-icon" aria-hidden="true" />
        <input
          placeholder="Search registered players"
          value={text}
          onChange={(e) => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        {open && (
          <ul className="combo-list">
            {matches.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => pick(a)} disabled={submitting}>
                  <span>{a.display_name} <span className="skill">@{a.username}</span></span>
                  <LevelBadge p={{ account_id: a.id, level: a.level }} />
                </button>
              </li>
            ))}
            {!matches.length && <li className="combo-empty">No registered player found</li>}
          </ul>
        )}
      </div>
      <div className="guest-row">
        <label className="guest-skill">
          Guest skill
          <input
            type="number" step="0.5" min={2} max={5}
            title="Guest skill level (2.0 to 5.0). Only used for guests without an account."
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
          />
        </label>
        <button className="btn secondary" type="submit" disabled={submitting || !text.trim()} title="Add the typed name as a guest">
          <FiUserPlus aria-hidden="true" /> Add as guest
        </button>
      </div>
    </form>
  );
}
