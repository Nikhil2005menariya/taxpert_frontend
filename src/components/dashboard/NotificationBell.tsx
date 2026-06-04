import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const TYPE_ICON: Record<string, string> = {
  status_changed:    '🔄',
  document_status:   '📄',
  document_approved: '✅',
  document_rejected: '❌',
  document_reupload: '🔁',
  document_added:    '📎',
  payment:           '💳',
  payment_failed:    '⚠️',
  service_hold:      '⏸',
  pinned_message:    '📌',
  service_queued:    '📥',
  texpert_assigned:  '👤',
  default:           '🔔',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  // Unread count — polled so the red dot stays current
  const { data: countData } = useQuery({
    queryKey: ['notif-unread'],
    queryFn: async () => (await apiClient.get('/notifications/unread-count')).data as { count: number },
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const unread = countData?.count ?? 0;

  // Full list — only fetched while the dropdown is open
  const { data: listData, isLoading } = useQuery({
    queryKey: ['notif-list'],
    queryFn: async () => (await apiClient.get('/notifications?limit=20')).data.data as Notification[],
    enabled: open,
  });
  const items = listData ?? [];

  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-unread'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
    },
  });
  const markAll = useMutation({
    mutationFn: () => apiClient.patch('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-unread'] });
      qc.invalidateQueries({ queryKey: ['notif-list'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleClick(n: Notification) {
    if (!n.is_read) markRead.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  return (
    <div className="nbell" ref={ref}>
      <button
        className="nbell-trigger"
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" /><path d="M10 21a2 2 0 0 0 4 0" />
        </svg>
        {unread > 0 && <span className="nbell-dot" />}
      </button>

      {open && (
        <div className="nbell-panel">
          <div className="nbell-head">
            <span className="nbell-title">Notifications</span>
            {unread > 0 && (
              <button className="nbell-markall" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
                Mark all read
              </button>
            )}
          </div>

          <div className="nbell-list">
            {isLoading ? (
              <div className="nbell-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="nbell-empty">
                <div style={{ fontSize: '1.6rem', marginBottom: 6 }}>🔔</div>
                You're all caught up.
              </div>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  className={`nbell-item${n.is_read ? '' : ' nbell-item--unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="nbell-ico">{TYPE_ICON[n.type] ?? TYPE_ICON.default}</span>
                  <span className="nbell-body">
                    <span className="nbell-item-title">{n.title}</span>
                    {n.body && <span className="nbell-item-sub">{n.body}</span>}
                    <span className="nbell-time">{fmtRelative(n.created_at)}</span>
                  </span>
                  {!n.is_read && <span className="nbell-unread-dot" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .nbell { position: relative; }
        .nbell-trigger {
          position: relative; display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9px; border: 1px solid #e2e8f0;
          background: #fff; color: #475569; cursor: pointer; transition: background .12s, color .12s;
        }
        .nbell-trigger:hover { background: #f8fafc; color: #0f172a; }
        .nbell-dot {
          position: absolute; top: 6px; right: 7px; width: 8px; height: 8px;
          background: #ef4444; border-radius: 50%; border: 2px solid #fff;
        }
        .nbell-panel {
          position: absolute; top: calc(100% + 8px); right: 0; width: 340px; max-width: 90vw;
          background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
          box-shadow: 0 12px 32px rgba(15,23,42,0.16); z-index: 100; overflow: hidden;
        }
        .nbell-head {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.7rem 0.9rem; border-bottom: 1px solid #f1f5f9;
        }
        .nbell-title { font-size: 0.85rem; font-weight: 700; color: #0f172a; }
        .nbell-markall { background: none; border: none; color: #2563eb; font-size: 0.72rem; font-weight: 600; cursor: pointer; }
        .nbell-markall:hover { text-decoration: underline; }
        .nbell-list { max-height: 380px; overflow-y: auto; }
        .nbell-empty { text-align: center; padding: 2rem 1rem; color: #94a3b8; font-size: 0.82rem; }
        .nbell-item {
          display: flex; gap: 0.6rem; width: 100%; text-align: left; align-items: flex-start;
          padding: 0.7rem 0.9rem; background: #fff; border: none; border-bottom: 1px solid #f5f7fa;
          cursor: pointer; transition: background .1s; position: relative;
        }
        .nbell-item:hover { background: #f8fbff; }
        .nbell-item--unread { background: #f5f9ff; }
        .nbell-ico { font-size: 1rem; flex-shrink: 0; line-height: 1.3; }
        .nbell-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .nbell-item-title { font-size: 0.8rem; font-weight: 600; color: #1e293b; }
        .nbell-item-sub { font-size: 0.74rem; color: #64748b; line-height: 1.35; }
        .nbell-time { font-size: 0.68rem; color: #94a3b8; margin-top: 1px; }
        .nbell-unread-dot { width: 7px; height: 7px; border-radius: 50%; background: #2563eb; flex-shrink: 0; margin-top: 4px; }
      `}</style>
    </div>
  );
}
