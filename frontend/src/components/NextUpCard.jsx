import { FiShuffle, FiPlay } from "react-icons/fi";

// Shows the next match exactly as "Match" (or the auto-assign after a game
// finishes) will book it. The teams come from the server, which uses the same
// logic to pick the real match — including never repeating a partner — so this
// is not a guess.
//
// "Shuffle" cycles through the other valid ways to split the same four players.
const BLOCKED = {
  round_complete: "Round complete. Start the next round to keep playing.",
  no_new_partners: "Everyone waiting has already partnered with each other this round. Start the next round to continue.",
  wait: "No new partner combination among the players waiting yet. It will update when a game finishes.",
};

export default function NextUpCard({ queue, courts = [], nextUp, variant = 0, onShuffle, onMatch, onNextRound }) {
  const options = nextUp?.options || [];
  const blocked = nextUp?.blocked;
  const openCourt = courts.find((c) => c.status === "empty");

  if (blocked) {
    return (
      <div className="court-card next-up-card empty">
        <div className="court-head"><h4>Next up</h4><span className="pill warn">No match</span></div>
        <p className="hint">{BLOCKED[blocked]}</p>
        {blocked !== "wait" && (
          <div className="court-actions-row">
            <button className="btn tiny" onClick={onNextRound}><FiPlay aria-hidden="true" /> Start next round</button>
          </div>
        )}
      </div>
    );
  }

  if (queue.length < 4 || options.length === 0) {
    return (
      <div className="court-card next-up-card empty">
        <div className="court-head"><h4>Next up</h4><span className="pill">Waiting</span></div>
        <p className="hint">Need {Math.max(0, 4 - queue.length)} more in the queue to preview the next match.</p>
      </div>
    );
  }

  const byId = new Map(queue.map((p) => [p.id, p]));
  const option = options[variant % options.length];
  const name = (id) => byId.get(id)?.name ?? "?";

  return (
    <div className="court-card next-up-card">
      <div className="court-head"><h4>Next up</h4><span className="pill warn">Preview</span></div>
      <div className="team-row"><span className="team-dot t1" /><p className="team">{name(option.team1[0])} &amp; {name(option.team1[1])}</p></div>
      <div className="vs"><span>vs</span></div>
      <div className="team-row"><span className="team-dot t2" /><p className="team">{name(option.team2[0])} &amp; {name(option.team2[1])}</p></div>
      <div className="court-actions-row">
        {options.length > 1 && (
          <button className="btn tiny secondary" onClick={onShuffle}>
            <FiShuffle aria-hidden="true" /> Shuffle
          </button>
        )}
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
