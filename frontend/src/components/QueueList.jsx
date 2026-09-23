export default function QueueList({ queue, isHost, onRemove }) {
  return (
    <ul className="queue-list">
      {queue.map((p, idx) => (
        <li key={p.id}>
          <span className="pos">#{idx + 1}</span> {p.name}
          <span className="skill"> ({p.skill_level})</span>
          <span className="games"> · {p.games_played} games</span>
          {isHost && (
            <button className="btn tiny danger" onClick={() => onRemove(p.id)}>
              Remove
            </button>
          )}
        </li>
      ))}
      {!queue.length && <p className="hint">Queue is empty.</p>}
    </ul>
  );
}
