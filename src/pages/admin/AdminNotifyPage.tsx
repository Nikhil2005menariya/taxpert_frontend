import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

export default function AdminNotifyPage() {
  const { profile, isLoading: authLoading } = useAuth();
  const [recipientId, setRecipientId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const { data: users } = useQuery({
    queryKey: ['admin-notify-users'],
    queryFn: async () => {
      const res = await apiClient.get('/admin/users');
      return (res.data.data ?? []).filter((u: any) => u.role !== 'super_admin');
    },
    enabled: isAdmin,
  });

  const send = useMutation({
    mutationFn: async () => apiClient.post('/admin/notify', { recipientId, subject, body }),
    onSuccess: () => {
      setSent(true);
      setRecipientId('');
      setSubject('');
      setBody('');
      setError('');
      setTimeout(() => setSent(false), 4000);
    },
    onError: (e: any) => setError(e.response?.data?.error ?? 'Failed to send notification'),
  });

  if (authLoading) return <div className="page-loader"><div className="page-loader-ring" /></div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const canSend = recipientId && subject.trim() && body.trim() && !send.isPending;

  return (
    <div className="db-page-new">
      <div className="db-page-header">
        <div>
          <h1 className="db-page-title">Send Notification</h1>
          <p className="db-page-sub">Send a manual email notification to any user.</p>
        </div>
      </div>

      <div className="aq-notify-card">
        {sent && (
          <div className="aq-notify-success">Notification sent successfully.</div>
        )}
        {error && <p className="aq-modal-error">{error}</p>}

        <div className="form-group">
          <label className="form-label">Recipient</label>
          <select className="form-input" value={recipientId} onChange={e => setRecipientId(e.target.value)}>
            <option value="">-- Select recipient --</option>
            {(users ?? []).map((u: any) => (
              <option key={u.id} value={u.id}>
                {u.first_name} {u.last_name} ({u.email}) — {u.role}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Subject</label>
          <input
            className="form-input"
            placeholder="Email subject"
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Message</label>
          <textarea
            className="form-input"
            rows={6}
            placeholder="Email body (plain text — will be wrapped in branded template)"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>

        <div className="aq-notify-footer">
          <button className="btn btn-primary" disabled={!canSend} onClick={() => send.mutate()}>
            {send.isPending ? 'Sending…' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}
