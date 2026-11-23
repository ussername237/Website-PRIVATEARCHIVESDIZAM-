import { Link } from "react-router-dom";
import ArrowIcon from "../components/ArrowIcon.jsx";

export default function Landing() {
  return (
    <div className="lazir-landing">
      <main className="landing-main landing-main-minimal">
        <h1>LAZIRLAZIAFDIZAM</h1>
        <p className="landing-curation">CURATED BY DIZAM</p>
        <Link to="/dashboard" className="landing-cta">
          MASUK
          <ArrowIcon />
        </Link>
      </main>
      <div className="landing-watermark" aria-hidden="true">
        <span>LAZIR</span>
        <span>LAZIAF</span>
        <span>DIZAM</span>
      </div>
    </div>
  );
}
