// Shown when a player taps Back or "Leave room": either keep their spot in the
// queue and come back later, or leave the room (which frees the spot).
export default function LeaveRoomDialog({ playerName, onPlaying, busy, error, onStay, onLeave, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Leave this room?" onClick={(e) => e.stopPropagation()}>
        <h3>Leave this room?</h3>
        <p className="hint">
          <strong>Keep my spot</strong> takes you back to the home page, but {playerName} stays in the
          queue so you can come back any time.
        </p>
        <p className="hint">
          <strong>Leave room</strong> removes you from the queue. You can join again later.
        </p>
        {onPlaying && <p className="hint">You're on court right now, so finish your game before leaving.</p>}
        {error && <p className="hint" style={{ color: "#b91c1c" }}>{error}</p>}
        <div className="leave-actions">
          <button className="btn block" onClick={onStay} disabled={busy}>Keep my spot</button>
          <button className="btn block secondary" onClick={onLeave} disabled={busy || onPlaying}>
            {busy ? "Leaving…" : "Leave room"}
          </button>
          <button className="btn block secondary" onClick={onClose} disabled={busy}>Stay on this page</button>
        </div>
      </div>
    </div>
  );
}
