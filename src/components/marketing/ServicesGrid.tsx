import { Link } from "react-router-dom";
import { serviceCategories } from "../../shared/site-content";

export default function ServicesGrid() {
  return (
    <section id="services" className="section">
      <div className="container">
        <div className="section-heading">
          <span className="section-kicker">Services</span>
          <h2>Everything you need in one compliance platform</h2>
          <p>
            Click any service to learn what it covers, who it is for, and when
            to use it.
          </p>
        </div>
        <div className="svc-grid">
          {serviceCategories.map((category) => (
            <article key={category.slug} className="svc-card">
              <h3 className="svc-card-title">{category.title}</h3>
              <p className="svc-card-desc">{category.description}</p>
              <div className="svc-chips">
                {category.items.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/services/${item.slug}`}
                    className="svc-chip"
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
