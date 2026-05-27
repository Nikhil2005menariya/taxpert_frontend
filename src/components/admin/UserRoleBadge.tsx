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

const STYLE: Record<Role, { bg: string; color: string; border: string }> = {
  super_admin: { bg: "#eef2ff", color: "#4338ca", border: "#c7d2fe" },
  admin:       { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  expert:      { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  ca:          { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  staff:       { bg: "#eff6ff", color: "#1a56db", border: "#bfdbfe" },
  client:      { bg: "#f0fdf4", color: "#057a55", border: "#a7f3d0" },
};

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
        {!loading && (
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ marginLeft: "2px" }}>
            <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {errMsg && (
        <div className="urb-error">{errMsg}</div>
      )}

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
                <span className="urb-option-dot" style={{ background: isDisabled ? "#cbd5e1" : s.color }} />
                <span style={{ color: isDisabled ? "#cbd5e1" : s.color, fontWeight: r === role ? 700 : 500 }}>
                  {getRoleLabel(r)}
                </span>
                {r === role && <span className="urb-check">✓</span>}
                {isDisabled && (
                  <span className="urb-locked" title="Super Admin only">🔒</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      <style>{`
        .urb-wrap { position: relative; display: inline-block; }
        .urb-badge {
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 0.76rem; font-weight: 700;
          padding: 0.22rem 0.6rem; border-radius: 999px;
          border: 1.5px solid; cursor: pointer;
          transition: opacity 0.12s;
        }
        .urb-badge:disabled { opacity: 0.6; cursor: wait; }
        .urb-error {
          position: absolute; top: calc(100% + 4px); left: 0;
          background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c;
          font-size: 0.72rem; padding: 0.3rem 0.55rem; border-radius: 0.4rem;
          white-space: nowrap; z-index: 20; max-width: 240px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .urb-dropdown {
          position: absolute; top: calc(100% + 4px); left: 0; z-index: 20;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 0.65rem;
          box-shadow: 0 6px 24px rgba(15,23,42,0.12); min-width: 160px;
          padding: 0.3rem; overflow: hidden;
        }
        .urb-option {
          width: 100%; display: flex; align-items: center; gap: 8px;
          padding: 0.5rem 0.75rem; border-radius: 0.45rem;
          background: none; border: none; cursor: pointer; font-size: 0.82rem;
          text-align: left; transition: background 0.1s;
        }
        .urb-option:hover:not(.urb-option-disabled) { background: #f8fafc; }
        .urb-option-active { background: #f0f9ff !important; }
        .urb-option-disabled { cursor: not-allowed; opacity: 0.5; }
        .urb-option-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
        .urb-check { margin-left: auto; font-size: 0.7rem; color: #1d4ed8; font-weight: 700; }
        .urb-locked { margin-left: auto; font-size: 0.7rem; }
      `}</style>
    </div>
  );
}
