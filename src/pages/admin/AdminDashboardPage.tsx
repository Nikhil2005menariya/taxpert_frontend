import { useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Inquiry {
  id: string;
  name: string;
  phone: string;
  email: string;
  service_needed: string;
  created_at: string;
}

interface DashboardStats {
  revenue: { total: number; thisMonth: number };
  revenueByMonth: { key: string; label: string; amount: number }[];
  pipeline: Record<string, number>;
  queue: { openCount: number; topItems: any[] };
  recentInquiries: Inquiry[];
  texpertWorkload: any[];
  clients: { total: number; newThisMonth: number };
}

// ── Config ────────────────────────────────────────────────────────────────────

const PIPELINE_CFG = [
  { key: 'documents_required', label: 'Docs Required',   color: '#f59e0b' },
  { key: 'documents_received', label: 'Docs Received',   color: '#64748b' },
  { key: 'under_review',       label: 'Under Review',    color: '#3b82f6' },
  { key: 'in_progress',        label: 'In Progress',     color: '#0ea5e9' },
  { key: 'payment',            label: 'Payment',         color: '#a855f7' },
  { key: 'completed',          label: 'Completed',       color: '#10b981' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function priorityLabel(p: number): { label: string; color: string } {
  if (p >= 8) return { label: 'High',   color: '#dc2626' };
  if (p >= 5) return { label: 'Medium', color: '#d97706' };
  return           { label: 'Low',    color: '#6b7280' };
}

function roleBadgeColor(role: string): string {
  return role === 'ca' ? '#7c3aed' : '#1d4ed8';
}

// Y-axis label: paise → short rupee string
function fmtShort(paise: number): string {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000)   return `₹${(r / 1000).toFixed(0)}k`;
  if (r > 0)       return `₹${r.toFixed(0)}`;
  return '₹0';
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ w, h, r = 6 }: { w?: string; h?: string; r?: number }) {
  return (
    <div style={{
      width: w ?? '100%', height: h ?? '1rem', borderRadius: r,
      background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
      backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite', flexShrink: 0,
    }} />
  );
}

// ── Revenue Line Chart ────────────────────────────────────────────────────────

function RevenueChart({ data }: { data: DashboardStats['revenueByMonth'] }) {
  const pathRef = useRef<SVGPathElement>(null);
  const W = 480, H = 180, pL = 50, pR = 16, pT = 18, pB = 32;
  const cW = W - pL - pR, cH = H - pT - pB;

  const maxVal = Math.max(...data.map(d => d.amount), 1);

  const pts = data.map((d, i) => ({
    x: pL + (i / Math.max(data.length - 1, 1)) * cW,
    y: pT + cH - (d.amount / maxVal) * cH,
    ...d,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  const areaPath = `${linePath} L${last.x.toFixed(1)},${(pT + cH).toFixed(1)} L${pL},${(pT + cH).toFixed(1)} Z`;

  // Animate line draw on mount / data change
  useEffect(() => {
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    el.style.transition = 'none';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4, 0, 0.2, 1)';
        el.style.strokeDashoffset = '0';
      });
    });
  }, [data]);

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: pT + (1 - f) * cH,
    label: fmtShort(maxVal * f),
  }));

  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <span style={S.cardTitle}>Revenue · Last 12 Months</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.13" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pL} y1={t.y} x2={W - pR} y2={t.y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={pL - 5} y={t.y + 3.5} textAnchor="end" fontSize="8.5" fill="#94a3b8">{t.label}</text>
          </g>
        ))}

        {/* Area */}
        <path d={areaPath} fill="url(#rev-grad)" />

        {/* Animated line */}
        <path ref={pathRef} d={linePath} fill="none" stroke="#3b82f6" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots — fade in after line draws */}
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="#fff" strokeWidth="2"
            style={{ opacity: 0, animation: `fade-dot 0.25s ease-out ${0.9 + i * 0.04}s forwards` }} />
        ))}

        {/* X-axis labels */}
        {pts.map((p, i) => (
          <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#94a3b8">{p.label}</text>
        ))}
      </svg>
    </div>
  );
}

// ── Service Breakdown Donut ───────────────────────────────────────────────────

function ServiceBreakdown({ pipeline }: { pipeline: Record<string, number> }) {
  const r = 54, cx = 74, cy = 74, sw = 20;
  const circumference = 2 * Math.PI * r;

  const items = PIPELINE_CFG.map(c => ({ ...c, value: pipeline[c.key] ?? 0 }));
  const total = items.reduce((s, d) => s + d.value, 0);

  let cumulative = 0;
  const segments = items
    .filter(d => d.value > 0)
    .map(d => {
      const dashLen = (d.value / total) * circumference;
      const offset  = cumulative;
      cumulative += dashLen;
      return { ...d, dashLen, offset };
    });

  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <span style={S.cardTitle}>Service Breakdown</span>
        <Link to="/admin/client-services" style={S.viewAll}>View all</Link>
      </div>
      {total === 0 ? (
        <p style={S.empty}>No active services.</p>
      ) : (
        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          {/* Donut SVG */}
          <div style={{ flexShrink: 0 }}>
            <svg width="148" height="148" viewBox="0 0 148 148"
              style={{ display: 'block', animation: 'donut-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
              {/* Background track */}
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
              <g transform={`rotate(-90 ${cx} ${cy})`}>
                {segments.map((seg, i) => (
                  <circle key={i} cx={cx} cy={cy} r={r}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={sw}
                    strokeDasharray={`${seg.dashLen} ${circumference}`}
                    strokeDashoffset={-seg.offset}
                    strokeLinecap="butt"
                  />
                ))}
              </g>
              {/* Center label */}
              <text x={cx} y={cy - 7} textAnchor="middle" fontSize="20" fontWeight="800" fill="#0f172a">{total}</text>
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8.5" fill="#94a3b8" letterSpacing="0.05em">SERVICES</text>
            </svg>
          </div>

          {/* Legend */}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1, minWidth: 0 }}>
            {items.map(d => {
              const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
              return (
                <li key={d.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: d.value === 0 ? 0.3 : 1 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.73rem', color: '#475569', flex: 1, minWidth: 0, lineHeight: 1.3 }}>{d.label}</span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1e293b' }}>{d.value}</span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8', width: '2.5rem', textAlign: 'right' }}>{pct}%</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Queue Card ────────────────────────────────────────────────────────────────

function QueueCard({ queue }: { queue: DashboardStats['queue'] }) {
  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <span style={S.cardTitle}>
          Assignment Queue
          <span style={S.countBadge}>{queue.openCount}</span>
        </span>
        <Link to="/admin/queue" style={S.viewAll}>View all</Link>
      </div>
      {queue.topItems.length === 0 ? (
        <p style={S.empty}>No open items.</p>
      ) : (
        <ul style={S.list}>
          {queue.topItems.map((item: any) => {
            const prio = priorityLabel(item.priority ?? 0);
            return (
              <li key={item.id} style={S.listRow}>
                <div style={S.listMain}>
                  <span style={S.listTitle}>{item.service_name ?? '—'}</span>
                  <span style={S.listSub}>{item.client_name ?? '—'}</span>
                </div>
                <span style={{ ...S.chip, background: `${prio.color}18`, color: prio.color }}>{prio.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── New Inquiries Card ────────────────────────────────────────────────────────

function NewInquiriesCard({ inquiries }: { inquiries: Inquiry[] }) {
  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <span style={S.cardTitle}>New Inquiries</span>
        <Link to="/admin/inquiries" style={S.viewAll}>View all</Link>
      </div>
      {inquiries.length === 0 ? (
        <p style={S.empty}>No pending inquiries.</p>
      ) : (
        <ul style={S.list}>
          {inquiries.map(inq => (
            <li key={inq.id} style={S.listRow}>
              <div style={S.listMain}>
                <span style={S.listTitle}>{inq.name}</span>
                <span style={S.listSub}>{inq.service_needed}</span>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                  {formatDate(inq.created_at)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>
                  {inq.phone}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Texpert Workload ──────────────────────────────────────────────────────────

function WorkloadSection({ workload }: { workload: any[] }) {
  if (workload.length === 0) return null;
  return (
    <div>
      <h3 style={S.sectionTitle}>Texpert Workload</h3>
      <div style={S.workloadGrid}>
        {workload.map((tx: any) => {
          const pct  = Math.min((tx.active_count / 10) * 100, 100);
          const name = `${tx.first_name ?? ''} ${tx.last_name ?? ''}`.trim() || 'Unknown';
          return (
            <Link key={tx.id} to={`/admin/users/taxpert/${tx.id}`} style={{ textDecoration: 'none' }}>
              <div style={S.workloadCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.3rem' }}>{name}</div>
                    <span style={{ ...S.roleBadge, background: roleBadgeColor(tx.role) }}>{tx.role.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{tx.active_count}</span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>active</span>
                  </div>
                </div>
                <div style={{ height: 5, background: '#f1f5f9', borderRadius: 10, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 10, transition: 'width 0.4s ease',
                    width: `${pct}%`,
                    background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981',
                  }} />
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: -4 }}>{tx.active_count} / 10 target</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  page:       { padding: '2rem 2.5rem', maxWidth: 1280, margin: '0 auto', fontFamily: "'Inter','system-ui',sans-serif", color: '#0f172a' },
  greetRow:   { marginBottom: '2rem' },
  greeting:   { fontSize: '1.5rem', fontWeight: 700, margin: 0, color: '#0f172a' },
  greetSub:   { fontSize: '0.875rem', color: '#64748b', margin: '0.25rem 0 0' },

  twoColA:    { display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' },
  twoColB:    { display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '1.5rem', marginBottom: '1.5rem' },

  card:       { background: '#fff', borderRadius: 10, padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)' },
  cardHead:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' },
  cardTitle:  { fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem' },
  countBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#475569', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, padding: '0.1rem 0.5rem' },
  viewAll:    { fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none', fontWeight: 500 },

  list:       { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column' },
  listRow:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '1px solid #f1f5f9' },
  listMain:   { display: 'flex', flexDirection: 'column', gap: '0.15rem', minWidth: 0, marginRight: '0.75rem' },
  listTitle:  { fontSize: '0.825rem', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  listSub:    { fontSize: '0.72rem', color: '#94a3b8' },
  chip:       { display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.02em', flexShrink: 0 },
  empty:      { fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1.5rem 0', margin: 0 },

  sectionTitle:  { fontSize: '0.875rem', fontWeight: 700, color: '#1e293b', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em' },
  workloadGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' },
  workloadCard:  { background: '#fff', borderRadius: 10, padding: '1.1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '0.75rem', cursor: 'pointer', transition: 'box-shadow 0.15s' },
  roleBadge:     { display: 'inline-block', color: '#fff', borderRadius: 4, fontSize: '0.62rem', fontWeight: 700, padding: '0.15rem 0.45rem', letterSpacing: '0.05em' },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => (await apiClient.get('/admin/dashboard-stats')).data,
    enabled: isAdmin,
    staleTime: 60_000,
  });

  if (!authLoading && !isAdmin) return <Navigate to="/dashboard" replace />;

  const today = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  const firstName = profile?.first_name ?? 'Admin';

  return (
    <>
      <style>{`
        @keyframes shimmer   { 0%,100% { background-position: 200% 0 } 50% { background-position: -200% 0 } }
        @keyframes donut-in  { from { opacity:0; transform:scale(0.82) } to { opacity:1; transform:scale(1) } }
        @keyframes fade-dot  { from { opacity:0; transform:scale(0) } to { opacity:1; transform:scale(1) } }
        .workload-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.10) !important; }
      `}</style>

      <div style={S.page}>

        {/* Greeting */}
        <div style={S.greetRow}>
          <h1 style={S.greeting}>{greeting()}, {firstName}</h1>
          <p style={S.greetSub}>{today}</p>
        </div>

        {/* Revenue chart + Queue — 60/40 */}
        <div style={S.twoColA}>
          {isLoading ? (
            <>
              <div style={S.card}><Sk h="11rem" r={8} /></div>
              <div style={S.card}><Sk h="11rem" r={8} /></div>
            </>
          ) : data ? (
            <>
              <RevenueChart data={data.revenueByMonth} />
              <QueueCard queue={data.queue} />
            </>
          ) : null}
        </div>

        {/* Service breakdown donut + Recent Payments — 40/60 */}
        <div style={S.twoColB}>
          {isLoading ? (
            <>
              <div style={S.card}><Sk h="11rem" r={8} /></div>
              <div style={S.card}><Sk h="11rem" r={8} /></div>
            </>
          ) : data ? (
            <>
              <ServiceBreakdown pipeline={data.pipeline} />
              <NewInquiriesCard inquiries={data.recentInquiries} />
            </>
          ) : null}
        </div>

        {/* Texpert Workload */}
        {isLoading ? (
          <div>
            <Sk w="20%" h="0.75rem" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '1rem', marginTop: '0.75rem' }}>
              {[0,1,2,3].map(i => <Sk key={i} h="7rem" r={10} />)}
            </div>
          </div>
        ) : data ? (
          <WorkloadSection workload={data.texpertWorkload} />
        ) : null}

      </div>
    </>
  );
}
