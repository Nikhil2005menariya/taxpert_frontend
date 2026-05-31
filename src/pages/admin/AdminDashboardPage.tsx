import { useQuery } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';
import { formatRupees } from '../../shared/finance-utils';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DashboardStats {
  revenue: { total: number; thisMonth: number; gst: number; failedCount: number };
  pipeline: Record<string, number>;
  queue: { openCount: number; topItems: any[] };
  overdueInvoices: number;
  recentPayments: any[];
  texpertWorkload: any[];
  clients: { total: number; newThisMonth: number };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso));
}

function monthName(): string {
  return new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date());
}

function currentYear(): number {
  return new Date().getFullYear();
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function priorityLabel(p: number): { label: string; color: string } {
  if (p >= 8) return { label: 'High', color: '#dc2626' };
  if (p >= 5) return { label: 'Medium', color: '#d97706' };
  return { label: 'Low', color: '#6b7280' };
}

function roleBadgeColor(role: string): string {
  if (role === 'ca') return '#7c3aed';
  return '#1d4ed8';
}

// ── Skeleton blocks ───────────────────────────────────────────────────────────

function Skeleton({ w, h, radius = 6 }: { w?: string; h?: string; radius?: number }) {
  return (
    <div
      style={{
        width: w ?? '100%',
        height: h ?? '1rem',
        borderRadius: radius,
        background: 'linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s infinite',
        flexShrink: 0,
      }}
    />
  );
}

function KpiSkeleton() {
  return (
    <div style={styles.kpiCard}>
      <Skeleton w="40%" h="0.7rem" />
      <Skeleton w="60%" h="1.75rem" radius={4} />
      <Skeleton w="50%" h="0.7rem" />
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: string;
  sub: string;
  accent: string;
  href?: string;
  alert?: boolean;
}

function KpiCard({ label, value, sub, accent, href, alert }: KpiCardProps) {
  const content = (
    <div style={{ ...styles.kpiCard, borderTop: `3px solid ${accent}` }}>
      <span style={{ ...styles.kpiLabel, color: alert ? '#dc2626' : '#6b7280' }}>{label}</span>
      <span style={{ ...styles.kpiValue, color: alert ? '#dc2626' : '#0f172a' }}>{value}</span>
      <span style={styles.kpiSub}>{sub}</span>
    </div>
  );
  if (href) {
    return <Link to={href} style={{ textDecoration: 'none' }}>{content}</Link>;
  }
  return content;
}

interface PipelineStripProps {
  pipeline: Record<string, number>;
}

const PIPELINE_CONFIG: { key: string; label: string; color: string; href: string }[] = [
  { key: 'documents_required', label: 'Docs Required', color: '#94a3b8', href: '/admin/clients' },
  { key: 'documents_received', label: 'Docs Received', color: '#64748b', href: '/admin/clients' },
  { key: 'under_review',       label: 'Under Review',  color: '#3b82f6', href: '/admin/clients' },
  { key: 'in_progress',        label: 'In Progress',   color: '#0ea5e9', href: '/admin/queue'   },
  { key: 'invoice_pending',    label: 'Invoice Pending', color: '#f59e0b', href: '/admin/clients' },
  { key: 'completed',          label: 'Completed',     color: '#10b981', href: '/admin/clients' },
];

function PipelineStrip({ pipeline }: PipelineStripProps) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>Service Pipeline</span>
      </div>
      <div style={styles.pipelineRow}>
        {PIPELINE_CONFIG.map(({ key, label, color, href }) => (
          <Link key={key} to={href} style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}>
            <div style={{ ...styles.pipelineBadge, borderTop: `3px solid ${color}` }}>
              <span style={{ ...styles.pipelineCount, color }}>{pipeline[key] ?? 0}</span>
              <span style={styles.pipelineLabel}>{label}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function QueueCard({ queue }: { queue: DashboardStats['queue'] }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>
          Assignment Queue
          <span style={styles.countBadge}>{queue.openCount}</span>
        </span>
        <Link to="/admin/queue" style={styles.viewAllLink}>View all</Link>
      </div>
      {queue.topItems.length === 0 ? (
        <p style={styles.emptyState}>No open items in the queue.</p>
      ) : (
        <ul style={styles.listReset}>
          {queue.topItems.map((item: any) => {
            const prio = priorityLabel(item.priority ?? 0);
            return (
              <li key={item.id} style={styles.listRow}>
                <div style={styles.listRowMain}>
                  <span style={styles.listRowTitle}>{item.service_name ?? '—'}</span>
                  <span style={styles.listRowSub}>{item.client_name ?? '—'}</span>
                </div>
                <span style={{ ...styles.chip, background: `${prio.color}18`, color: prio.color }}>
                  {prio.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RecentPaymentsCard({ payments }: { payments: any[] }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <span style={styles.cardTitle}>Recent Payments</span>
        <Link to="/admin/payments" style={styles.viewAllLink}>View all</Link>
      </div>
      {payments.length === 0 ? (
        <p style={styles.emptyState}>No recent payments.</p>
      ) : (
        <ul style={styles.listReset}>
          {payments.map((p: any) => (
            <li key={p.id} style={styles.listRow}>
              <div style={styles.listRowMain}>
                <span style={styles.listRowTitle}>{p.client_name}</span>
                <span style={styles.listRowSub}>{p.service_name} · {formatDate(p.captured_at)}</span>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={styles.payAmount}>{formatRupees(p.amount)}</div>
                {p.payment_method && (
                  <span style={styles.methodChip}>{p.payment_method}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function WorkloadSection({ workload }: { workload: any[] }) {
  if (workload.length === 0) return null;
  return (
    <div>
      <h3 style={styles.sectionTitle}>Texpert Workload</h3>
      <div style={styles.workloadGrid}>
        {workload.map((tx: any) => {
          const pct = Math.min((tx.active_count / 10) * 100, 100);
          const name = `${tx.first_name ?? ''} ${tx.last_name ?? ''}`.trim() || 'Unknown';
          return (
            <Link key={tx.id} to={`/admin/taxperts/${tx.id}`} style={{ textDecoration: 'none' }}>
              <div style={styles.workloadCard}>
                <div style={styles.workloadTop}>
                  <div>
                    <div style={styles.workloadName}>{name}</div>
                    <span style={{ ...styles.roleBadge, background: roleBadgeColor(tx.role) }}>
                      {tx.role.toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.workloadCount}>
                    <span style={styles.workloadNum}>{tx.active_count}</span>
                    <span style={styles.workloadLabel}>active</span>
                  </div>
                </div>
                <div style={styles.progressTrack}>
                  <div
                    style={{
                      ...styles.progressFill,
                      width: `${pct}%`,
                      background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981',
                    }}
                  />
                </div>
                <div style={styles.progressMeta}>{tx.active_count} / 10 target</div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: '2rem 2.5rem',
    maxWidth: 1280,
    margin: '0 auto',
    fontFamily: "'Inter', 'system-ui', sans-serif",
    color: '#0f172a',
  },
  greetingRow: {
    marginBottom: '2rem',
  },
  greeting: {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
    color: '#0f172a',
  },
  greetingSub: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: '0.25rem 0 0',
  },
  kpiRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  kpiCard: {
    background: '#fff',
    borderRadius: 10,
    padding: '1.25rem 1.25rem 1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.35rem',
    transition: 'box-shadow 0.15s',
  },
  kpiLabel: {
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  kpiValue: {
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1.2,
  },
  kpiSub: {
    fontSize: '0.75rem',
    color: '#94a3b8',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  card: {
    background: '#fff',
    borderRadius: 10,
    padding: '1.25rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
  },
  cardTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  countBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f1f5f9',
    color: '#475569',
    borderRadius: 20,
    fontSize: '0.7rem',
    fontWeight: 700,
    padding: '0.1rem 0.5rem',
  },
  viewAllLink: {
    fontSize: '0.75rem',
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: 500,
  },
  listReset: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
  },
  listRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.65rem 0',
    borderBottom: '1px solid #f1f5f9',
  },
  listRowMain: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    minWidth: 0,
    marginRight: '0.75rem',
  },
  listRowTitle: {
    fontSize: '0.825rem',
    fontWeight: 600,
    color: '#1e293b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  listRowSub: {
    fontSize: '0.72rem',
    color: '#94a3b8',
  },
  chip: {
    display: 'inline-block',
    padding: '0.2rem 0.6rem',
    borderRadius: 20,
    fontSize: '0.7rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
    flexShrink: 0,
  },
  payAmount: {
    fontSize: '0.825rem',
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'right',
  },
  methodChip: {
    display: 'inline-block',
    background: '#f1f5f9',
    color: '#64748b',
    borderRadius: 4,
    fontSize: '0.65rem',
    fontWeight: 600,
    padding: '0.1rem 0.4rem',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  emptyState: {
    fontSize: '0.8rem',
    color: '#94a3b8',
    textAlign: 'center',
    padding: '1.5rem 0',
    margin: 0,
  },
  pipelineRow: {
    display: 'flex',
    gap: '0.5rem',
  },
  pipelineBadge: {
    background: '#f8fafc',
    borderRadius: 8,
    padding: '0.75rem 0.5rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.3rem',
    cursor: 'pointer',
    transition: 'background 0.12s',
  },
  pipelineCount: {
    fontSize: '1.4rem',
    fontWeight: 800,
    lineHeight: 1,
  },
  pipelineLabel: {
    fontSize: '0.65rem',
    fontWeight: 600,
    color: '#64748b',
    textAlign: 'center',
    letterSpacing: '0.03em',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 0.75rem',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  workloadGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '1rem',
  },
  workloadCard: {
    background: '#fff',
    borderRadius: 10,
    padding: '1.1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    cursor: 'pointer',
    transition: 'box-shadow 0.15s',
  },
  workloadTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  workloadName: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#1e293b',
    marginBottom: '0.3rem',
  },
  roleBadge: {
    display: 'inline-block',
    color: '#fff',
    borderRadius: 4,
    fontSize: '0.62rem',
    fontWeight: 700,
    padding: '0.15rem 0.45rem',
    letterSpacing: '0.05em',
  },
  workloadCount: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  workloadNum: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#0f172a',
    lineHeight: 1,
  },
  workloadLabel: {
    fontSize: '0.65rem',
    color: '#94a3b8',
    fontWeight: 500,
  },
  progressTrack: {
    height: 5,
    background: '#f1f5f9',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
    transition: 'width 0.4s ease',
  },
  progressMeta: {
    fontSize: '0.68rem',
    color: '#94a3b8',
    marginTop: -4,
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const { profile, isLoading: authLoading } = useAuth();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/dashboard-stats');
      return res.data;
    },
    enabled: isAdmin,
    staleTime: 60_000,
  });

  if (!authLoading && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const today = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());

  const firstName = profile?.first_name ?? 'Admin';

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .workload-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.10) !important; }
        .kpi-link-card:hover > div { box-shadow: 0 4px 12px rgba(0,0,0,0.10) !important; }
      `}</style>

      <div style={styles.page}>
        {/* Greeting */}
        <div style={styles.greetingRow}>
          <h1 style={styles.greeting}>{greeting()}, {firstName}</h1>
          <p style={styles.greetingSub}>{today} · {currentYear()} fiscal overview</p>
        </div>

        {/* KPI Row */}
        <div style={styles.kpiRow}>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)
          ) : (
            <>
              <KpiCard
                label="Total Revenue"
                value={data ? formatRupees(data.revenue.total) : '—'}
                sub={`${data?.clients.total ?? 0} clients`}
                accent="#f59e0b"
              />
              <KpiCard
                label={`${monthName()} Revenue`}
                value={data ? formatRupees(data.revenue.thisMonth) : '—'}
                sub={monthName()}
                accent="#3b82f6"
              />
              <KpiCard
                label="GST Collected"
                value={data ? formatRupees(data.revenue.gst) : '—'}
                sub="18% on captured"
                accent="#7c3aed"
              />
              <KpiCard
                label="Failed Payments"
                value={String(data?.revenue.failedCount ?? 0)}
                sub="Needs attention"
                accent={data && data.revenue.failedCount > 0 ? '#ef4444' : '#cbd5e1'}
                alert={data ? data.revenue.failedCount > 0 : false}
                href="/admin/payments?status=failed"
              />
              <KpiCard
                label="Overdue Invoices"
                value={String(data?.overdueInvoices ?? 0)}
                sub="Past due date"
                accent={data && data.overdueInvoices > 0 ? '#f97316' : '#cbd5e1'}
                alert={data ? data.overdueInvoices > 0 : false}
                href="/admin/payments"
              />
            </>
          )}
        </div>

        {/* Pipeline */}
        {isLoading ? (
          <div style={{ ...styles.card, marginBottom: '1.5rem' }}>
            <Skeleton w="30%" h="0.8rem" />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} h="4.5rem" radius={8} />
              ))}
            </div>
          </div>
        ) : data ? (
          <div style={{ marginBottom: '1.5rem' }}>
            <PipelineStrip pipeline={data.pipeline} />
          </div>
        ) : null}

        {/* Queue + Recent Payments */}
        <div style={styles.twoCol}>
          {isLoading ? (
            <>
              <div style={styles.card}>
                <Skeleton w="40%" h="0.8rem" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h="2.2rem" radius={6} />)}
                </div>
              </div>
              <div style={styles.card}>
                <Skeleton w="40%" h="0.8rem" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                  {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h="2.2rem" radius={6} />)}
                </div>
              </div>
            </>
          ) : data ? (
            <>
              <QueueCard queue={data.queue} />
              <RecentPaymentsCard payments={data.recentPayments} />
            </>
          ) : null}
        </div>

        {/* Texpert Workload */}
        {isLoading ? (
          <div>
            <Skeleton w="20%" h="0.75rem" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginTop: '0.75rem' }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} h="7rem" radius={10} />
              ))}
            </div>
          </div>
        ) : data ? (
          <WorkloadSection workload={data.texpertWorkload} />
        ) : null}
      </div>
    </>
  );
}
