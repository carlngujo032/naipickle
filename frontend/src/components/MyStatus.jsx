import { FiActivity, FiClock, FiCoffee, FiCheckCircle, FiUserX } from "react-icons/fi";

// "You" panel for a player viewing the room from their own device:
// where they are right now, plus the Take a break / I'm back button.
export default function MyStatus({ player, queuePosition, courtNumber, canToggle, onToggleBreak }) {
  let text;
  let Icon = FiClock;
  let action = null;

  if (player.status === "playing") {
    Icon = FiActivity;
    text = courtNumber ? `You're playing on Court ${courtNumber}` : "You're playing right now";
  } else if (player.status === "waiting") {
    text = queuePosition ? `You're #${queuePosition} in the queue` : "You're in the queue";
    action = { label: "Take a break", onBreak: true, Icon: FiCoffee };
  } else if (player.status === "break") {
    Icon = FiCoffee;
    text = "You're on a break and will be skipped until you're back. Your stats are kept.";
    action = { label: "I'm back", onBreak: false, Icon: FiCheckCircle };
  } else {
    Icon = FiUserX;
    text = "The host removed you from this session.";
  }

  return (
    <div className={`my-status ${player.status}`}>
      <span className="my-status-icon"><Icon aria-hidden="true" /></span>
      <div className="my-status-body">
        <strong>{player.name}</strong>
        <span className="my-status-text">{text}</span>
      </div>
      {action && canToggle && (
        <button className="btn tiny secondary" onClick={() => onToggleBreak(action.onBreak)}>
          <action.Icon aria-hidden="true" /> {action.label}
        </button>
      )}
    </div>
  );
}
