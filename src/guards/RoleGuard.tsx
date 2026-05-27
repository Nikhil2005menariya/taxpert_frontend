import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const RoleGuard = ({ 
  children, 
  allowedRoles 
}: { 
  children: React.ReactNode; 
  allowedRoles?: string[];
}) => {
  const { profile, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="page-loader page-loader--full">
        <div className="page-loader-ring" />
      </div>
    );
  }

  if (!profile) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (!profile.is_active) {
    return (
      <div className="page-loader page-loader--full" style={{ flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--red-600)" }}>Account Deactivated</div>
        <p style={{ color: "var(--ink-500)", maxWidth: 400, textAlign: "center" }}>
          Your account is currently inactive. Please contact your system administrator to restore access.
        </p>
      </div>
    );
  }

  if (allowedRoles && profile.role && !allowedRoles.includes(profile.role)) {
    return (
      <div className="page-loader page-loader--full" style={{ flexDirection: "column", gap: "1rem" }}>
        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--ink-900)" }}>Access Denied</div>
        <p style={{ color: "var(--ink-500)", maxWidth: 400, textAlign: "center" }}>
          You do not have the required permissions to view this page.
        </p>
        <button
          onClick={() => window.history.back()}
          className="btn btn-primary"
          style={{ marginTop: "0.5rem" }}
        >
          Go Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
