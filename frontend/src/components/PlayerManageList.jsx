const statusLabel = { waiting: "Waiting", playing: "On court", break: "On break", inactive: "Left" };

export default function PlayerManageList({ players, onRemove, onBreak }) {
  return (
    <ul className="manage-list">
      {players.map((p) => (
        <li key={p.id}>
          <span className={`status-dot ${p.status}`} />
          {p.name}
          <span className="skill"> ({p.skill_level})</span>
          <span className="status-label">{statusLabel[p.status] || p.status}</span>
          {p.status === "waiting" && (
            <button className="btn tiny secondary" onClick={() => onBreak(p.id, true)}>
              Break
            </button>
          )}
          {(p.status === "break" || p.status === "inactive") && (
            <button className="btn tiny secondary" onClick={() => onBreak(p.id, false)}>
              Return
            </button>
          )}
          {p.status !== "inactive" && (
            <button className="btn tiny danger" onClick={() => onRemove(p.id)}>
              Remove
            </button>
          )}
        </li>
      ))}
      {!players.length && <p className="hint">No players yet — add one above.</p>}
    </ul>
  );
}
