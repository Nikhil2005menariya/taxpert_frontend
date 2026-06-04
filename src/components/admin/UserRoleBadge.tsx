import { useState, useRef, useEffect } from "react";
import { apiClient } from "../../api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

type Role = "super_admin" | "admin" | "expert" | "ca" | "staff" | "client";

const ALL_ROLES: Role[] = ["client", "staff", "expert", "admin", "super_admin"];

function getRoleLabel(role: string): string {
  if (role === "super_admin") return "Super Admin";
  if (role === "admin") return "Admin";
  if (role === "expert" || role === "ca") return "Taxpert";
  if (role === "staff") return "Staff";
  if (role === "client") return "Client";
  return role;
}

function allowedRoles(viewerRole: Role): Role[] {
  if (viewerRole === "super_admin") return ALL_ROLES;
  return ["client", "staff", "expert"];
}

/* Editorial cream + charcoal palette */
const STYLE: Record<Role, { bg: string; color: string; border: string; dot: string }> = {
  super_admin: { bg: "rgba(232,82,32,0.10)", color: "#cf440f", border: "rgba(232,82,32,0.30)", dot: "#e85220" },
  admin:       { bg: "#fbe9e2",              color: "#c43d33", border: "#f3c9bd",              dot: "#c43d33" },
  expert:      { bg: "rgba(107,111,196,0.12)", color: "#5a5fb8", border: "rgba(107,111,196,0.28)", dot: "#6b6fc4" },
  ca:          { bg: "rgba(107,111,196,0.12)", color: "#5a5fb8", border: "rgba(107,111,196,0.28)", dot: "#6b6fc4" },
  staff:       { bg: "#faf7f1",              color: "#5f5a50", border: "#ddd6c8",              dot: "#8b857a" },
  client:      { bg: "#e2efe8",              color: "#2f7a5b", border: "#bfe0cf",              dot: "#2f7a5b" },
};

const CaretIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ marginLeft: "1px" }}>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4" y="11" width="16" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export default function UserRoleBadge({
  userId,
  currentRole,
  viewerRole = "admin",
}: {
  userId: string;
  currentRole: Role;
  viewerRole?: Role;
}) {
  const queryClient = useQueryClient();
  const [role, setRole] = useState<Role>(currentRole);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setErrMsg(null);
      }
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const mutation = useMutation({
    mutationFn: async (nextRole: Role) => {
      await apiClient.patch("/admin/users/role", { userId, role: nextRole });
    },
    onSuccess: (_, variables) => {
      setRole(variables);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setErrMsg(null);
    },
    onError: (err: any) => {
      setErrMsg(err.response?.data?.error || "Failed to update role");
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  async function changeRole(next: Role) {
    setOpen(false);
    if (next === role) return;
    setLoading(true);
    setErrMsg(null);
    mutation.mutate(next);
  }

  const available = allowedRoles(viewerRole);
  const { bg, color, border } = STYLE[role] ?? STYLE.staff;

  return (
    <div ref={ref} className="urb-wrap">
      <button
        onClick={() => { setOpen((o) => !o); setErrMsg(null); }}
        disabled={loading}
        className="urb-badge"
        style={{ background: bg, color, borderColor: border }}
        title="Click to change role"
        type="button"
      >
        {loading ? "…" : getRoleLabel(role)}
        {!loading && <CaretIcon />}
      </button>

      {errMsg && <div className="urb-error">{errMsg}</div>}

      {open && (
        <div className="urb-dropdown">
          {ALL_ROLES.map((r) => {
            const s = STYLE[r];
            const isDisabled = !available.includes(r);
            return (
              <button
                key={r}
                onClick={() => !isDisabled && changeRole(r)}
                className={`urb-option${r === role ? " urb-option-active" : ""}${isDisabled ? " urb-option-disabled" : ""}`}
                type="button"
                disabled={isDisabled}
                title={isDisabled ? "Super Admin access required to assign this role" : undefined}
              >
                <span className="urb-option-dot" style={{ background: isDisabled ? "var(--lp-ink-faint)" : s.dot }} />
                <span className="urb-option-label" style={{ color: isDisabled ? "var(--lp-ink-faint)" : "var(--lp-ink)", fontWeight: r === role ? 700 : 500 }}>
                  {getRoleLabel(r)}
                </span>
                {r === role && <span className="urb-check"><CheckIcon /></span>}
                {isDisabled && <span className="urb-locked"><LockIcon /></span>}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        .urb-wrap { position: relative; display: inline-block; }
        .urb-badge {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 0.74rem; font-weight: 600;
          padding: 0.24rem 0.6rem; border-radius: var(--lp-pill);
          border: 1px solid; cursor: pointer; white-space: nowrap;
          transition: opacity 0.12s, transform 0.12s var(--lp-ease);
        }
        .urb-badge:hover:not(:disabled) { transform: translateY(-1px); }
        .urb-badge:disabled { opacity: 0.6; cursor: wait; }
        .urb-error {
          position: absolute; top: calc(100% + 5px); left: 0;
          background: #fbe9e2; border: 1px solid #f3c9bd; color: #c43d33;
          font-size: 0.72rem; padding: 0.35rem 0.6rem; border-radius: var(--lp-r-sm);
          white-space: nowrap; z-index: 20; max-width: 240px;
          box-shadow: var(--lp-shadow-md);
        }
        .urb-dropdown {
          position: absolute; top: calc(100% + 5px); left: 0; z-index: 20;
          background: var(--lp-surface); border: 1px solid var(--lp-hairline); border-radius: var(--lp-r-md);
          box-shadow: var(--lp-shadow-lg); min-width: 172px;
          padding: 0.3rem; overflow: hidden;
        }
        .urb-option {
          width: 100%; display: flex; align-items: center; gap: 9px;
          padding: 0.5rem 0.7rem; border-radius: var(--lp-r-sm);
          background: none; border: none; cursor: pointer; font-size: 0.82rem;
          text-align: left; transition: background 0.1s;
        }
        .urb-option:hover:not(.urb-option-disabled) { background: var(--lp-surface-2); }
        .urb-option-active { background: var(--lp-surface-2) !important; }
        .urb-option-disabled { cursor: not-allowed; opacity: 0.55; }
        .urb-option-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .urb-option-label { flex: 1; }
        .urb-check { margin-left: auto; display: inline-flex; color: var(--lp-accent); }
        .urb-locked { margin-left: auto; display: inline-flex; color: var(--lp-ink-faint); }
      `}</style>
    </div>
  );
}
