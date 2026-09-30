import { Link } from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";
import Brand from "./Brand.jsx";

// Shared shell for the login / sign-up / join / create pages
export default function AuthLayout({ title, subtitle, back = "/", backLabel = "Back", children }) {
  return (
    <div className="auth-page">
      <div className="auth-wrap">
        <Brand />
        <div className="auth-card">
          <Link to={back} className="back-link">
            <FiArrowLeft aria-hidden="true" /> {backLabel}
          </Link>
          <h2>{title}</h2>
          {subtitle && <p className="hint">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
