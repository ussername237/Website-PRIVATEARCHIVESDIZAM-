import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import ArrowIcon from "./ArrowIcon.jsx";
import { logout } from "../lib/auth.js";

export default function AppNavigation({ onBack, hideSearch = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [signOutError, setSignOutError] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (location.pathname.startsWith("/genres/")) {
      const slug = location.pathname.replace(/^\/genres\/?/, "");
      if (slug) {
        sessionStorage.setItem("mv_scroll_to_genre", slug);
      }
      navigate("/genres");
      return;
    }
    if (location.pathname === "/genres") {
      navigate("/dashboard");
      return;
    }

    const historyState = window.history.state;
    if (historyState && Number.isInteger(historyState.idx) && historyState.idx > 0) {
      navigate(-1);
      return;
    }

    const fallback = location.pathname.startsWith("/movie/")
      ? "/explore"
      : "/dashboard";
    navigate(fallback, { replace: true });
  }

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch (error) {
      setSignOutError(error.message || "Gagal keluar. Coba lagi.");
    } finally {
      setSigningOut(false);
    }
  }

  const isGenrePage = location.pathname.startsWith("/genres");
  const shouldHideSearch = hideSearch || isGenrePage;

  const navLinks = [
    ...(isGenrePage ? [] : [{ to: "/dashboard", label: "HALAMAN UTAMA", onClick: scrollToTop }]),
    ...(shouldHideSearch ? [] : [{ to: "/explore", label: "PENCARIAN" }]),
    ...(isGenrePage ? [] : [{ to: "/favorites", label: "FAV" }]),
    ...(isGenrePage ? [] : [{ to: "/genres", label: "GENRE" }]),
  ];

  return (
    <>
    <div className="dashboard-watermark" aria-hidden="true">
      <span>LAZIR</span>
      <span>LAZIAF</span>
      <span>DIZAM</span>
    </div>
    <header className="app-navigation sticky top-0 z-40 border-b border-[#F5F3EE]/15 bg-[#0B1F4B]/95 backdrop-blur-xl">
      <div className="app-navigation__inner mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2 sm:flex-nowrap sm:gap-3 sm:px-6 sm:py-0">
        <Link
          to="/dashboard"
          onClick={scrollToTop}
          className="app-navigation__brand da-brand-link flex shrink-0 items-center gap-2.5"
        >
          <span className="brand-monogram" role="img" aria-label="Logo LLD">
            <span className="brand-monogram__letter brand-monogram__letter--l" aria-hidden="true">L</span>
            <span className="brand-monogram__letter brand-monogram__letter--l2" aria-hidden="true">L</span>
            <span className="brand-monogram__letter brand-monogram__letter--d" aria-hidden="true">D</span>
          </span>
          <span className="hidden text-[10px] font-semibold tracking-[0.06em] text-[#F5F3EE] sm:inline">
            PrivateArchivesDizam
          </span>
        </Link>

        {!isGenrePage && (
          <button
            type="button"
            onClick={onBack || goBack}
            className="da-modal-close flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-[#F5F3EE]/20 bg-[#F5F3EE]/[0.035] px-3.5 text-xs font-medium text-[#F5F3EE]/80 transition hover:border-[#FF5A4F]/40 hover:bg-[#FF5A4F]/12 hover:text-[#F5F3EE]"
            aria-label="Kembali"
          >
            <ArrowIcon direction="left" className="h-4 w-4" />
            <span>Kembali</span>
          </button>
        )}

        {navLinks.length > 0 && (
          <nav
            aria-label="Navigasi koleksi"
            className="app-navigation__links order-3 flex w-full items-center justify-center gap-1 pb-1 sm:order-none sm:w-auto sm:pb-0"
          >
            {navLinks.map(({ to, label, onClick }) => (
              <NavLink
                key={to}
                to={to}
                onClick={onClick}
                className={({ isActive }) =>
                  "da-nav-link rounded-full px-2.5 py-2 text-[9px] font-semibold tracking-[0.04em] transition sm:px-4 sm:text-[11px] " +
                  (isActive
                    ? "bg-[#FF5A4F]/25 text-[#F5F3EE]"
                    : "text-[#F5F3EE]/60 hover:bg-[#F5F3EE]/[0.06] hover:text-[#F5F3EE]")
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        )}

        <button
          type="button"
          onClick={signOut}
          className="app-navigation__logout group flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#F5F3EE]/15 bg-[#F5F3EE]/[0.04] px-2.5 text-[10px] font-semibold tracking-[0.08em] text-[#F5F3EE]/65 backdrop-blur transition duration-300 hover:border-[#FF5A4F]/40 hover:bg-[#FF5A4F]/12 hover:text-[#F5F3EE] sm:px-3"
          aria-label="Keluar"
          title="Keluar"
          disabled={signingOut}
        >
          <span className="hidden sm:inline">KELUAR</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5"
            aria-hidden="true"
          >
            <path d="M10 17l5-5-5-5" />
            <path d="M15 12H3" />
            <path d="M13 4h7v16h-7" />
          </svg>
        </button>
      </div>
      {signOutError && (
        <p role="alert" className="mx-auto max-w-6xl px-4 pb-2 text-sm text-[#FFABA3] sm:px-6">
          {signOutError}
        </p>
      )}
    </header>
    </>
  );
}