// Shows a preview of the next match that "Assign Next 4" would create,
// using the same fair-priority queue order and skill-balancing the backend
// uses (lowest + highest skill vs. the two middle skills). This is a
// preview only — nothing is booked until the host actually clicks Assign.
export default function NextUpCard({ queue }) {
  if (queue.length < 4) {
    return (
      <div className="court-card next-up-card empty">
        <h4>Next Up</h4>
        <p className="hint">Need {4 - queue.length} more in queue to preview the next match.</p>
      </div>
    );
  }

  const nextFour = queue.slice(0, 4);
  const bySkill = [...nextFour].sort(
    (a, b) => Number(a.skill_level) - Number(b.skill_level)
  );
  const [lo, midLo, midHi, hi] = bySkill;

  return (
    <div className="court-card next-up-card">
      <h4>Next Up</h4>
      <p className="team">🟦 {lo.name} & {hi.name}</p>
      <p className="vs">vs</p>
      <p className="team">🟥 {midLo.name} & {midHi.name}</p>
      <p className="hint next-up-note">Preview — exact pairing may shift slightly when assigned.</p>
    </div>
  );
}
