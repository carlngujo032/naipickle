import { useState } from "react";

export default function CourtCard({ court, match, findPlayer, isHost, onNextMatch, onFinishMatch }) {
  const [score1, setScore1] = useState("");
  const [score2, setScore2] = useState("");

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
            <button
              className="btn tiny finish-btn"
              onClick={() => onFinishMatch(match.id, score1 || 0, score2 || 0)}
              disabled={score1 === "" || score2 === ""}
            >
              Finish
            </button>
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
