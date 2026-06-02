import type { ReactNode } from "react";

/**
 * Premium line icons (24×24, stroke) keyed by service-category slug.
 * Shared across the landing services grid, catalogue, and detail pages so the
 * iconography stays consistent. No emojis anywhere.
 */
export const CATEGORY_ICON_PATHS: Record<string, ReactNode> = {
  incorporations: <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-7h6v7" />,
  registrations: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M8 12l2.5 2.5L16 9" />
    </>
  ),
  "accounting-bookkeeping": (
    <>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  "tds-compliance": <path d="M12 2v20M5 7l7-5 7 5M5 17l7 5 7-5" />,
  "gst-filings": (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </>
  ),
  "income-tax-filings": (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 3 3 5-6" />
    </>
  ),
  "roc-compliance-companies": (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  "roc-compliance-llps": <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
  "other-services": (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
};

/** Renders the category icon for a slug, falling back to a generic gear. */
export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {CATEGORY_ICON_PATHS[slug] ?? CATEGORY_ICON_PATHS["other-services"]}
    </svg>
  );
}
