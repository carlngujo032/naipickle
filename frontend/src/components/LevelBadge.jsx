// Level badge for players with an account; guests keep the old skill number.
export default function LevelBadge({ p }) {
  if (!p.account_id) return <span className="skill"> ({p.skill_level})</span>;
  return (
    <span className={`level-badge lv-${p.level || 0}`} title="Level from lifetime win rate">
      {p.level ? `Lv ${p.level}` : "Unrated"}
    </span>
  );
}
