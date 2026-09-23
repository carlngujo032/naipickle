import { useMemo, useState } from "react";

// Shows a preview of the next match that "Assign Next 4" would create, using
// the same fair-priority queue order the backend uses. This is a preview
// only — nothing is booked until the host clicks Match.
//
// There are 3 distinct ways to split 4 people into two teams of 2. "Cancel"
// cycles through them so the host can look at alternates before committing.
// "Match" books the previewed four onto the first open court — the backend
// still runs its own balanced pairing, so the exact partners may shift
// slightly, same as before.
export default function NextUpCard({ queue, courts = [], onMatch }) {
  const [variant, setVariant] = useState(0);

  const nextFour = queue.slice(0, 4);
  const pairings = useMemo(() => {
    if (nextFour.length < 4) return [];
    const [a, b, c, d] = nextFour;
    return [
      [[a, b], [c, d]],
      [[a, c], [b, d]],
      [[a, d], [b, c]],
    ];
  }, [nextFour.map((p) => p.id).join(",")]);

  const openCourt = courts.find((c) => c.status === "empty");

  if (queue.length < 4) {
    return (
      <div className="court-card next-up-card empty">
        <h4>Next Up</h4>
        <p className="hint">Need {4 - queue.length} more in queue to preview the next match.</p>
      </div>
    );
  }

  const [team1, team2] = pairings[variant % pairings.length];

  return (
    <div className="court-card next-up-card">
      <h4>Next Up</h4>
      <p className="team">🟦 {team1[0].name} & {team1[1].name}</p>
      <p className="vs">vs</p>
      <p className="team">🟥 {team2[0].name} & {team2[1].name}</p>
      <p className="hint next-up-note">Preview — exact pairing may shift slightly when assigned.</p>
      <div className="court-actions">
        <button className="btn tiny" onClick={() => setVariant((v) => v + 1)}>
          Cancel
        </button>
        <button
          className="btn tiny match-btn"
          onClick={() => onMatch(openCourt.id)}
          disabled={!openCourt}
          title={openCourt ? undefined : "No open court right now"}
        >
          Match
        </button>
      </div>
      {!openCourt && <p className="hint">No open court right now.</p>}
    </div>
  );
}
