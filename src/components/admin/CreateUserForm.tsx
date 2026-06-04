import { useState } from "react";
import { apiClient } from "../../api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface Props {
  isSuperAdmin?: boolean;
}

export default function CreateUserForm({ isSuperAdmin = false }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (userData: any) => {
      const res = await apiClient.post("/admin/users", userData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setSuccess("User created successfully.");
      setError(null);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error || "Failed to create user");
      setSuccess(null);
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    mutation.mutate(data);
    if (!mutation.isError) {
      (e.target as HTMLFormElement).reset();
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="adm-form">
      <div className="adm-form-grid">
        <div className="adm-field">
          <label className="adm-label">First Name</label>
          <input name="first_name" className="adm-input" placeholder="Rajesh" required />
        </div>
        <div className="adm-field">
          <label className="adm-label">Last Name</label>
          <input name="last_name" className="adm-input" placeholder="Kumar" required />
        </div>
      </div>

      <div className="adm-field">
        <label className="adm-label">Email</label>
        <input name="email" type="email" className="adm-input" placeholder="user@example.com" required />
      </div>

      <div className="adm-form-grid">
        <div className="adm-field">
          <label className="adm-label">Mobile</label>
          <input name="mobile" type="tel" className="adm-input" placeholder="9876543210" required />
        </div>
        <div className="adm-field">
          <label className="adm-label">PAN</label>
          <input name="pan" className="adm-input" placeholder="ABCDE1234F" style={{ textTransform: "uppercase" }} required />
        </div>
      </div>

      <div className="adm-form-grid">
        <div className="adm-field">
          <label className="adm-label">Role</label>
          <div className="adm-select-wrap">
            <select name="role" className="adm-select" required defaultValue="client">
              <option value="client">Client</option>
              <option value="staff">Staff</option>
              <option value="expert">Taxpert</option>
              {isSuperAdmin && <option value="admin">Admin</option>}
              {isSuperAdmin && <option value="super_admin">Super Admin</option>}
            </select>
            <span className="adm-select-ico">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </span>
          </div>
          {!isSuperAdmin && (
            <p className="adm-field-hint">Admin and Super Admin roles require Super Admin access.</p>
          )}
        </div>
        <div className="adm-field">
          <label className="adm-label">Password</label>
          <input name="password" type="password" className="adm-input" placeholder="Min. 8 characters" minLength={8} required />
        </div>
      </div>

      {error && (
        <div className="adm-banner adm-banner--err">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="adm-banner adm-banner--ok">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="M22 4 12 14.01l-3-3" />
          </svg>
          {success}
        </div>
      )}

      <button type="submit" className="adm-submit" disabled={loading}>
        {loading ? (
          <><span className="adm-submit-spin" /> Creating…</>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
            </svg>
            Create User
          </>
        )}
      </button>
    </form>
  );
}
