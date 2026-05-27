import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { computeClientDueDates } from "../../shared/due-dates";
import type { DueDate } from "../../shared/due-dates";

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Monday-anchored day index (0=Mon … 6=Sun)
function weekDay(d: Date): number {
  return (d.getDay() + 6) % 7;
}

const URGENCY_STYLE: Record<DueDate["urgency"], { bg: string; color: string; border: string; label: string }> = {
  overdue:  { bg: "rgba(239, 68, 68, 0.05)",  color: "#dc2626", border: "1.5px solid rgba(239, 68, 68, 0.2)", label: "Overdue"  },
  urgent:   { bg: "rgba(245, 158, 11, 0.08)", color: "#b45309", border: "1.5px solid rgba(245, 158, 11, 0.25)", label: "Due Soon" },
  upcoming: { bg: "rgba(59, 130, 246, 0.06)",  color: "#2563eb", border: "1.5px solid rgba(59, 130, 246, 0.2)", label: "Upcoming" },
  later:    { bg: "var(--ink-50)",            color: "var(--ink-500)", border: "1.5px solid var(--line-soft)", label: "Later"   },
};

const URGENCY_COLOR: Record<DueDate["urgency"], string> = {
  overdue:  "#dc2626",
  urgent:   "#b45309",
  upcoming: "#2563eb",
  later:    "var(--ink-300)",
};

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nearestDueDateMonth(dueDates: DueDate[]): { year: number; month: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcoming = dueDates
    .filter(d => d.date >= today)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (upcoming.length === 0) return { year: now.getFullYear(), month: now.getMonth() };
  const inCurrentMonth = upcoming.some(
    d => d.date.getFullYear() === now.getFullYear() && d.date.getMonth() === now.getMonth()
  );
  if (inCurrentMonth) return { year: now.getFullYear(), month: now.getMonth() };
  return { year: upcoming[0].date.getFullYear(), month: upcoming[0].date.getMonth() };
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function fmt(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function daysLeftLabel(date: Date): string {
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return `${diff}d left`;
}

// ── Premium Calendar Component ──
interface CalendarProps {
  dueDates: DueDate[];
}

function DueDatesCalendar({ dueDates }: CalendarProps) {
  const [year, setYear]       = useState(() => nearestDueDateMonth(dueDates).year);
  const [month, setMonth]     = useState(() => nearestDueDateMonth(dueDates).month);
  const [selected, setSelected] = useState<string | null>(null); // "YYYY-MM-DD"
  const now = new Date();

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1);
    setSelected(null);
  }

  const currentMonthLabel = new Date(year, month, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const firstDay   = new Date(year, month, 1);
  const totalDays  = new Date(year, month + 1, 0).getDate();
  const startPad   = weekDay(firstDay);
  const todayKey   = toLocalDateKey(now);

  // Map day-key → items
  const dayMap = useMemo(() => {
    const m = new Map<string, DueDate[]>();
    for (const d of dueDates) {
      const k = toLocalDateKey(d.date);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(d);
    }
    return m;
  }, [dueDates]);

  // Build grid cells
  const cells: (number | null)[] = [
    ...Array<null>(startPad).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function dayKey(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Highest-priority urgency for a set of items
  function topUrgency(items: DueDate[]): DueDate["urgency"] {
    const order: DueDate["urgency"][] = ["overdue", "urgent", "upcoming", "later"];
    return items.reduce<DueDate["urgency"]>((best, d) =>
      order.indexOf(d.urgency) < order.indexOf(best) ? d.urgency : best
    , "later");
  }

  const selectedItems = selected ? (dayMap.get(selected) ?? []) : [];

  return (
    <div className="dd-calendar" style={{ background: "var(--card)", border: "1.5px solid var(--line-soft)", borderRadius: "16px", overflow: "hidden", maxWidth: "480px", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
      {/* Navigation */}
      <div className="dd-cal-nav" style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--line-soft)", background: "rgba(0,0,0,0.01)" }}>
        <button className="dd-cal-nav-btn" onClick={prevMonth} aria-label="Previous month" style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>‹</button>
        <span className="dd-cal-month-label" style={{ fontFamily: "var(--font-sans)", fontWeight: 600, letterSpacing: "-0.01em" }}>{currentMonthLabel}</span>
        <button className="dd-cal-nav-btn" onClick={nextMonth} aria-label="Next month" style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div className="dd-cal-grid">
        {WEEK_DAYS.map(d => (
          <div key={d} className="dd-cal-header-cell" style={{ fontFamily: "var(--font-sans)", fontWeight: 600, color: "var(--ink-400)", padding: "0.75rem 0", fontSize: "0.68rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => {
          if (day === null) return <div key={`e${i}`} className="dd-cal-cell dd-cal-empty" style={{ opacity: 0.15 }} />;
          const k    = dayKey(day);
          const items = dayMap.get(k) ?? [];
          const isToday    = k === todayKey;
          const isSelected = k === selected;

          return (
            <div
              key={k}
              onClick={() => items.length ? setSelected(isSelected ? null : k) : undefined}
              role={items.length ? "button" : undefined}
              tabIndex={items.length ? 0 : undefined}
              onKeyDown={items.length ? e => e.key === "Enter" && setSelected(isSelected ? null : k) : undefined}
              style={{
                aspectRatio: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
                cursor: items.length ? "pointer" : "default",
                borderRadius: "8px",
                transition: "all 0.15s ease",
                border: isSelected ? "1.5px solid var(--gold-500)" : "1.5px solid transparent",
                background: isSelected ? "rgba(196, 154, 58, 0.05)" : "transparent",
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.84rem",
                fontWeight: isToday ? 700 : 500,
                color: isToday ? "white" : "var(--ink-700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                ...(isToday ? {
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "var(--ink-900)",
                } : {})
              }}>
                {day}
              </span>
              {items.length > 0 && (
                <span style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: URGENCY_COLOR[topUrgency(items)],
                  display: "block"
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Selected day detail Drawer */}
      {selected && selectedItems.length > 0 && (
        <div className="dd-cal-detail" style={{ borderTop: "1.5px solid var(--line-soft)", background: "rgba(0,0,0,0.01)", padding: "1.25rem 1.5rem" }}>
          <div className="dd-cal-detail-date" style={{ fontFamily: "var(--font-mono)", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.04em", color: "var(--ink-400)", marginBottom: "0.75rem" }}>
            {new Date(selected + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {selectedItems.map(d => (
              <div key={d.id} className="dd-cal-detail-item" style={{ borderLeft: `3px solid ${URGENCY_STYLE[d.urgency].color}`, background: "var(--card)", border: "1px solid var(--line-soft)", borderLeftWidth: "3px", borderRadius: "10px", padding: "0.75rem 1rem", boxShadow: "0 1px 2px rgba(0,0,0,0.01)" }}>
                <div className="dd-cal-detail-label" style={{ fontSize: "0.86rem", fontWeight: 600, color: "var(--ink-900)" }}>{d.label}</div>
                <div className="dd-cal-detail-service" style={{ fontSize: "0.76rem", color: "var(--ink-400)", marginTop: "0.15rem" }}>{d.serviceName}</div>
                {d.description && <div className="dd-cal-detail-desc" style={{ fontSize: "0.76rem", color: "var(--ink-500)", marginTop: "0.25rem", lineHeight: 1.4 }}>{d.description}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page Component ──
export default function DueDatesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isClient = profile?.role === "client";

  const { data: dueDates = [], isLoading } = useQuery<DueDate[]>({
    queryKey: ["client-due-dates"],
    queryFn: async () => {
      const res = await apiClient.get("/client-services/due-dates");
      const active = res.data.data.map((s: any) => ({ slug: s.service?.slug ?? "", name: s.service?.name ?? "" })).filter((s: any) => s.slug);
      const raw = computeClientDueDates(active, 6);
      return raw;
    },
    enabled: isClient,
  });

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const cutoff    = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  // Grouping / processing for the agenda
  const hydrated = useMemo(() =>
    dueDates.map(d => ({ ...d, date: new Date(d.date) })),
    [dueDates]
  );

  // Show current month + next month only; overdue always show
  const visible = useMemo(() =>
    hydrated.filter(d => d.urgency === "overdue" || d.date < cutoff),
    [hydrated, cutoff]
  );

  const overdue    = useMemo(() => visible.filter(d => d.urgency === "overdue").sort((a, b) => a.date.getTime() - b.date.getTime()), [visible]);
  const thisMonthD = useMemo(() => visible.filter(d => d.urgency !== "overdue" && d.date >= thisMonth && d.date < nextMonth).sort((a, b) => a.date.getTime() - b.date.getTime()), [visible, thisMonth, nextMonth]);
  const nextMonthD = useMemo(() => visible.filter(d => d.date >= nextMonth && d.date < cutoff).sort((a, b) => a.date.getTime() - b.date.getTime()), [visible, nextMonth, cutoff]);

  const urgentCount = useMemo(() => hydrated.filter(d => d.urgency === "overdue" || d.urgency === "urgent").length, [hydrated]);

  if (authLoading || isLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isClient) return <Navigate to="/dashboard" replace />;

  function Group({ title, items, accent }: { title: string; items: typeof hydrated; accent?: string }) {
    if (items.length === 0) return null;
    return (
      <div className="dd-group" style={{ marginBottom: "2rem" }}>
        <div className="dd-group-title" style={{
          fontSize: "0.72rem",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: accent || "var(--ink-400)",
          borderBottom: "1px solid var(--line-soft)",
          paddingBottom: "0.5rem",
          marginBottom: "1rem"
        }}>
          {title}
        </div>

        {/* Premium Timeline Container */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", borderLeft: "1.5px solid var(--line-soft)", paddingLeft: "1.5rem", marginLeft: "6px", position: "relative" }}>
          {items.map(d => {
            const style = URGENCY_STYLE[d.urgency];
            return (
              <div key={d.id} className="dd-timeline-item-wrapper" style={{ position: "relative" }}>
                
                {/* Timeline Bullet Node */}
                <div style={{
                  position: "absolute",
                  left: "-29.5px",
                  top: "14px",
                  width: "11px",
                  height: "11px",
                  borderRadius: "50%",
                  border: "2px solid var(--paper)",
                  background: style.color,
                  boxShadow: "0 0 0 3px rgba(0,0,0,0.02)"
                }} />

                {/* Premium Agenda Card */}
                <div className="dd-item" style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: "1.25rem",
                  padding: "1.1rem 1.25rem",
                  background: "var(--card)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: "12px",
                  transition: "all 0.2s ease",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.01)"
                }}>
                  <div className="dd-item-left" style={{ display: "flex", flexDirection: "column", gap: "0.2rem", flex: 1 }}>
                    <div className="dd-item-date" style={{ color: style.color, fontSize: "0.78rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                      {fmt(d.date)}
                    </div>
                    <div className="dd-item-label" style={{ fontSize: "0.92rem", fontWeight: 600, color: "var(--ink-900)", lineHeight: 1.3 }}>
                      {d.label}
                    </div>
                    {d.description && (
                      <div className="dd-item-desc" style={{ fontSize: "0.78rem", color: "var(--ink-500)", marginTop: "0.2rem", lineHeight: 1.4 }}>
                        {d.description}
                      </div>
                    )}
                    <div className="dd-item-service" style={{ fontSize: "0.74rem", color: "var(--ink-400)", marginTop: "0.25rem" }}>
                      {d.serviceName}
                    </div>
                  </div>
                  
                  {/* Fine High-Contrast Outline Pill */}
                  <span className="dd-urgency-pill" style={{
                    background: style.bg,
                    color: style.color,
                    border: style.border,
                    borderRadius: "20px",
                    padding: "0.2rem 0.65rem",
                    fontSize: "0.68rem",
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    whiteSpace: "nowrap",
                    alignSelf: "flex-start",
                    marginTop: "2px"
                  }}>
                    {daysLeftLabel(d.date)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="dd-shell" style={{ padding: "1.5rem 1.5rem 4rem" }}>
      <div className="dd-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 className="dd-heading" style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--ink-900)", margin: 0, letterSpacing: "-0.02em" }}>Due Dates</h1>
          <p className="dd-sub" style={{ color: "var(--ink-500)", marginTop: "0.25rem", display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <span>Compliance deadlines relevant to your active services.</span>
            {urgentCount > 0 && (
              <span className="dd-urgent-badge" style={{
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.2)",
                color: "#dc2626",
                padding: "0.15rem 0.6rem",
                borderRadius: "20px",
                fontSize: "0.7rem",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.04em"
              }}>
                {urgentCount} need attention
              </span>
            )}
          </p>
        </div>
      </div>

      {hydrated.length === 0 ? (
        <div className="dd-empty-state" style={{ padding: "4rem 2rem", background: "var(--card)", border: "1.5px dashed var(--line-soft)", borderRadius: "16px" }}>
          <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "1rem" }}>📋</span>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--ink-900)", margin: 0 }}>No active services</h3>
          <p style={{ fontSize: "0.84rem", color: "var(--ink-400)", marginTop: "0.25rem" }}>Add a service to see your relevant compliance deadlines here.</p>
        </div>
      ) : (
        <div className="dd-page-body" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2.5rem", alignItems: "start" }}>
          
          {/* Left Column: Premium Sticky Calendar */}
          <div style={{ position: "sticky", top: "100px", alignSelf: "start" }}>
            <DueDatesCalendar dueDates={hydrated} />
          </div>

          {/* Right Column: Premium Timeline Agenda */}
          <div className="dd-agenda" style={{ display: "flex", flexDirection: "column" }}>
            {urgentCount > 0 && (
              <div className="dd-alert-bar" style={{
                padding: "0.85rem 1.25rem",
                background: "rgba(220,38,38,0.05)",
                border: "1.5px solid rgba(220,38,38,0.18)",
                borderRadius: "12px",
                marginBottom: "1.5rem",
                fontSize: "0.84rem",
                color: "#dc2626",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{urgentCount} deadline{urgentCount !== 1 ? "s" : ""} need urgent attention</span>
              </div>
            )}
            <Group title="Overdue" items={overdue} accent="#dc2626" />
            <Group title={monthLabel(thisMonth)} items={thisMonthD} />
            <Group title={monthLabel(nextMonth)} items={nextMonthD} />
          </div>

        </div>
      )}
    </div>
  );
}
