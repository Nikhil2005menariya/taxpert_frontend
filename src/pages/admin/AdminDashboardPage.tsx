import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QueueItem { id: string; priority: number; client_name?: string; service_name?: string }
interface Inquiry { id: string; name: string; phone: string; email: string; service_needed: string; created_at: string }
interface Texpert { id: string; first_name: string | null; last_name: string | null; role: string; active_count: number }

interface DashboardStats {
  revenue: { total: number; thisMonth: number };
  revenueByMonth: { key: string; label: string; amount: number }[];
  pipeline: Record<string, number>;
  queue: { openCount: number; topItems: QueueItem[] };
  recentInquiries: Inquiry[];
  texpertWorkload: Texpert[];
  clients: { total: number; newThisMonth: number };
}

// ── Config ────────────────────────────────────────────────────────────────────

const PIPELINE_CFG: { key: string; label: string; color: string }[] = [
  { key: 'documents_required', label: 'Docs Required', color: '#c98a2e' },
  { key: 'documents_received', label: 'Docs Received', color: '#8b857a' },
  { key: 'in_progress', label: 'In Progress', color: '#4b7a8a' },
  { key: 'under_review', label: 'Under Review', color: '#6b6fc4' },
  { key: 'payment', label: 'Payment', color: '#e85220' },
  { key: 'completed', label: 'Completed', color: '#2f7a5b' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const rupees = (paise: number) => paise / 100;
const fmtINR = (paise: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(rupees(paise)))}`;
function fmtShort(paise: number): string {
  const r = rupees(paise);
  if (r >= 1e7) return `₹${(r / 1e7).toFixed(r >= 1e8 ? 0 : 1)}Cr`;
  if (r >= 1e5) return `₹${(r / 1e5).toFixed(1)}L`;
  if (r >= 1e3) return `₹${(r / 1e3).toFixed(0)}k`;
  if (r > 0) return `₹${Math.round(r)}`;
  return '₹0';
}
function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function relTime(iso: string | null): string {
  if (!iso) return '—';
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(iso));
}
function initials(a?: string | null, b?: string | null): string {
  return `${(a ?? '').charAt(0)}${(b ?? '').charAt(0)}`.toUpperCase() || '?';
}
function priorityMeta(p: number): { label: string; tone: string } {
  if (p >= 8) return { label: 'High', tone: 'high' };
  if (p >= 5) return { label: 'Medium', tone: 'med' };
  return { label: 'Low', tone: 'low' };
}

// ── Count-up ──────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1100): number {
  const [val, setVal] = useState(0);
  const fromRef = useRef<number>(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const from = fromRef.current;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (target - from) * eased;
      fromRef.current = next;
      setVal(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

// ── Icons (crisp line SVG, no emoji/glyphs) ─────────────────────────────────────

const I = {
  rupee: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 3h12M6 8h12M16 3c0 5-3.5 6-7 6h-1l6 9" /></svg>),
  trend: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 17l6-6 4 4 8-8" /><path d="M17 7h4v4" /></svg>),
  users: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" /></svg>),
  inbox: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" /></svg>),
  spark: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></svg>),
  up: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 19V5M6 11l6-6 6 6" /></svg>),
  down: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5v14M6 13l6 6 6-6" /></svg>),
  chev: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 18l6-6-6-6" /></svg>),
  phone: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" /></svg>),
  layers: (p: any) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m12 2 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 17l9 5 9-5" /></svg>),
};

// ── Sparkline (KPI mini chart) ──────────────────────────────────────────────────

function Sparkline({ points, stroke }: { points: number[]; stroke: string }) {
  const W = 100, H = 28;
  const max = Math.max(...points, 1), min = Math.min(...points, 0), range = max - min || 1;
  const pts = points.map((v, i) => [(i / Math.max(points.length - 1, 1)) * W, H - 2 - ((v - min) / range) * (H - 4)]);
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const id = `sg-${stroke.replace('#', '')}`;
  return (
    <svg className="adm-spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={stroke} stopOpacity="0.5" /><stop offset="100%" stopColor={stroke} stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${W},${H} L0,${H} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── KPI tile (dark hero) ────────────────────────────────────────────────────────

function KpiTile({ to, icon, label, value, sub, delta, spark }: {
  to: string; icon: React.ReactNode; label: string; value: string;
  sub?: React.ReactNode; delta?: { dir: 'up' | 'down'; text: string }; spark?: number[];
}) {
  return (
    <Link to={to} className="adm-kpi" data-anim>
      <div className="adm-kpi-top">
        <span className="adm-kpi-ico">{icon}</span>
        <span className="adm-kpi-label">{label}</span>
        <I.chev className="adm-kpi-go" width={14} height={14} />
      </div>
      <div className="adm-kpi-val">{value}</div>
      <div className="adm-kpi-foot">
        {delta && <span className={`adm-delta adm-delta--${delta.dir}`}>{delta.dir === 'up' ? <I.up width={10} height={10} /> : <I.down width={10} height={10} />}{delta.text}</span>}
        {sub && <span className="adm-kpi-sub">{sub}</span>}
      </div>
      {spark && spark.length > 1 && <div className="adm-kpi-spark"><Sparkline points={spark} stroke="#e85220" /></div>}
    </Link>
  );
}

// ── Revenue area chart ──────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: DashboardStats['revenueByMonth'] }) {
  const pathRef = useRef<SVGPathElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [hover, setHover] = useState<number | null>(null);

  const W = 720, H = 290, pL = 54, pR = 20, pT = 22, pB = 38;
  const cW = W - pL - pR, cH = H - pT - pB;
  const maxVal = Math.max(...data.map(d => d.amount), 1);
  const niceMax = maxVal * 1.15;

  const pts = useMemo(() => data.map((d, i) => ({
    x: pL + (i / Math.max(data.length - 1, 1)) * cW,
    y: pT + cH - (d.amount / niceMax) * cH, ...d,
  })), [data, cW, cH, niceMax]);

  const linePath = useMemo(() => {
    if (pts.length < 2) return pts.map(p => `M${p.x},${p.y}`).join(' ');
    let d = `M${pts[0].x.toFixed(1)},${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1], cx = (p0.x + p1.x) / 2;
      d += ` C${cx.toFixed(1)},${p0.y.toFixed(1)} ${cx.toFixed(1)},${p1.y.toFixed(1)} ${p1.x.toFixed(1)},${p1.y.toFixed(1)}`;
    }
    return d;
  }, [pts]);
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${pT + cH} L${pL},${pT + cH} Z`;

  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.style.transition = 'none';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(0.4,0,0.2,1)';
      el.style.strokeDashoffset = '0';
    }));
  }, [linePath]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: pT + (1 - f) * cH, label: fmtShort(niceMax * f) }));
  const onMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current; if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0, bd = Infinity;
    pts.forEach((p, i) => { const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = i; } });
    setHover(best);
  }, [pts]);

  const total = data.reduce((s, d) => s + d.amount, 0);
  const hp = hover != null ? pts[hover] : null;

  return (
    <section className="adm-card adm-card--chart" data-anim>
      <div className="adm-card-head">
        <div><span className="adm-eyebrow">Revenue</span><h3 className="adm-card-title">Last 12 months</h3></div>
        <div className="adm-chart-total"><span className="adm-chart-total-val">{fmtShort(total)}</span><span className="adm-chart-total-lbl">collected</span></div>
      </div>
      <div className="adm-chart-plot">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="adm-chart-svg" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs><linearGradient id="adm-rev-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e85220" stopOpacity="0.20" /><stop offset="100%" stopColor="#e85220" stopOpacity="0" /></linearGradient></defs>
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={pL} y1={t.y} x2={W - pR} y2={t.y} stroke="var(--lp-hairline-soft)" strokeWidth="1" strokeDasharray={i === 0 ? '0' : '3 4'} />
              <text x={pL - 10} y={t.y + 3.5} textAnchor="end" className="adm-chart-axis">{t.label}</text>
            </g>
          ))}
          <path d={areaPath} fill="url(#adm-rev-grad)" />
          <path ref={pathRef} d={linePath} fill="none" stroke="#e85220" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          {hp && (<g><line x1={hp.x} y1={pT} x2={hp.x} y2={pT + cH} stroke="#e85220" strokeWidth="1" strokeDasharray="3 3" opacity="0.4" /><circle cx={hp.x} cy={hp.y} r="6.5" fill="#fff" stroke="#e85220" strokeWidth="2.5" /></g>)}
          {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.1" fill="#e85220" stroke="#fff" strokeWidth="1.8" style={{ opacity: 0, animation: `adm-fade-dot .3s ease-out ${0.95 + i * 0.04}s forwards` }} />)}
          {pts.map((p, i) => <text key={i} x={p.x} y={H - 12} textAnchor="middle" className="adm-chart-axis">{p.label}</text>)}
        </svg>
        {hp && <div className="adm-chart-tip" style={{ left: `${(hp.x / W) * 100}%`, top: `${(hp.y / H) * 100}%` }}><span className="adm-chart-tip-m">{hp.label}</span><span className="adm-chart-tip-v">{fmtINR(hp.amount)}</span></div>}
      </div>
    </section>
  );
}

// ── Pipeline donut (interactive + drill-down) ────────────────────────────────────

function PipelineDonut({ pipeline }: { pipeline: Record<string, number> }) {
  const navigate = useNavigate();
  const [active, setActive] = useState<number | null>(null);
  const items = PIPELINE_CFG.map(c => ({ ...c, value: pipeline[c.key] ?? 0 }));
  const total = items.reduce((s, d) => s + d.value, 0);
  const totalUp = Math.round(useCountUp(total, 1000));

  const R = 62, C = 2 * Math.PI * R, cx = 80, cy = 80, sw = 18;
  let offsetAcc = 0;
  const segs = items.filter(i => i.value > 0).map((d) => {
    const frac = d.value / total;
    const len = frac * C;
    const seg = { ...d, len, gap: C - len, dashOffset: -offsetAcc };
    offsetAcc += len;
    return seg;
  });

  return (
    <section className="adm-card adm-card--donut" data-anim>
      <div className="adm-card-head">
        <div><span className="adm-eyebrow">Pipeline</span><h3 className="adm-card-title">Service stages</h3></div>
        <Link to="/admin/client-services" className="adm-link">View all <I.chev width={13} height={13} /></Link>
      </div>

      {total === 0 ? (
        <p className="adm-empty">No active services yet.</p>
      ) : (
        <div className="adm-donut-wrap">
          <div className="adm-donut-svg-wrap">
            <svg viewBox="0 0 160 160" className="adm-donut-svg">
              <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--lp-hairline-soft)" strokeWidth={sw} />
              <g transform={`rotate(-90 ${cx} ${cy})`}>
                {segs.map((s, i) => {
                  const dimmed = active != null && active !== i;
                  return (
                    <circle key={s.key} cx={cx} cy={cy} r={R} fill="none" stroke={s.color}
                      strokeWidth={active === i ? sw + 4 : sw}
                      strokeDasharray={`${s.len} ${s.gap}`} strokeDashoffset={s.dashOffset}
                      strokeLinecap="butt"
                      className="adm-donut-seg"
                      style={{ opacity: dimmed ? 0.32 : 1, animation: `adm-donut-draw .9s cubic-bezier(0.4,0,0.2,1) ${0.1 + i * 0.08}s both`, cursor: 'pointer' }}
                      onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}
                      onClick={() => navigate(`/admin/client-services?status=${s.key}`)} />
                  );
                })}
              </g>
              <text x={cx} y={cy - 4} textAnchor="middle" className="adm-donut-center-num">{totalUp}</text>
              <text x={cx} y={cy + 14} textAnchor="middle" className="adm-donut-center-lbl">ACTIVE</text>
            </svg>
          </div>

          <ul className="adm-donut-legend">
            {items.map((d) => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              const segIdx = segs.findIndex(s => s.key === d.key);
              return (
                <li key={d.key}
                  className={`adm-leg-row${active === segIdx && segIdx >= 0 ? ' is-active' : ''}${d.value === 0 ? ' is-zero' : ''}`}
                  onMouseEnter={() => segIdx >= 0 && setActive(segIdx)} onMouseLeave={() => setActive(null)}
                  onClick={() => navigate(`/admin/client-services?status=${d.key}`)}>
                  <span className="adm-leg-dot" style={{ background: d.color }} />
                  <span className="adm-leg-name">{d.label}</span>
                  <span className="adm-leg-num">{d.value}</span>
                  <span className="adm-leg-pct">{pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// ── Assignment queue ────────────────────────────────────────────────────────────

function QueuePanel({ queue }: { queue: DashboardStats['queue'] }) {
  return (
    <section className="adm-card" data-anim>
      <div className="adm-card-head">
        <div><span className="adm-eyebrow">Operations</span><h3 className="adm-card-title">Assignment queue <span className="adm-count">{queue.openCount}</span></h3></div>
        <Link to="/admin/queue" className="adm-link">Open queue <I.chev width={13} height={13} /></Link>
      </div>
      {queue.topItems.length === 0 ? (
        <p className="adm-empty">Nothing waiting to be assigned.</p>
      ) : (
        <ul className="adm-feed">
          {queue.topItems.map((item, i) => {
            const prio = priorityMeta(item.priority ?? 0);
            return (
              <li key={item.id} className="adm-feed-row" style={{ ['--i' as any]: i }}>
                <span className={`adm-prio adm-prio--${prio.tone}`} />
                <div className="adm-feed-main"><span className="adm-feed-title">{item.service_name || '—'}</span><span className="adm-feed-sub">{item.client_name || '—'}</span></div>
                <span className={`adm-pill adm-pill--${prio.tone}`}>{prio.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ── New inquiries ─────────────────────────────────────────────────────────────

function InquiriesPanel({ inquiries }: { inquiries: Inquiry[] }) {
  return (
    <section className="adm-card" data-anim>
      <div className="adm-card-head">
        <div><span className="adm-eyebrow">Leads</span><h3 className="adm-card-title">New inquiries</h3></div>
        <Link to="/admin/inquiries" className="adm-link">View all <I.chev width={13} height={13} /></Link>
      </div>
      {inquiries.length === 0 ? (
        <p className="adm-empty">No pending inquiries.</p>
      ) : (
        <ul className="adm-feed">
          {inquiries.map((inq, i) => (
            <li key={inq.id} className="adm-feed-row" style={{ ['--i' as any]: i }}>
              <span className="adm-feed-ico"><I.phone width={15} height={15} /></span>
              <div className="adm-feed-main"><span className="adm-feed-title">{inq.name}</span><span className="adm-feed-sub">{inq.service_needed}</span></div>
              <div className="adm-feed-right"><span className="adm-feed-meta">{inq.phone}</span><span className="adm-feed-time">{relTime(inq.created_at)}</span></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Texpert workload ─────────────────────────────────────────────────────────

function WorkloadGrid({ workload }: { workload: Texpert[] }) {
  if (workload.length === 0) return null;
  const sorted = [...workload].sort((a, b) => b.active_count - a.active_count);
  return (
    <section data-anim>
      <div className="adm-section-head"><span className="adm-eyebrow">Team</span><h3 className="adm-section-title">Texpert workload</h3></div>
      <div className="adm-team-grid">
        {sorted.map((tx, i) => {
          const pct = Math.min((tx.active_count / 10) * 100, 100);
          const name = `${tx.first_name ?? ''} ${tx.last_name ?? ''}`.trim() || 'Unknown';
          const tone = pct > 80 ? 'high' : pct > 50 ? 'med' : 'low';
          return (
            <Link key={tx.id} to={`/admin/users/taxpert/${tx.id}`} className="adm-team-card" style={{ ['--i' as any]: i }}>
              <div className="adm-team-top">
                <span className="adm-avatar">{initials(tx.first_name, tx.last_name)}</span>
                <div className="adm-team-id"><span className="adm-team-name">{name}</span><span className={`adm-role adm-role--${tx.role}`}>{tx.role.toUpperCase()}</span></div>
                <I.chev className="adm-team-go" width={15} height={15} />
              </div>
              <div className="adm-team-metric"><span className="adm-team-count">{tx.active_count}</span><span className="adm-team-of">/ 10 active</span></div>
              <span className="adm-team-track"><span className={`adm-team-fill adm-team-fill--${tone}`} style={{ width: `${pct}%`, transitionDelay: `${0.1 + i * 0.05}s` }} /></span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => (await apiClient.get('/admin/dashboard-stats')).data,
    enabled: isAdmin,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data) return;
    const root = rootRef.current; if (!root) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>('[data-anim]'));
    requestAnimationFrame(() => {
      els.forEach((el, i) => gsap.fromTo(el, { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.04 * i, clearProps: 'transform' }));
    });
  }, [data]);

  if (!authLoading && !isAdmin) return <Navigate to="/dashboard" replace />;

  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const firstName = profile?.first_name ?? 'Admin';

  return (
    <div className="db-page-new adm-root" ref={rootRef}>
      <header className="adm-hero" data-anim>
        <div className="adm-hero-glow" aria-hidden />
        <div className="adm-hero-bar">
          <div>
            <span className="adm-hero-eyebrow">Admin · Overview</span>
            <h1 className="adm-hero-title">{greeting()}, {firstName}</h1>
            <p className="adm-hero-date">{today}</p>
          </div>
          <span className="adm-hero-live"><span className="adm-hero-live-dot" />Live</span>
        </div>
        <div className="adm-kpis">
          {isLoading || !data ? [0, 1, 2, 3].map(i => <div key={i} className="adm-kpi adm-kpi--skel" />) : <KpiRow data={data} />}
        </div>
      </header>

      {isLoading || !data ? (
        <div className="adm-grid">
          <div className="adm-skel adm-skel--chart" /><div className="adm-skel adm-skel--side" />
          <div className="adm-skel adm-skel--half" /><div className="adm-skel adm-skel--half" />
        </div>
      ) : (
        <>
          <div className="adm-grid">
            <RevenueChart data={data.revenueByMonth ?? []} />
            <PipelineDonut pipeline={data.pipeline} />
            <QueuePanel queue={data.queue} />
            <InquiriesPanel inquiries={data.recentInquiries ?? []} />
          </div>
          <WorkloadGrid workload={data.texpertWorkload ?? []} />
        </>
      )}
    </div>
  );
}

function KpiRow({ data }: { data: DashboardStats }) {
  const months = data.revenueByMonth ?? [];
  const spark = months.map(m => m.amount);
  const thisM = months.length ? months[months.length - 1].amount : data.revenue.thisMonth;
  const prevM = months.length > 1 ? months[months.length - 2].amount : 0;
  const delta = prevM > 0 ? Math.round(((thisM - prevM) / prevM) * 100) : (thisM > 0 ? 100 : 0);

  const totalUp = useCountUp(rupees(data.revenue.total));
  const monthUp = useCountUp(rupees(thisM));
  const clientsUp = useCountUp(data.clients.total);
  const queueUp = useCountUp(data.queue.openCount);

  return (
    <>
      <KpiTile to="/admin/payments" icon={<I.rupee width={16} height={16} />} label="Total revenue" value={fmtShort(totalUp * 100)} sub="all-time captured" spark={spark} />
      <KpiTile to="/admin/payments" icon={<I.trend width={16} height={16} />} label="This month" value={fmtShort(monthUp * 100)} delta={{ dir: delta >= 0 ? 'up' : 'down', text: `${Math.abs(delta)}%` }} sub="vs last month" />
      <KpiTile to="/admin/users" icon={<I.users width={16} height={16} />} label="Active clients" value={String(Math.round(clientsUp))} delta={data.clients.newThisMonth > 0 ? { dir: 'up', text: `${data.clients.newThisMonth} new` } : undefined} sub="total" />
      <KpiTile to="/admin/queue" icon={<I.inbox width={16} height={16} />} label="Open queue" value={String(Math.round(queueUp))} sub="awaiting assignment" />
    </>
  );
}
