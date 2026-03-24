import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, RefreshCw, Copy, CheckCircle, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { getKey, syncKey, revealKey } from '../utils/api';
import { getProvider, formatCredits, formatNumber, timeAgo } from '../utils/providers';
import UsageMeter from '../components/UsageMeter';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import toast from 'react-hot-toast';

export default function KeyDetail({ id, navigate }) {
  const qc = useQueryClient();
  const [syncing, setSyncing] = useState(false);
  const [revealedKey, setRevealedKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['key', id],
    queryFn: () => getKey(id),
    enabled: !!id
  });

  const k = data?.data;
  const prov = k ? getProvider(k.provider) : null;
  const stats = k?.latest_stats;
  const history = k?.history || [];
  const logs = k?.logs || [];

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await syncKey(id);
      toast.success('Synced successfully!');
      qc.invalidateQueries(['key', id]);
      qc.invalidateQueries(['keys']);
      qc.invalidateQueries(['dashboard']);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleReveal = async () => {
    if (revealedKey) {
      setShowKey(s => !s);
      return;
    }
    try {
      const res = await revealKey(id);
      setRevealedKey(res.api_key);
      setShowKey(true);
    } catch {
      toast.error('Failed to reveal key');
    }
  };

  const handleCopy = async () => {
    const keyToUse = revealedKey || (await revealKey(id)).api_key;
    await navigator.clipboard.writeText(keyToUse);
    setCopied(true);
    toast.success('Copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('keys')} style={{ marginBottom: 24 }}>
          <ArrowLeft size={14} /> Back
        </button>
        <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
      </div>
    );
  }

  if (!k) return <div style={{ color: 'var(--text3)' }}>Key not found</div>;

  // Model breakdown for pie chart
  const modelData = stats?.model_breakdown
    ? Object.entries(typeof stats.model_breakdown === 'string' ? JSON.parse(stats.model_breakdown) : stats.model_breakdown)
        .filter(([, v]) => v.cost > 0 || v.input_tokens > 0)
        .map(([name, v]) => ({
          name: name.replace('claude-', '').replace('gpt-', ''),
          value: v.cost || (v.input_tokens + (v.output_tokens || 0)),
          tokens: (v.input_tokens || 0) + (v.output_tokens || 0),
          cost: v.cost || 0
        }))
    : [];

  const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6'];

  const historyChartData = history.map(h => ({
    date: h.recorded_date?.split('T')[0]?.slice(5) || h.recorded_date,
    tokens: h.tokens_used || 0,
    requests: h.requests_count || 0,
    cost: parseFloat(h.cost || 0)
  })).reverse();

  return (
    <div>
      {/* Back */}
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('keys')} style={{ marginBottom: 24 }}>
        <ArrowLeft size={14} /> Back to Keys
      </button>

      {/* Hero card */}
      <div className="card" style={{ marginBottom: 20, borderColor: `${prov.color}30` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16, background: prov.bg,
            border: `2px solid ${prov.color}40`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 28, flexShrink: 0
          }}>
            {prov.icon}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800 }}>{k.name}</h1>
              <span className="badge" style={{ background: prov.bg, color: prov.color, border: `1px solid ${prov.color}30` }}>
                {prov.name}
              </span>
              <span className={`badge ${k.is_active ? 'badge-active' : 'badge-inactive'}`}>
                {k.is_active ? '● Active' : '○ Inactive'}
              </span>
            </div>

            {/* API Key display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
              <code style={{
                fontFamily: 'var(--font-mono)', fontSize: 13, background: 'var(--surface2)',
                padding: '4px 10px', borderRadius: 6, color: 'var(--text2)',
                border: '1px solid var(--border)', letterSpacing: showKey ? 0 : '0.05em'
              }}>
                {showKey && revealedKey ? revealedKey : k.api_key_masked}
              </code>
              <button className="btn btn-ghost btn-sm" onClick={handleReveal}>
                {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                {showKey ? 'Hide' : 'Reveal'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleCopy}>
                {copied ? <CheckCircle size={12} color="#22c55e" /> : <Copy size={12} />}
              </button>
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <MetaItem label="Created" value={new Date(k.created_at).toLocaleDateString()} />
              <MetaItem label="Last Synced" value={timeAgo(stats?.fetched_at || k.last_synced)} />
              {k.notes && <MetaItem label="Notes" value={k.notes} />}
              {k.tags && <MetaItem label="Tags" value={k.tags} />}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button className="btn btn-primary" onClick={handleSync} disabled={syncing}>
              <RefreshCw size={14} className={syncing ? 'spin' : ''} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            {prov.docsUrl && (
              <a href={prov.docsUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
                <ExternalLink size={12} /> Dashboard
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Usage meters */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
            Current Usage & Limits
          </div>
          <UsageMeter stats={stats} />

          {/* Big numbers */}
          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
              <StatBox label="Tokens Used" value={formatNumber(stats.total_tokens_used)} color={prov.color} />
              <StatBox label="Credits Used" value={formatCredits(stats.credits_used)} color="#ec4899" />
              <StatBox label="Total Requests" value={formatNumber(stats.total_requests)} color="#f59e0b" />
              <StatBox
                label="Credits Left"
                value={stats.credits_remaining != null ? formatCredits(stats.credits_remaining) : '—'}
                color="#22c55e"
              />
            </div>
          )}
        </div>

        {/* Rate limits */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
            Rate Limits & Capacity
          </div>
          {stats ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <LimitRow
                label="Requests / min"
                used={stats.rate_limit_rpm != null ? stats.rate_limit_rpm - (stats.requests_remaining || 0) : null}
                total={stats.rate_limit_rpm}
                remaining={stats.requests_remaining}
                color="#6366f1"
              />
              <LimitRow
                label="Tokens / min"
                used={stats.rate_limit_tpm != null ? stats.rate_limit_tpm - (stats.tokens_remaining || 0) : null}
                total={stats.rate_limit_tpm}
                remaining={stats.tokens_remaining}
                color="#22c55e"
              />
              <LimitRow
                label="Credits Budget"
                used={stats.credits_used ? parseFloat(stats.credits_used) : null}
                total={stats.credits_total ? parseFloat(stats.credits_total) : null}
                remaining={stats.credits_remaining ? parseFloat(stats.credits_remaining) : null}
                color="#f59e0b"
                isCurrency
              />
            </div>
          ) : (
            <div style={{ color: 'var(--text3)', fontSize: 13, padding: '20px 0' }}>Sync to see rate limits</div>
          )}
        </div>
      </div>

      {/* Charts row */}
      {historyChartData.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
              Usage History (Tokens)
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={historyChartData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
                <XAxis dataKey="date" tick={{ fill: '#606080', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#606080', fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #2a2a45', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="tokens" fill={prov.color} radius={[3, 3, 0, 0]} name="Tokens" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {modelData.length > 0 && (
            <div className="card">
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
                Model Breakdown
              </div>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={modelData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={3}>
                    {modelData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#14141f', border: '1px solid #2a2a45', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                {modelData.slice(0, 3).map((m, i) => (
                  <div key={m.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span style={{ color: 'var(--text2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                    <span style={{ color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{formatNumber(m.tokens)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sync Logs */}
      <div className="card">
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
          Sync History
        </div>
        {!logs.length ? (
          <div style={{ color: 'var(--text3)', fontSize: 13 }}>No syncs yet</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {logs.map((log, i) => (
              <div key={log.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
                borderBottom: i < logs.length - 1 ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: log.status === 'success' ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 12, color: log.status === 'success' ? 'var(--text)' : 'var(--red)' }}>{log.message}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                  {log.response_time > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>{log.response_time}ms</span>
                  )}
                  <span style={{ fontSize: 11, color: 'var(--text3)' }}>{timeAgo(log.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 12, color: 'var(--text2)' }}>{value}</div>
    </div>
  );
}

function StatBox({ label, value, color }) {
  return (
    <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function LimitRow({ label, used, total, remaining, color, isCurrency }) {
  const pct = total && used != null ? Math.min(100, Math.round((used / total) * 100)) : null;
  const fmt = isCurrency ? (n) => (n != null ? `$${parseFloat(n).toFixed(4)}` : '—') : formatNumber;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{label}</span>
        <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {total != null ? (
            <>
              <span style={{ color: 'var(--text3)' }}>{fmt(used)} / {fmt(total)}</span>
              {remaining != null && (
                <span style={{ color, fontWeight: 700 }}>{fmt(remaining)} left</span>
              )}
            </>
          ) : (
            <span style={{ color: 'var(--text3)' }}>Not available</span>
          )}
        </div>
      </div>
      <div className="progress-bar">
        {pct !== null && (
          <div className="progress-fill" style={{
            width: `${Math.max(2, pct)}%`,
            background: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : color,
            boxShadow: `0 0 6px ${color}40`
          }} />
        )}
      </div>
    </div>
  );
}
