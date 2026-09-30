import { useState } from "react";

const PRESETS = [
  "What was the name of your first pet?",
  "What is your mother's maiden name?",
  "What city were you born in?",
  "What was your childhood nickname?",
  "What was the name of your elementary school?",
];
const CUSTOM = "__custom";

// Question picker + answer box, shared by sign-up and the profile page.
export default function SecurityQuestionFields({ question, answer, onQuestion, onAnswer }) {
  const [choice, setChoice] = useState("");

  function pick(v) {
    setChoice(v);
    onQuestion(v === CUSTOM ? "" : v);
  }

  return (
    <>
      <label>
        Security question (for resetting your password)
        <select value={choice} onChange={(e) => pick(e.target.value)} required>
          <option value="" disabled>Choose a question…</option>
          {PRESETS.map((q) => <option key={q} value={q}>{q}</option>)}
          <option value={CUSTOM}>Write my own…</option>
        </select>
      </label>
      {choice === CUSTOM && (
        <label>
          Your question
          <input value={question} onChange={(e) => onQuestion(e.target.value)} maxLength={120} required />
        </label>
      )}
      <label>
        Answer
        <input value={answer} onChange={(e) => onAnswer(e.target.value)} autoComplete="off" required />
      </label>
      <p className="hint">Pick something only you would know — your friends play with you, so avoid easy guesses.</p>
    </>
  );
}
