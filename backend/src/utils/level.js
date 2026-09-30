// Level 1-5 from lifetime win rate. It is recalculated from the totals every
// time, so a win pushes the win rate (and maybe the level) up and a loss pulls
// it down — levels move both ways.
export const MIN_RATED_GAMES = 10; // fewer games than this = "Unrated"

export function computeLevel(wins, games) {
  const g = Number(games) || 0;
  if (g < MIN_RATED_GAMES) return null;
  const rate = (Number(wins) || 0) / g;
  if (rate >= 0.75) return 5;
  if (rate >= 0.6) return 4;
  if (rate >= 0.45) return 3;
  if (rate >= 0.3) return 2;
  return 1;
}

export function publicAccount(a) {
  const games = a.games_played;
  return {
    id: a.id,
    username: a.username,
    display_name: a.display_name,
    games_played: games,
    wins: a.wins,
    losses: a.losses,
    win_rate: games > 0 ? a.wins / games : 0,
    level: computeLevel(a.wins, games),
    min_rated_games: MIN_RATED_GAMES,
    has_security_question: Boolean(a.security_question),
  };
}
