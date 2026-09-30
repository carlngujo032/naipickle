import { useMemo, useState } from "react";
import { FiShuffle, FiPlay } from "react-icons/fi";

// Shows a preview of the next match that "Assign Next 4" would create, using
// the same fair-priority queue order the backend uses. This is a preview
// only — nothing is booked until the host clicks Match.
//
// There are 3 distinct ways to split 4 people into two teams of 2. "Shuffle"
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
        <div className="court-head"><h4>Next up</h4><span className="pill">Waiting</span></div>
        <p className="hint">Need {4 - queue.length} more in the queue to preview the next match.</p>
      </div>
    );
  }

  const [team1, team2] = pairings[variant % pairings.length];

  return (
    <div className="court-card next-up-card">
      <div className="court-head"><h4>Next up</h4><span className="pill warn">Preview</span></div>
      <div className="team-row"><span className="team-dot t1" /><p className="team">{team1[0].name} &amp; {team1[1].name}</p></div>
      <div className="vs"><span>vs</span></div>
      <div className="team-row"><span className="team-dot t2" /><p className="team">{team2[0].name} &amp; {team2[1].name}</p></div>
      <p className="hint next-up-note">Exact pairing may shift slightly when assigned.</p>
      <div className="court-actions-row">
        <button className="btn tiny secondary" onClick={() => setVariant((v) => v + 1)}>
          <FiShuffle aria-hidden="true" /> Shuffle
        </button>
        <button
          className="btn tiny"
          onClick={() => onMatch(openCourt.id)}
          disabled={!openCourt}
          title={openCourt ? undefined : "No open court right now"}
        >
          <FiPlay aria-hidden="true" /> Match
        </button>
      </div>
      {!openCourt && <p className="hint">No open court right now.</p>}
    </div>
  );
}
