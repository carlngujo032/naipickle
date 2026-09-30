<<<<<<< HEAD
import { FiX } from "react-icons/fi";
=======
>>>>>>> a3f517009490b327dc1dba091cf1048e3b9ed8ba
import LevelBadge from "./LevelBadge.jsx";

export default function QueueList({ queue, isHost, onRemove }) {
  return (
    <ul className="queue-list">
      {queue.map((p, idx) => (
        <li key={p.id}>
<<<<<<< HEAD
          <span className="pos">{idx + 1}</span>
          <span className="q-name">{p.name}</span>
          <LevelBadge p={p} />
          <span className="games">{p.games_played} {p.games_played === 1 ? "game" : "games"}</span>
=======
          <span className="pos">#{idx + 1}</span> {p.name}
          <LevelBadge p={p} />
          <span className="games"> · {p.games_played} games</span>
>>>>>>> a3f517009490b327dc1dba091cf1048e3b9ed8ba
          {isHost && (
            <button className="icon-btn danger" onClick={() => onRemove(p.id)} aria-label={`Remove ${p.name}`}>
              <FiX aria-hidden="true" />
            </button>
          )}
        </li>
      ))}
      {!queue.length && <p className="hint">Queue is empty.</p>}
    </ul>
  );
}
