import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import Loader from '../ui/Loader';

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

/* ── Crisp SVG type icons (no emojis) ─────────────────────────── */
function TypeIcon({ type }: { type: string }) {
  let path: React.ReactNode = <><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" /><path d="M10 21a2 2 0 0 0 4 0" /></>;
  switch (type) {
    case 'status_changed':
      path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></>;
      break;
    case 'document_status':
    case 'document_added':
      path = <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></>;
      break;
    case 'document_approved':
      path = <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>;
      break;
    case 'document_rejected':
      path = <><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></>;
      break;
    case 'document_reupload':
      path = <><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M12 8v5l3 2" /></>;
      break;
    case 'payment':
      path = <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>;
      break;
    case 'payment_failed':
      path = <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><path d="M12 9v4M12 17h.01" /></>;
      break;
    case 'service_hold':
      path = <><circle cx="12" cy="12" r="10" /><path d="M10 9v6M14 9v6" /></>;
      break;
    case 'pinned_message':
      path = <><path d="M12 17v5" /><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" /></>;
      break;
    case 'service_queued':
      path = <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5M12 15V3" /></>;
      break;
    case 'texpert_assigned':
      path = <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>;
      break;
  }
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const ref = useRef<HTMLDivElement>(null);

  // Unread count — polled so the badge stays current
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
        className={`nbell-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="Notifications"
      >
        <svg className="nbell-glyph" viewBox="0 0 448 512" aria-hidden="true">
          <path d="M224 0c-17.7 0-32 14.3-32 32V49.9C119.5 61.4 64 124.2 64 200v33.4c0 45.4-15.5 89.5-43.8 124.9L5.3 377c-5.8 7.2-6.9 17.1-2.9 25.4S14.8 416 24 416H424c9.2 0 17.6-5.3 21.6-13.6s2.9-18.2-2.9-25.4l-14.9-18.6C399.5 322.9 384 278.8 384 233.4V200c0-75.8-55.5-138.6-128-150.1V32c0-17.7-14.3-32-32-32zm0 96h8c57.4 0 104 46.6 104 104v33.4c0 47.9 13.9 94.6 39.7 134.6H72.3C98.1 328 112 281.3 112 233.4V200c0-57.4 46.6-104 104-104h8zm64 352H224 160c0 17 6.7 33.3 18.7 45.3s28.3 18.7 45.3 18.7s33.3-6.7 45.3-18.7s18.7-28.3 18.7-45.3z" />
        </svg>
        {unread > 0 && <span className="nbell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="nbell-panel">
          <div className="nbell-head">
            <span className="nbell-title">
              Notifications
              {unread > 0 && <span className="nbell-title-count">{unread}</span>}
            </span>
            {unread > 0 && (
              <button className="nbell-markall" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                Mark all read
              </button>
            )}
          </div>

          <div className="nbell-list">
            {isLoading ? (
              <div className="nbell-loading"><Loader size={30} /></div>
            ) : items.length === 0 ? (
              <div className="nbell-empty">
                <span className="nbell-empty-ico">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9Z" /><path d="M10 21a2 2 0 0 0 4 0" /></svg>
                </span>
                <p className="nbell-empty-title">You're all caught up</p>
                <p className="nbell-empty-sub">New notifications will show up here.</p>
              </div>
            ) : (
              items.map(n => (
                <button
                  key={n.id}
                  className={`nbell-item${n.is_read ? '' : ' nbell-item--unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="nbell-ico"><TypeIcon type={n.type} /></span>
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
    </div>
  );
}
