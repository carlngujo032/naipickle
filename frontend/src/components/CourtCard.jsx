import { useState, useEffect } from "react";

export default function CourtCard({ court, match, findPlayer, isHost, onNextMatch, onFinishMatch, onCancelMatch }) {
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
      <h4>Court {court.court_number}</h4>
      {match ? (
        <div>
          <div className="team-row">
            <p className="team">🟦 {teamName(match.team1_p1)} & {teamName(match.team1_p2)}</p>
            {isHost && (
              <input
                className="score-input"
                placeholder="0"
                value={score1}
                onChange={(e) => setScore1(e.target.value)}
              />
            )}
          </div>
          <p className="vs">vs</p>
          <div className="team-row">
            <p className="team">🟥 {teamName(match.team2_p1)} & {teamName(match.team2_p2)}</p>
            {isHost && (
              <input
                className="score-input"
                placeholder="0"
                value={score2}
                onChange={(e) => setScore2(e.target.value)}
              />
            )}
          </div>
          {isHost && (
            <div className="court-actions">
              <button
                className="btn tiny finish-btn"
                onClick={() => onFinishMatch(match.id, score1 || 0, score2 || 0, match.court_id)}
                disabled={score1 === "" || score2 === ""}
              >
                Finish &amp; Start Next
              </button>
              <button
                className="btn tiny cancel-btn"
                onClick={() => {
                  if (window.confirm("Cancel this match? Players return to the queue and no score is recorded.")) {
                    onCancelMatch(match.id);
                  }
                }}
              >
                Cancel Match
              </button>
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="hint">Empty</p>
          {isHost && (
            <button className="btn tiny" onClick={onNextMatch}>
              Assign Next 4
            </button>
          )}
        </div>
      )}
    </div>
  );
}
