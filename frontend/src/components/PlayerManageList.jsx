import { FiCoffee, FiRotateCcw, FiUserMinus } from "react-icons/fi";
import LevelBadge from "./LevelBadge.jsx";

const statusLabel = { waiting: "Waiting", playing: "On court", break: "On break", inactive: "Left" };

export default function PlayerManageList({ players, onRemove, onBreak }) {
  return (
    <ul className="manage-list">
      {players.map((p) => (
        <li key={p.id}>
          <div className="pl-main">
            <span className={`status-dot ${p.status}`} />
            <span className="pl-name">{p.name}</span>
            <LevelBadge p={p} />
            <span className="status-label">{statusLabel[p.status] || p.status}</span>
          </div>
          <div className="pl-actions">
            {p.status === "waiting" && (
              <button className="btn tiny secondary" onClick={() => onBreak(p.id, true)}>
                <FiCoffee aria-hidden="true" /> Break
              </button>
            )}
            {(p.status === "break" || p.status === "inactive") && (
              <button className="btn tiny secondary" onClick={() => onBreak(p.id, false)}>
                <FiRotateCcw aria-hidden="true" /> Return
              </button>
            )}
            {p.status !== "inactive" && (
              <button className="btn tiny secondary danger-text" onClick={() => onRemove(p.id)}>
                <FiUserMinus aria-hidden="true" /> Remove
              </button>
            )}
          </div>
        </li>
      ))}
      {!players.length && <p className="hint">No players yet. Add one above.</p>}
    </ul>
  );
}
