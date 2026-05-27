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
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input name="first_name" className="form-input" placeholder="Rajesh" required />
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input name="last_name" className="form-input" placeholder="Kumar" required />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email</label>
          <input name="email" type="email" className="form-input" placeholder="user@example.com" required />
        </div>

        <div className="form-group">
          <label className="form-label">Mobile</label>
          <input name="mobile" type="tel" className="form-input" placeholder="9876543210" required />
        </div>

        <div className="form-group">
          <label className="form-label">PAN</label>
          <input name="pan" className="form-input" placeholder="ABCDE1234F" style={{ textTransform: "uppercase" }} required />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select name="role" className="form-input" required defaultValue="client">
              <option value="client">Client</option>
              <option value="staff">Staff</option>
              <option value="expert">Taxpert</option>
              {isSuperAdmin && <option value="admin">Admin</option>}
              {isSuperAdmin && <option value="super_admin">Super Admin</option>}
            </select>
            {!isSuperAdmin && (
              <p style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.3rem" }}>
                Admin and Super Admin roles require Super Admin access.
              </p>
            )}
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" className="form-input" placeholder="Min. 8 characters" required />
          </div>
        </div>

        {error && <div className="banner banner-error">{error}</div>}
        {success && <div className="banner banner-success">{success}</div>}

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>

      <style>{`
        .banner { padding: 0.6rem 0.75rem; border-radius: 0.5rem; font-size: 0.85rem; }
        .banner-error { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
        .banner-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #057a55; }
      `}</style>
    </form>
  );
}
