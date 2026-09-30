import { FiLoader } from "react-icons/fi";

export default function Loading({ text = "Loading" }) {
  return (
    <div className="page-status">
      <FiLoader className="spin" aria-hidden="true" /> {text}
    </div>
  );
}
