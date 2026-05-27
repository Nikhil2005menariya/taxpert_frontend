import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

interface TopbarUserMenuProps {
  firstName: string;
  lastName: string;
}

export default function TopbarUserMenu({ firstName, lastName }: TopbarUserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();
  const navigate = useNavigate();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const actualFirstName = firstName || "User";
  const avatar = `${actualFirstName[0] ?? "?"}${lastName?.[0] ?? ""}`.toUpperCase();

  const handleLogout = async (e: React.FormEvent) => {
    e.preventDefault();
    await logout();
    navigate('/login');
  };

  return (
    <div className="db-topbar-user-menu" ref={ref}>
      <button
        className="db-topbar-user db-topbar-user-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="db-topbar-avatar">{avatar}</div>
        <div className="db-topbar-user-info">
          <div className="db-topbar-user-name">{actualFirstName} {lastName}</div>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ marginLeft: 4, opacity: 0.5, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="db-user-dropdown" role="menu">
          <div className="db-user-dropdown-header">
            <div className="db-user-dropdown-name">{actualFirstName} {lastName}</div>
          </div>

          <div className="db-user-dropdown-divider" />

          <Link to="/profile" className="db-user-dropdown-item" role="menuitem" onClick={() => setOpen(false)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Profile
          </Link>

          <div className="db-user-dropdown-divider" />

          <form onSubmit={handleLogout}>
            <button type="submit" className="db-user-dropdown-item db-user-dropdown-signout" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
