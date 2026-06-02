import { useState } from 'react';
import Loader from "../../components/ui/Loader";
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

const MAX_BODY = 2000;

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminNotifyPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const qc = useQueryClient();
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject]         = useState('');
  const [body, setBody]               = useState('');
  const [expanded, setExpanded]       = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data: users } = useQuery({
    queryKey: ['admin-notify-users'],
    queryFn: async () => (await apiClient.get('/admin/users')).data.data?.filter((u: any) => u.role !== 'super_admin') ?? [],
    enabled: isAdmin,
  });

  const { data: history, isLoading: histLoading } = useQuery({
    queryKey: ['notify-history'],
    queryFn: async () => (await apiClient.get('/admin/notify/history')).data.data ?? [],
    enabled: isAdmin,
  });

  const send = useMutation({
    mutationFn: () => apiClient.post('/admin/notify', { recipientId, subject, body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notify-history'] });
      setRecipientId(''); setSubject(''); setBody('');
    },
  });

  if (authLoading) return <div className="page-loader"><Loader /></div>;
  if (!isAdmin)    return <Navigate to="/dashboard" replace />;

  const canSend = recipientId && subject.trim() && body.trim() && !send.isPending;
  const selected = (users ?? []).find((u: any) => u.id === recipientId);

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Send Notification</h1>
          <p className="db-page-sub">Send a manual email to any user. Delivered via Resend with retry.</p>
        </div>
      </div>

      {/* Compose card */}
      <div className="ntf-compose">
        <h3 className="asd-section-title">Compose Email</h3>

        {send.isSuccess && (
          <div className="db-alert-ok" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            Email queued for delivery to <strong>{selected?.email ?? 'recipient'}</strong>. It should arrive within a minute.
          </div>
        )}
        {send.isError && (
          <div className="db-alert-error" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>
            {(send.error as any)?.response?.data?.error ?? 'Failed to send notification.'}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Recipient</label>
          <select className="form-input" value={recipientId} onChange={e => setRecipientId(e.target.value)}>
            <option value="">— Select a user —</option>
            {(users ?? []).map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} · {u.email} · {u.role}
              </option>
            ))}
          </select>
          {selected && (
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-400)', marginTop: 4 }}>
              Sending to: <strong style={{ color: 'var(--ink-700)' }}>{selected.email}</strong>
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Subject</label>
          <input
            className="form-input"
            placeholder="e.g. Action required: please upload your documents"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label className="form-label" style={{ margin: 0 }}>Message</label>
            <span style={{ fontSize: '0.72rem', color: body.length > MAX_BODY * 0.9 ? 'var(--danger)' : 'var(--ink-400)' }}>
              {body.length} / {MAX_BODY}
            </span>
          </div>
          <textarea
            className="form-input"
            rows={7}
            maxLength={MAX_BODY}
            placeholder="Write your message here. It will be wrapped in a branded TheTaxpert email template."
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          <p style={{ fontSize: '0.72rem', color: 'var(--ink-400)', marginTop: 4 }}>
            Plain text only. Will be wrapped in the branded TheTaxpert email layout automatically.
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            disabled={!canSend}
            onClick={() => send.mutate()}
          >
            {send.isPending ? 'Queuing…' : 'Send Email'}
          </button>
        </div>
      </div>

      {/* History */}
      <div>
        <h3 className="asd-section-title" style={{ marginBottom: '0.75rem' }}>
          Sent History
          {(history ?? []).length > 0 && (
            <span style={{ fontWeight: 400, color: 'var(--ink-400)', marginLeft: 8, fontSize: '0.8rem' }}>
              {(history ?? []).length} notifications
            </span>
          )}
        </h3>

        {histLoading ? (
          <div className="page-loader" style={{ height: 80 }}><Loader /></div>
        ) : (history ?? []).length === 0 ? (
          <div className="db-empty-card">
            <p className="db-empty-title">No notifications sent yet</p>
            <p className="db-empty-desc">Emails you send will appear here with their full content.</p>
          </div>
        ) : (
          <div className="ntf-history-list">
            {(history ?? []).map((n: any) => (
              <div key={n.id} className="ntf-history-row">
                <div className="ntf-history-top" onClick={() => setExpanded(v => v === n.id ? null : n.id)}>
                  <div className="ntf-history-left">
                    <div className="ntf-history-subject">{n.subject}</div>
                    <div className="ntf-history-meta">
                      <span>To: <strong>{n.recipient_name}</strong> · {n.recipient_email}</span>
                      <span className="ntf-history-sep">·</span>
                      <span>By {n.sent_by}</span>
                      <span className="ntf-history-sep">·</span>
                      <span>{fmtDateTime(n.created_at)}</span>
                    </div>
                  </div>
                  <div className="ntf-expand-icon" style={{ transform: expanded === n.id ? 'rotate(180deg)' : 'none' }}>
                    ▾
                  </div>
                </div>
                {expanded === n.id && (
                  <div className="ntf-history-body">
                    {n.body || <em style={{ color: 'var(--ink-400)' }}>No body recorded</em>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
