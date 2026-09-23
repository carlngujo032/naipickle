export default function PairingProgress({ progress }) {
  if (!progress || progress.totalPossiblePairs === 0) {
    return <p className="hint">Add at least 2 players to track pairing progress.</p>;
  }

  const { uniquePairsPlayed, totalPossiblePairs, complete } = progress;
  const pct = Math.min(Math.round((uniquePairsPlayed / totalPossiblePairs) * 100), 100);

  return (
    <div className="pairing-progress">
      <div className="pairing-bar">
        <div className="pairing-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="pairing-label">
        {uniquePairsPlayed} / {totalPossiblePairs} unique partner pairings played
        {complete && " — everyone has partnered with everyone! 🎉"}
      </p>
    </div>
  );
}
