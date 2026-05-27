import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="db-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} className="db-breadcrumb-item">
          {i > 0 && <span className="db-breadcrumb-sep">/</span>}
          {item.href && i < items.length - 1 ? (
            <Link to={item.href} className="db-breadcrumb-link">{item.label}</Link>
          ) : (
            <span className="db-breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
