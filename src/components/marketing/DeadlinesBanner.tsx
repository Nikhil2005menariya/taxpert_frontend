// Server component — date logic runs at request time
const ALL_DEADLINES = [
  { label: "GSTR-3B (March)", isoDate: "2026-04-20" },
  { label: "GSTR-1 (March)", isoDate: "2026-04-11" },
  { label: "GSTR-1 (April)", isoDate: "2026-05-11" },
  { label: "GSTR-3B (April)", isoDate: "2026-05-20" },
  { label: "TDS Q4 Return", isoDate: "2026-05-31" },
  { label: "ITR — Individuals", isoDate: "2026-07-31" },
  { label: "DIR-3 KYC", isoDate: "2026-09-30" },
  { label: "ITR — Companies", isoDate: "2026-10-31" },
  { label: "GSTR-9 Annual", isoDate: "2026-12-31" },
];

function fmt(isoDate: string) {
  return new Date(isoDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function daysLeft(isoDate: string, today: Date) {
  const dl = new Date(isoDate);
  return Math.ceil((dl.getTime() - today.getTime()) / 86_400_000);
}

export default function DeadlinesBanner() {
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const curYM = today.getFullYear() * 100 + today.getMonth();
  const showNextMonth = today.getDate() >= 25;
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextYM = nextMonth.getFullYear() * 100 + nextMonth.getMonth();

  const visible = ALL_DEADLINES.filter((d) => {
    const dl = new Date(d.isoDate);
    if (dl < todayMidnight) return false; // already passed
    const dlYM = dl.getFullYear() * 100 + dl.getMonth();
    if (dlYM === curYM) return true;
    if (showNextMonth && dlYM === nextYM) return true;
    return false;
  });

  if (visible.length === 0) return null;

  return (
    <div className="lp-ticker">
      <div className="lp-container lp-ticker-inner">
        <span className="lp-ticker-label">
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="3" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
            <path d="M1 7h14" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 1v4M11 1v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          Deadlines
        </span>
        <div className="lp-ticker-scroll">
          {visible.map((d) => {
            const days = daysLeft(d.isoDate, todayMidnight);
            const urgent = days <= 7;
            return (
              <span key={d.isoDate} className="lp-ticker-pill">
                <b>{d.label}</b>
                <span className="lp-ticker-date">{fmt(d.isoDate)}</span>
                {urgent && <span className="lp-ticker-tag">{days}d left</span>}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
