export type UserRole = "super_admin" | "admin" | "ca" | "ops" | "client";

export function normalizeRole(role: string | null | undefined): UserRole {
  switch (role) {
    case "super_admin": return "super_admin";
    case "admin": return "admin";
    case "ca": return "ca";
    case "ops": return "ops";
    default: return "client";
  }
}

export function getRoleLabel(role: UserRole | string | null | undefined): string {
  switch (role) {
    case "super_admin": return "Super Admin";
    case "admin": return "Admin";
    case "ca": return "Taxpert";
    case "ops": return "Operations";
    case "client": return "Client";
    default: return "User";
  }
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === "super_admin" || role === "admin";
}

export function isStaffRole(role: string | null | undefined): boolean {
  return isAdminRole(role) || role === "ca" || role === "ops";
}

export function isTaxExpertRole(role: string | null | undefined): boolean {
  return role === "ca";
}
