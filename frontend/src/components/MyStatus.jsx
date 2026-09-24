// "You" panel for a player viewing the room from their own device:
// where they are right now, plus the Take a break / I'm back button.
export default function MyStatus({ player, queuePosition, courtNumber, canToggle, onToggleBreak }) {
  let text;
  let action = null;

  if (player.status === "playing") {
    text = courtNumber ? `You're playing on Court ${courtNumber} 🎾` : "You're playing right now 🎾";
  } else if (player.status === "waiting") {
    text = queuePosition ? `You're #${queuePosition} in the queue` : "You're in the queue";
    action = { label: "☕ Take a break", onBreak: true };
  } else if (player.status === "break") {
    text = "You're on a break — you'll be skipped until you're back. Your stats are kept.";
    action = { label: "✅ I'm back", onBreak: false };
  } else {
    text = "The host removed you from this session.";
  }

  return (
    <div className={`my-status ${player.status}`}>
      <div>
        <strong>{player.name}</strong>
        <span className="my-status-text">{text}</span>
      </div>
      {action && canToggle && (
        <button className="btn tiny" onClick={() => onToggleBreak(action.onBreak)}>
          {action.label}
        </button>
      )}
    </div>
  );
}
