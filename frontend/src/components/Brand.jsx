import { Link } from "react-router-dom";

// Simple pickleball mark (ball with holes) + wordmark
export function BallMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#c8f031" />
      <g fill="#14532d" opacity="0.85">
        <circle cx="16" cy="8" r="2.2" /><circle cx="9" cy="13" r="2.2" /><circle cx="23" cy="13" r="2.2" />
        <circle cx="12" cy="21" r="2.2" /><circle cx="20" cy="21" r="2.2" /><circle cx="16" cy="15.5" r="1.6" />
      </g>
    </svg>
  );
}

export default function Brand({ light = false, to = "/" }) {
  return (
    <Link to={to} className={`brand ${light ? "light" : ""}`}>
      <BallMark />
      <span>Pickleball <b>Open Play</b></span>
    </Link>
  );
}
