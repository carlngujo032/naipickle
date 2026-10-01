import { useState, useEffect } from "react";
import { FiPlay, FiCheck, FiXCircle, FiRefreshCw } from "react-icons/fi";

export default function CourtCard({ court, match, findPlayer, isHost, onNextMatch, onFinishMatch, onCancelMatch, onReassignMatch }) {
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

  // Reset the score boxes whenever the match on this court changes (new
  // match assigned, or court goes back to empty) so old scores don't linger.
  useEffect(() => {
    setScore1("");
    setScore2("");
  }, [match?.id]);

  const teamName = (id) => findPlayer(id)?.name || "…";

  return (
    <div className={`court-card ${court.status}`}>
      <div className="court-head">
        <h4>Court {court.court_number}</h4>
        <span className={`pill ${match ? "live" : ""}`}>{match ? "In play" : "Open"}</span>
      </div>
      {match ? (
        <div>
          <div className="team-row">
            <span className="team-dot t1" />
            <p className="team">{teamName(match.team1_p1)} &amp; {teamName(match.team1_p2)}</p>
            {isHost && (
              <input
                className="score-input"
                inputMode="numeric"
                placeholder="0"
                aria-label="Team 1 score"
                value={score1}
                onChange={(e) => setScore1(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </div>
          <div className="vs"><span>vs</span></div>
          <div className="team-row">
            <span className="team-dot t2" />
            <p className="team">{teamName(match.team2_p1)} &amp; {teamName(match.team2_p2)}</p>
            {isHost && (
              <input
                className="score-input"
                inputMode="numeric"
                placeholder="0"
                aria-label="Team 2 score"
                value={score2}
                onChange={(e) => setScore2(e.target.value.replace(/\D/g, ""))}
              />
            )}
          </div>
          {isHost && (
            <div className="court-actions">
              <button
                className="btn block"
                onClick={() => onFinishMatch(match.id, score1 || 0, score2 || 0, match.court_id)}
                disabled={score1 === "" || score2 === ""}
              >
                <FiCheck aria-hidden="true" /> Finish &amp; start next
              </button>
              <div className="court-actions-row">
                <button
                  className="btn tiny secondary"
                  onClick={() => {
                    if (window.confirm("Cancel this match? Players return to the queue and no score is recorded.")) {
                      onCancelMatch(match.id);
                    }
                  }}
                >
                  <FiXCircle aria-hidden="true" /> Cancel
                </button>
                <button
                  className="btn tiny secondary"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Re-assign this match? The current match will be cancelled (no score recorded) and a different match will be created for this court."
                      )
                    ) {
                      onReassignMatch(match.id, match.court_id);
                    }
                  }}
                >
                  <FiRefreshCw aria-hidden="true" /> Re-assign
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="hint">No match on this court.</p>
          {isHost && (
            <button className="btn block" onClick={onNextMatch}>
              <FiPlay aria-hidden="true" /> Assign next 4
            </button>
          )}
        </div>
      )}
    </div>
  );
}
