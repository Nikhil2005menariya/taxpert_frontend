import { Link } from "react-router-dom";
import { serviceCategories } from "../../shared/site-content";

const ICONS: Record<string, React.ReactNode> = {
  incorporations: <path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-7h6v7" />,
  registrations: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 12l2.5 2.5L16 9" /></>,
  "accounting-bookkeeping": <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 9h8M8 13h8M8 17h5" /></>,
  "tds-compliance": <><path d="M12 2v20M5 7l7-5 7 5M5 17l7 5 7-5" /></>,
  "gst-filings": <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></>,
  "income-tax-filings": <><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></>,
  "roc-compliance-companies": <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></>,
  "roc-compliance-llps": <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  "other-services": <><circle cx="12" cy="12" r="3.2" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" /></>,
};

function cheapest(items: { price?: string }[]) {
  const nums = items
    .map((i) => i.price?.replace(/[^\d]/g, ""))
    .filter(Boolean)
    .map(Number);
  if (nums.length === 0) return null;
  return Math.min(...nums).toLocaleString("en-IN");
}

export default function ServicesGrid() {
  return (
    <section className="lp-section lp-section--alt" id="all-services">
      <div className="lp-container">
        <div className="lp-intro" data-reveal>
          <span className="lp-eyebrow">Everything we handle</span>
          <h2 className="lp-h2">{serviceCategories.length} categories. One dedicated team.</h2>
          <p className="lp-lead">
            From your first registration to recurring filings and annual compliance —
            transparent, fixed pricing with no surprises.
          </p>
        </div>

        <div className="lp-svccat-grid">
          {serviceCategories.map((cat) => {
            const from = cheapest(cat.items);
            return (
              <Link to={`/services#${cat.slug}`} className="lp-svccat" data-reveal key={cat.slug}>
                <div className="lp-svccat-top">
                  <span className="lp-svccat-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      {ICONS[cat.slug] ?? ICONS["other-services"]}
                    </svg>
                  </span>
                  <span className="lp-svccat-count">{cat.items.length} services</span>
                </div>
                <h3 className="lp-svccat-title">{cat.title}</h3>
                <p className="lp-svccat-desc">{cat.description}</p>
                <div className="lp-svccat-tags">
                  {cat.items.slice(0, 3).map((it) => (
                    <span className="lp-svccat-tag" key={it.slug}>{it.name}</span>
                  ))}
                  {cat.items.length > 3 && (
                    <span className="lp-svccat-tag lp-svccat-tag--more">+{cat.items.length - 3}</span>
                  )}
                </div>
                <div className="lp-svccat-foot">
                  {from && <span className="lp-svccat-from">from ₹{from}</span>}
                  <span className="lp-svccat-link">
                    View
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
