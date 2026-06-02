import { useState, useMemo } from "react";
import type { ReactNode } from "react";
import Loader from "../../../components/ui/Loader";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../api/client";
import { useAuth } from "../../../contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { computeClientDueDates } from "../../../shared/due-dates";
import type { DueDate } from "../../../shared/due-dates";

// ── Constants ─────────────────────────────────────────────────
const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

// ── Helpers ───────────────────────────────────────────────────
function weekDay(d: Date) { return (d.getDay() + 6) % 7; }
function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function nearestMonth(items: DueDate[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const upcoming = items.filter(d => d.date >= today).sort((a,b) => a.date.getTime()-b.date.getTime());
  if (!upcoming.length) return { year: now.getFullYear(), month: now.getMonth() };
  const inCurrent = upcoming.some(d => d.date.getFullYear()===now.getFullYear() && d.date.getMonth()===now.getMonth());
  return inCurrent ? { year: now.getFullYear(), month: now.getMonth() }
    : { year: upcoming[0].date.getFullYear(), month: upcoming[0].date.getMonth() };
}
function daysLeft(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86400000);
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"short" });
}
function fmtFull(d: Date) {
  return d.toLocaleDateString("en-IN", { day:"numeric", month:"long", year:"numeric" });
}
function monthTitle(d: Date) {
  return d.toLocaleDateString("en-IN", { month:"long", year:"numeric" });
}

// ── Urgency config ────────────────────────────────────────────
type Urgency = DueDate["urgency"];
const U: Record<Urgency, { dot: string; accent: string; pillBg: string; pillFg: string; borderColor: string }> = {
  overdue:  { dot:"#d4493f", accent:"#c43d33", pillBg:"#fbe9e2", pillFg:"#c43d33", borderColor:"#e07570" },
  urgent:   { dot:"#d98a2b", accent:"#a96a16", pillBg:"#f6ecd6", pillFg:"#a96a16", borderColor:"#e0b060" },
  upcoming: { dot:"var(--lp-ink-muted)", accent:"var(--lp-ink-muted)", pillBg:"var(--lp-surface-2)", pillFg:"var(--lp-ink-muted)", borderColor:"var(--lp-hairline)" },
  later:    { dot:"var(--lp-ink-faint)", accent:"var(--lp-ink-faint)", pillBg:"var(--lp-surface-2)", pillFg:"var(--lp-ink-faint)", borderColor:"var(--lp-hairline-soft)" },
};
const ORDER: Urgency[] = ["overdue","urgent","upcoming","later"];
function topUrgency(items: DueDate[]): Urgency {
  return items.reduce<Urgency>((b,d) => ORDER.indexOf(d.urgency)<ORDER.indexOf(b)?d.urgency:b,"later");
}

// ── Countdown label ───────────────────────────────────────────
function countdownLabel(d: Date): { num: string; unit: string } {
  const n = daysLeft(d);
  if (n < 0)  return { num: String(Math.abs(n)), unit: Math.abs(n)===1?"day overdue":"days overdue" };
  if (n === 0) return { num: "0",  unit: "due today" };
  if (n === 1) return { num: "1",  unit: "day left" };
  return { num: String(n), unit: "days left" };
}

// ── Mini SVG icons ────────────────────────────────────────────
function SvgIco({ paths, sw=1.8, size=18 }: { paths: ReactNode; sw?: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {paths}
    </svg>
  );
}
const IcoChevL = () => <SvgIco paths={<path d="m15 18-6-6 6-6"/>} sw={2}/>;
const IcoChevR = () => <SvgIco paths={<path d="m9 18 6-6-6-6"/>} sw={2}/>;
const IcoAlert = () => <SvgIco paths={<><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></>} />;
const IcoClock = () => <SvgIco paths={<><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></>} />;
const IcoCalendar = () => <SvgIco paths={<><rect x="3" y="4" width="18" height="18" rx="2.5"/><path d="M16 2v4M8 2v4M3 10h18"/></>} />;
const IcoFolder = () => <SvgIco paths={<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>} />;
const IcoCheck = () => <SvgIco paths={<path d="M20 6 9 17l-5-5"/>} sw={2.4} />;

// ── Calendar ──────────────────────────────────────────────────
function Calendar({ items }: { items: DueDate[] }) {
  const [year, setYear] = useState(() => nearestMonth(items).year);
  const [month, setMonth] = useState(() => nearestMonth(items).month);
  const [sel, setSel] = useState<string|null>(null);
  const now = new Date();
  const todayKey = toKey(now);

  function prev() { if (month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);setSel(null); }
  function next() { if (month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);setSel(null); }

  const label = new Date(year,month,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
  const totalDays = new Date(year,month+1,0).getDate();
  const startPad = weekDay(new Date(year,month,1));

  const dayMap = useMemo(() => {
    const m = new Map<string,DueDate[]>();
    for (const d of items) { const k=toKey(d.date); if(!m.has(k))m.set(k,[]); m.get(k)!.push(d); }
    return m;
  }, [items]);

  const cells: (number|null)[] = [
    ...Array<null>(startPad).fill(null),
    ...Array.from({length:totalDays},(_,i)=>i+1),
  ];
  while (cells.length%7!==0) cells.push(null);

  function dk(day:number){ return `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`; }

  const selItems = sel ? (dayMap.get(sel)??[]) : [];

  return (
    <div className="ddc">
      {/* nav */}
      <div className="ddc-nav">
        <button className="ddc-navbtn" onClick={prev} aria-label="Previous month"><IcoChevL /></button>
        <span className="ddc-label">{label}</span>
        <button className="ddc-navbtn" onClick={next} aria-label="Next month"><IcoChevR /></button>
      </div>

      {/* dow */}
      <div className="ddc-grid">
        {WEEK_DAYS.map((d,i)=><div key={i} className="ddc-dow">{d}</div>)}

        {/* cells */}
        {cells.map((day,i)=>{
          if(day===null) return <div key={`x${i}`} className="ddc-cell ddc-empty"/>;
          const k=dk(day);
          const its=dayMap.get(k)??[];
          const isToday=k===todayKey;
          const isSel=k===sel;
          const hasDue=its.length>0;
          const urg=hasDue?topUrgency(its):null;
          return (
            <div key={k}
              className={`ddc-cell${isToday?" is-today":""}${hasDue?" has-due":""}${isSel?" is-sel":""}`}
              onClick={()=>hasDue&&setSel(isSel?null:k)}
              role={hasDue?"button":undefined}
              tabIndex={hasDue?0:undefined}
              onKeyDown={hasDue?(e=>e.key==="Enter"&&setSel(isSel?null:k)):undefined}
            >
              <span className="ddc-num">{day}</span>
              {hasDue&&urg&&(
                <span className="ddc-dot" style={{background:U[urg].dot}}/>
              )}
            </div>
          );
        })}
      </div>

      {/* expanded day */}
      {sel&&selItems.length>0&&(
        <div className="ddc-expand">
          <div className="ddc-expand-date">{fmtFull(new Date(sel+"T00:00:00"))}</div>
          {selItems.map(d=>(
            <div key={d.id} className="ddc-expand-item" style={{borderLeftColor:U[d.urgency].dot}}>
              <div className="ddc-expand-name">{d.label}</div>
              <div className="ddc-expand-svc">{d.serviceName}</div>
              {d.description&&<div className="ddc-expand-desc">{d.description}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Deadline card ─────────────────────────────────────────────
function DeadlineCard({ d }: { d: DueDate }) {
  const n = daysLeft(d.date);
  const u = U[d.urgency];
  const label = n<0?`${Math.abs(n)}d overdue`:n===0?"Today":n===1?"Tomorrow":`${n}d`;
  return (
    <div className="ddl-card" style={{borderLeftColor:u.borderColor}}>
      <div className="ddl-card-body">
        <div className="ddl-card-top">
          <span className="ddl-date" style={{color:u.accent}}>{fmtShort(d.date)}</span>
          <span className="ddl-pill" style={{background:u.pillBg,color:u.pillFg}}>{label}</span>
        </div>
        <div className="ddl-name">{d.label}</div>
        {d.description&&<div className="ddl-desc">{d.description}</div>}
        <div className="ddl-svc">
          <IcoFolder />
          {d.serviceName}
        </div>
      </div>
    </div>
  );
}

// ── Group (agenda section) ────────────────────────────────────
function Group({ title, items, accent }: { title: string; items: DueDate[]; accent?: string }) {
  if (!items.length) return null;
  return (
    <section className="ddg">
      <div className="ddg-head">
        <span className="ddg-title" style={accent?{color:accent}:undefined}>{title}</span>
        <span className="ddg-pill">{items.length}</span>
      </div>
      <div className="ddg-list">
        {items.map(d=><DeadlineCard key={d.id} d={d}/>)}
      </div>
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function DueDatesPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isClient = profile?.role === "client";

  const { data: dueDates=[], isLoading } = useQuery<DueDate[]>({
    queryKey: ["client-due-dates"],
    queryFn: async () => {
      const res = await apiClient.get("/client-services/due-dates");
      const active = res.data.data
        .map((s:any) => ({slug:s.service?.slug??"",name:s.service?.name??""}))
        .filter((s:any)=>s.slug);
      return computeClientDueDates(active,6);
    },
    enabled: isClient,
  });

  const now = new Date();
  const thisMonth = new Date(now.getFullYear(),now.getMonth(),1);
  const nextMonth = new Date(now.getFullYear(),now.getMonth()+1,1);
  const cutoff    = new Date(now.getFullYear(),now.getMonth()+2,1);

  const hydrated = useMemo(()=>dueDates.map(d=>({...d,date:new Date(d.date)})),[dueDates]);
  const visible  = useMemo(()=>hydrated.filter(d=>d.urgency==="overdue"||d.date<cutoff),[hydrated,cutoff]);

  const sorted=(arr:DueDate[])=>[...arr].sort((a,b)=>a.date.getTime()-b.date.getTime());
  const overdue    = useMemo(()=>sorted(visible.filter(d=>d.urgency==="overdue")),[visible]);
  const thisMonthD = useMemo(()=>sorted(visible.filter(d=>d.urgency!=="overdue"&&d.date>=thisMonth&&d.date<nextMonth)),[visible,thisMonth,nextMonth]);
  const nextMonthD = useMemo(()=>sorted(visible.filter(d=>d.date>=nextMonth&&d.date<cutoff)),[visible,nextMonth,cutoff]);

  const stats = useMemo(()=>({
    overdue: hydrated.filter(d=>d.urgency==="overdue").length,
    urgent:  hydrated.filter(d=>d.urgency==="urgent").length,
    upcoming:hydrated.filter(d=>d.urgency==="upcoming").length,
    total:   hydrated.length,
  }),[hydrated]);

  // next pressing deadline for the hero countdown
  const hero = overdue[0]??thisMonthD[0]??nextMonthD[0]??null;
  const heroCD = hero ? countdownLabel(hero.date) : null;

  if (authLoading||isLoading) return <div className="page-loader"><Loader/></div>;
  if (!isClient) return <Navigate to="/dashboard" replace/>;

  const allClear = !overdue.length&&!thisMonthD.length&&!nextMonthD.length;

  return (
    <div className="ddp">
      {/* ── Page header ── */}
      <header className="ddp-head">
        <span className="ddp-eyebrow">Compliance calendar</span>
        <h1 className="ddp-title">Due Dates</h1>
        <p className="ddp-sub">Statutory deadlines for your active services — nothing slips.</p>
      </header>

      {!hydrated.length ? (
        /* Empty state */
        <div className="ddp-empty">
          <span className="ddp-empty-ico"><IcoCalendar/></span>
          <h3>No active services</h3>
          <p>Add a service to see its compliance deadlines appear here.</p>
        </div>
      ) : (
        <div className="ddp-body">
          {/* ── LEFT COLUMN ── */}
          <aside className="ddp-aside">
            {/* Hero countdown */}
            <div className={`ddp-hero${hero?" ddp-hero--"+hero.urgency:" ddp-hero--clear"}`}>
              <div className="ddp-hero-glow"/>
              {hero&&heroCD ? (
                <>
                  <div className="ddp-hero-eyebrow">
                    {hero.urgency==="overdue"
                      ? <><IcoAlert/> Overdue</>
                      : hero.urgency==="urgent"
                      ? <><IcoClock/> Due soon</>
                      : <><IcoCalendar/> Next deadline</>}
                  </div>
                  <div className="ddp-hero-count">
                    <span className="ddp-hero-num">{heroCD.num}</span>
                    <span className="ddp-hero-unit">{heroCD.unit}</span>
                  </div>
                  <div className="ddp-hero-name">{hero.label}</div>
                  <div className="ddp-hero-meta">{hero.serviceName} · {fmtFull(hero.date)}</div>
                </>
              ) : (
                <>
                  <div className="ddp-hero-eyebrow ddp-hero-eyebrow--clear"><IcoCheck/> All clear</div>
                  <div className="ddp-hero-name" style={{marginTop:12}}>Nothing urgent right now</div>
                  <div className="ddp-hero-meta">Deadlines will surface here as they approach.</div>
                </>
              )}
            </div>

            {/* Stat row */}
            <div className="ddp-stats">
              <div className="ddp-stat" data-tone={stats.overdue>0?"overdue":"none"}>
                <IcoAlert/>
                <div>
                  <div className="ddp-stat-n">{stats.overdue}</div>
                  <div className="ddp-stat-l">Overdue</div>
                </div>
              </div>
              <div className="ddp-stat" data-tone={stats.urgent>0?"urgent":"none"}>
                <IcoClock/>
                <div>
                  <div className="ddp-stat-n">{stats.urgent}</div>
                  <div className="ddp-stat-l">Urgent</div>
                </div>
              </div>
              <div className="ddp-stat">
                <IcoCalendar/>
                <div>
                  <div className="ddp-stat-n">{stats.upcoming}</div>
                  <div className="ddp-stat-l">Upcoming</div>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <Calendar items={hydrated}/>
          </aside>

          {/* ── RIGHT COLUMN — Agenda ── */}
          <main className="ddp-agenda">
            {allClear ? (
              <div className="ddp-agenda-clear">
                <span className="ddp-agenda-clear-ico"><IcoCheck/></span>
                <h3>You're all caught up</h3>
                <p>No deadlines in the next 60 days. We'll alert you as they approach.</p>
              </div>
            ) : (
              <>
                <Group title="Overdue" items={overdue} accent="#c43d33"/>
                <Group title={monthTitle(thisMonth)} items={thisMonthD}/>
                <Group title={monthTitle(nextMonth)} items={nextMonthD}/>
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
