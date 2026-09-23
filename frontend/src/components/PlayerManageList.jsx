const statusLabel = { waiting: "Waiting", playing: "On court", inactive: "Inactive" };

export default function PlayerManageList({ players, onRemove }) {
  return (
    <ul className="manage-list">
      {players.map((p) => (
        <li key={p.id}>
          <span className={`status-dot ${p.status}`} />
          {p.name}
          <span className="skill"> ({p.skill_level})</span>
          <span className="status-label">{statusLabel[p.status] || p.status}</span>
          <button className="btn tiny danger" onClick={() => onRemove(p.id)}>
            Remove
          </button>
        </li>
      ))}
      {!players.length && <p className="hint">No players yet — add one above.</p>}
    </ul>
  );
}
