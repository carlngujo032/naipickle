import { useState } from "react";

export default function AddPlayerForm({ onAdd }) {
  const [name, setName] = useState("");
  const [skillLevel, setSkillLevel] = useState(3.0);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(name.trim(), Number(skillLevel));
      setName("");
      setSkillLevel(3.0);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="add-player-form">
      <input
        placeholder="Player name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        type="number" step="0.5" min={2} max={5}
        title="Skill level (2.0–5.0)"
        value={skillLevel}
        onChange={(e) => setSkillLevel(e.target.value)}
      />
      <button className="btn tiny" type="submit" disabled={submitting || !name.trim()}>
        Add
      </button>
    </form>
  );
}
