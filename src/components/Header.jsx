import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useTheme } from "../lib/ThemeContext";

/* ── Icons ───────────────────────────────────────────────────── */
function CaretIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className="caret-icon"
    >
      <path
        d="M2.5 3.75L5 6.25L7.5 3.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {dark ? (
        /* sun */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        /* moon */
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

function HeaderLogo() {
  return (
    <Link to="/" className="header-logo-link" aria-label="aikit — home">
      <span className="header-logo-text">aikit</span>
    </Link>
  );
}

/* Avatar shows user initials when logged in */
function Avatar({ name, onClick }) {
  const initials = name
    ? name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : null;

  return (
    <button
      type="button"
      className="icon-button avatar-button"
      aria-label="Account"
      onClick={onClick}
      style={
        initials
          ? {
              background: "var(--green-brand, #2e9e55)",
              color: "#fff",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.02em",
            }
          : undefined
      }
    >
      {initials || <UserIcon />}
    </button>
  );
}

/* ── Nav items ───────────────────────────────────────────────── */
const NAV_ITEMS = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#solutions" },
  { label: "Docs", href: "#docs" },
  { label: "Community", href: "#community" },
  { label: "Company", href: "#company" },
];

/* ── Header ──────────────────────────────────────────────────── */
export default function Header({ onOpenAuth }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const displayName =
    profile?.full_name || profile?.username || user?.email?.split("@")[0];

  function handleAvatarClick() {
    if (user) {
      navigate("/dashboard");
    } else {
      onOpenAuth("login");
    }
  }

  function handleCtaClick() {
    if (user) {
      navigate("/dashboard");
    } else {
      onOpenAuth("signup");
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <HeaderLogo />
        <nav className="topnav" aria-label="Primary">
          {NAV_ITEMS.map((item) => (
            <a key={item.label} href={item.href}>
              {item.label}
              <CaretIcon />
            </a>
          ))}
        </nav>
      </div>

      <div className="topbar-right">
        <ThemeToggle />

        {user ? (
          <>
            <button
              type="button"
              className="cta-button topbar-cta"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
          </>
        ) : (
          <button
            type="button"
            className="cta-button topbar-cta"
            onClick={handleCtaClick}
          >
            Start free
          </button>
        )}

        <button type="button" className="icon-button" aria-label="Search">
          <SearchIcon />
        </button>

        <button type="button" className="icon-button" aria-label="Messages">
          <MessageIcon />
        </button>

        <Avatar name={displayName} onClick={handleAvatarClick} />
      </div>
    </header>
  );
}
