const ITEMS = [
  "Handled by qualified Taxperts",
  "Trusted by 500+ businesses",
  "Lifetime document vault",
  "PAN-India compliance coverage",
  "Secured with 256-bit encryption",
  "Zero penalty track record",
  "Taxpert-reviewed every filing",
  "End-to-end tax management",
];

export default function TrustMarquee() {
  const repeated = [...ITEMS, ...ITEMS];
  return (
    <div className="lp-marquee" aria-hidden="true">
      <div className="lp-marquee-track">
        {repeated.map((item, i) => (
          <span key={i} className="lp-marquee-item">
            <span className="lp-marquee-dot" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
