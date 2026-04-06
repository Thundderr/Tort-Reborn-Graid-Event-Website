"use client";

import { useState, useEffect, useCallback } from 'react';
import { useExecSession } from '@/hooks/useExecSession';
import { ANALYTICS_DISCORD_ID } from '@/lib/analytics-auth';
import { useRouter } from 'next/navigation';

type Tab = 'deleted' | 'audit';

const TABLES = [
  'snipe_logs', 'blacklist', 'kick_list', 'tracker_tickets',
  'dashboard_events', 'dashboard_notes', 'build_definitions',
  'graid_events', 'agenda_bau_topics', 'agenda_requested_topics',
  'promotion_queue', 'promo_suggestions',
];

interface DeletedItem {
  [key: string]: any;
}

interface AuditEntry {
  id: number;
  log_type: string;
  actor_name: string;
  actor_id: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  http_method: string | null;
  old_values: any;
  ip_address: string | null;
  created_at: string;
}

export default function AdminPage() {
  const { user, loading: sessionLoading } = useExecSession();
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('deleted');

  // Deleted items state
  const [selectedTable, setSelectedTable] = useState(TABLES[0]);
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [deletedPage, setDeletedPage] = useState(1);
  const [deletedLoading, setDeletedLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  // Audit log state
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditLogType, setAuditLogType] = useState('');
  const [auditActorId, setAuditActorId] = useState('');
  const [expandedAudit, setExpandedAudit] = useState<number | null>(null);

  // Redirect non-Thundderr users
  useEffect(() => {
    if (!sessionLoading && user && user.discord_id !== ANALYTICS_DISCORD_ID) {
      router.push('/exec');
    }
  }, [sessionLoading, user, router]);

  const fetchDeleted = useCallback(async () => {
    setDeletedLoading(true);
    try {
      const res = await fetch(`/api/exec/admin/deleted?table=${selectedTable}&page=${deletedPage}&perPage=25`);
      if (res.ok) {
        const data = await res.json();
        setDeletedItems(data.items || []);
        setDeletedTotal(data.total || 0);
      }
    } catch {}
    setDeletedLoading(false);
  }, [selectedTable, deletedPage]);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ page: String(auditPage), perPage: '50' });
      if (auditLogType) params.set('logType', auditLogType);
      if (auditActorId) params.set('actorId', auditActorId);
      const res = await fetch(`/api/exec/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setAuditEntries(data.entries || []);
        setAuditTotal(data.total || 0);
      }
    } catch {}
    setAuditLoading(false);
  }, [auditPage, auditLogType, auditActorId]);

  useEffect(() => {
    if (user?.discord_id === ANALYTICS_DISCORD_ID && tab === 'deleted') fetchDeleted();
  }, [user, tab, fetchDeleted]);

  useEffect(() => {
    if (user?.discord_id === ANALYTICS_DISCORD_ID && tab === 'audit') fetchAudit();
  }, [user, tab, fetchAudit]);

  const handleRestore = async (table: string, id: string) => {
    if (!confirm(`Restore this ${table} record?`)) return;
    setRestoring(id);
    try {
      const res = await fetch('/api/exec/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table, id }),
      });
      if (res.ok) {
        fetchDeleted();
      } else {
        const data = await res.json();
        alert(data.error || 'Restore failed');
      }
    } catch {
      alert('Restore failed');
    }
    setRestoring(null);
  };

  if (sessionLoading || !user || user.discord_id !== ANALYTICS_DISCORD_ID) {
    return null;
  }

  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-card)',
    borderRadius: '0.75rem',
    padding: '1.5rem',
  };

  const tabStyle = (t: Tab): React.CSSProperties => ({
    padding: '0.5rem 1.25rem',
    background: tab === t ? 'var(--color-ocean-400)' : 'transparent',
    color: tab === t ? '#fff' : 'var(--text-secondary)',
    border: tab === t ? 'none' : '1px solid var(--border-card)',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 500,
  });

  const btnStyle: React.CSSProperties = {
    padding: '0.375rem 0.75rem',
    background: 'var(--color-ocean-400)',
    color: '#fff',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.75rem',
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.375rem 0.75rem',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-card)',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
  };

  const thStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    borderBottom: '1px solid var(--border-card)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.5rem 0.75rem',
    fontSize: '0.8125rem',
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-card)',
    maxWidth: '300px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const totalDeletedPages = Math.ceil(deletedTotal / 25);
  const totalAuditPages = Math.ceil(auditTotal / 50);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Admin</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Restore deleted items and browse the audit log
        </p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button style={tabStyle('deleted')} onClick={() => setTab('deleted')}>Deleted Items</button>
        <button style={tabStyle('audit')} onClick={() => setTab('audit')}>Audit Log</button>
      </div>

      {tab === 'deleted' && (
        <div style={card}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select
              value={selectedTable}
              onChange={(e) => { setSelectedTable(e.target.value); setDeletedPage(1); }}
              style={inputStyle}
            >
              {TABLES.map(t => (
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {deletedTotal} deleted record{deletedTotal !== 1 ? 's' : ''}
            </span>
          </div>

          {deletedLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>
          ) : deletedItems.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No deleted records in this table.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {Object.keys(deletedItems[0]).map(key => (
                        <th key={key} style={thStyle}>{key}</th>
                      ))}
                      <th style={thStyle}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deletedItems.map((item, i) => {
                      const cols = Object.keys(item);
                      const idCol = cols[0];
                      const idVal = String(item[idCol]);
                      return (
                        <tr key={i}>
                          {cols.map(key => (
                            <td key={key} style={tdStyle} title={String(item[key] ?? '')}>
                              {item[key] instanceof Date
                                ? new Date(item[key]).toLocaleString()
                                : item[key] != null ? String(item[key]) : '—'}
                            </td>
                          ))}
                          <td style={tdStyle}>
                            <button
                              style={{ ...btnStyle, opacity: restoring === idVal ? 0.5 : 1 }}
                              disabled={restoring === idVal}
                              onClick={() => handleRestore(selectedTable, idVal)}
                            >
                              {restoring === idVal ? '...' : 'Restore'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalDeletedPages > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                  <button style={btnStyle} disabled={deletedPage <= 1} onClick={() => setDeletedPage(p => p - 1)}>Prev</button>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{deletedPage} / {totalDeletedPages}</span>
                  <button style={btnStyle} disabled={deletedPage >= totalDeletedPages} onClick={() => setDeletedPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'audit' && (
        <div style={card}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input
              style={inputStyle}
              placeholder="Filter by log type..."
              value={auditLogType}
              onChange={(e) => { setAuditLogType(e.target.value); setAuditPage(1); }}
            />
            <input
              style={inputStyle}
              placeholder="Filter by actor ID..."
              value={auditActorId}
              onChange={(e) => { setAuditActorId(e.target.value); setAuditPage(1); }}
            />
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
              {auditTotal} entr{auditTotal !== 1 ? 'ies' : 'y'}
            </span>
          </div>

          {auditLoading ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading...</p>
          ) : auditEntries.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No audit entries found.</p>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Time</th>
                      <th style={thStyle}>Actor</th>
                      <th style={thStyle}>Type</th>
                      <th style={thStyle}>Method</th>
                      <th style={thStyle}>Action</th>
                      <th style={thStyle}>Target</th>
                      <th style={thStyle}>IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditEntries.map(entry => (
                      <>
                        <tr
                          key={entry.id}
                          style={{ cursor: entry.old_values ? 'pointer' : 'default' }}
                          onClick={() => entry.old_values && setExpandedAudit(expandedAudit === entry.id ? null : entry.id)}
                        >
                          <td style={tdStyle}>{new Date(entry.created_at).toLocaleString()}</td>
                          <td style={tdStyle}>{entry.actor_name}</td>
                          <td style={tdStyle}>{entry.log_type}</td>
                          <td style={{ ...tdStyle, color: entry.http_method === 'DELETE' ? '#ef4444' : entry.http_method === 'POST' ? '#22c55e' : 'var(--text-primary)' }}>
                            {entry.http_method || '—'}
                          </td>
                          <td style={{ ...tdStyle, maxWidth: '400px' }} title={entry.action}>{entry.action}</td>
                          <td style={tdStyle}>{entry.target_table ? `${entry.target_table}${entry.target_id ? `:${entry.target_id}` : ''}` : '—'}</td>
                          <td style={tdStyle}>{entry.ip_address || '—'}</td>
                        </tr>
                        {expandedAudit === entry.id && entry.old_values && (
                          <tr key={`${entry.id}-details`}>
                            <td colSpan={7} style={{ padding: '0.75rem', background: 'var(--bg-primary)', fontSize: '0.75rem' }}>
                              <strong style={{ color: 'var(--text-secondary)' }}>Old values:</strong>
                              <pre style={{ margin: '0.5rem 0 0', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                {JSON.stringify(entry.old_values, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalAuditPages > 1 && (
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                  <button style={btnStyle} disabled={auditPage <= 1} onClick={() => setAuditPage(p => p - 1)}>Prev</button>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{auditPage} / {totalAuditPages}</span>
                  <button style={btnStyle} disabled={auditPage >= totalAuditPages} onClick={() => setAuditPage(p => p + 1)}>Next</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
