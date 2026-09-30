export default function LiveBadge({ connected }) {
  return (
    <span className={`live-badge ${connected ? "on" : "off"}`}>
      <span className="dot" />
      {connected ? "Live" : "Reconnecting"}
    </span>
  );
}
