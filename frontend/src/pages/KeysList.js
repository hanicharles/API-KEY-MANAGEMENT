import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, RefreshCw, Search, Trash2, Eye, Edit2, Copy, CheckCircle, BarChart2 } from 'lucide-react';
import { getKeys, addKey, updateKey, deleteKey, syncKey, syncAll, revealKey } from '../utils/api';
import { getProvider, formatCredits, formatNumber, timeAgo } from '../utils/providers';
import UsageMeter from '../components/UsageMeter';
import AddKeyModal from '../components/AddKeyModal';
import toast from 'react-hot-toast';

export default function KeysList({ navigate }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editKey, setEditKey] = useState(null);
  const [search, setSearch] = useState('');
  const [filterProvider, setFilterProvider] = useState('all');
  const [syncingId, setSyncingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const { data, isLoading } = useQuery({ queryKey: ['keys'], queryFn: getKeys, refetchInterval: 120000 });

  const addMut = useMutation({
    mutationFn: addKey,
    onSuccess: (res) => {
      toast.success(res.fetchSuccess ? '✅ Key added & synced!' : `⚠️ Key added (sync error: ${res.fetchError})`);
      qc.invalidateQueries(['keys']);
      qc.invalidateQueries(['dashboard']);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed')
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => updateKey(id, data),
    onSuccess: () => { toast.success('Updated!'); qc.invalidateQueries(['keys']); },
    onError: () => toast.error('Update failed')
  });

  const deleteMut = useMutation({
    mutationFn: deleteKey,
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries(['keys']); qc.invalidateQueries(['dashboard']); },
    onError: () => toast.error('Delete failed')
  });

  const syncAllMut = useMutation({
    mutationFn: syncAll,
    onSuccess: (res) => {
      toast.success(`Synced ${res.results?.length || 0} keys`);
      qc.invalidateQueries(['keys']);
      qc.invalidateQueries(['dashboard']);
    }
  });

  const handleSync = async (id) => {
    setSyncingId(id);
    try {
      await syncKey(id);
      toast.success('Synced!');
      qc.invalidateQueries(['keys']);
      qc.invalidateQueries(['dashboard']);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleCopy = async (id) => {
    try {
      const res = await revealKey(id);
      await navigator.clipboard.writeText(res.api_key);
      setCopiedId(id);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleDelete = (key) => {
    if (window.confirm(`Delete "${key.name}"? This cannot be undone.`)) {
      deleteMut.mutate(key.id);
    }
  };

  const handleToggle = (key) => {
    updateMut.mutate({ id: key.id, data: { is_active: key.is_active ? 0 : 1 } });
  };

  const keys = data?.data || [];
  const providers = [...new Set(keys.map(k => k.provider))];

  const filtered = keys.filter(k => {
    const q = search.toLowerCase();
    const matchSearch = !q || k.name.toLowerCase().includes(q) || k.provider.includes(q) || (k.tags || '').includes(q);
    const matchProvider = filterProvider === 'all' || k.provider === filterProvider;
    return matchSearch && matchProvider;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>API Keys</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>{keys.length} key{keys.length !== 1 ? 's' : ''} · Real-time usage data</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => syncAllMut.mutate()} disabled={syncAllMut.isPending}>
            <RefreshCw size={13} className={syncAllMut.isPending ? 'spin' : ''} />
            Sync All
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
            <Plus size={14} /> Add Key
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text3)' }} />
          <input
            className="form-input"
            style={{ paddingLeft: 36 }}
            placeholder="Search keys..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-input" style={{ width: 160 }} value={filterProvider} onChange={e => setFilterProvider(e.target.value)}>
          <option value="all">All Providers</option>
          {providers.map(p => <option key={p} value={p}>{getProvider(p).name}</option>)}
        </select>
      </div>

      {/* Keys grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gap: 16 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="card skeleton" style={{ height: 180 }} />
          ))}
        </div>
      ) : !filtered.length ? (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No API keys yet</div>
          <div style={{ color: 'var(--text3)', marginBottom: 24, fontSize: 14 }}>Add your first API key to start tracking usage</div>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Your First Key
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map(key => (
            <KeyCard
              key={key.id}
              apiKey={key}
              onSync={() => handleSync(key.id)}
              onCopy={() => handleCopy(key.id)}
              onDelete={() => handleDelete(key)}
              onEdit={() => setEditKey(key)}
              onToggle={() => handleToggle(key)}
              onView={() => navigate('detail', key.id)}
              syncing={syncingId === key.id}
              copied={copiedId === key.id}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddKeyModal
          onClose={() => setShowAdd(false)}
          onSubmit={(form) => addMut.mutateAsync(form)}
        />
      )}
      {editKey && (
        <AddKeyModal
          editKey={editKey}
          onClose={() => setEditKey(null)}
          onSubmit={(form) => updateMut.mutateAsync({ id: editKey.id, data: form })}
        />
      )}
    </div>
  );
}

function KeyCard({ apiKey, onSync, onCopy, onDelete, onEdit, onToggle, onView, syncing, copied }) {
  const prov = getProvider(apiKey.provider);
  const stats = {
    total_tokens_used: apiKey.total_tokens_used,
    tokens_remaining: apiKey.tokens_remaining,
    total_requests: apiKey.total_requests,
    requests_remaining: apiKey.requests_remaining,
    credits_used: apiKey.credits_used,
    credits_remaining: apiKey.credits_remaining,
    credits_total: apiKey.credits_total,
    rate_limit_rpm: apiKey.rate_limit_rpm,
    rate_limit_tpm: apiKey.rate_limit_tpm,
    model_breakdown: apiKey.model_breakdown,
    raw_response: apiKey.raw_response,
    provider: apiKey.provider
  };

  const hasStats = apiKey.stats_fetched_at;

  return (
    <div className="card" style={{ transition: 'border-color 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', gap: 16 }}>
        {/* Provider icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12, background: prov.bg,
          border: `1px solid ${prov.color}30`, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, flexShrink: 0
        }}>
          {prov.icon}
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700 }}>{apiKey.name}</span>
            <span className="badge" style={{ background: prov.bg, color: prov.color, border: `1px solid ${prov.color}30`, fontSize: 10 }}>
              {prov.name}
            </span>
            <span className={`badge ${apiKey.is_active ? 'badge-active' : 'badge-inactive'}`}>
              {apiKey.is_active ? '● Active' : '○ Inactive'}
            </span>
            {apiKey.tags && apiKey.tags.split(',').map(t => (
              <span key={t} style={{ fontSize: 10, color: 'var(--text3)', background: 'var(--surface3)', padding: '2px 8px', borderRadius: 4 }}>
                {t.trim()}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text3)' }}>
              {apiKey.api_key_masked}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>
              Synced {timeAgo(apiKey.stats_fetched_at || apiKey.last_synced)}
            </span>
          </div>

          {/* Usage meters */}
          {hasStats ? (
            <UsageMeter stats={stats} />
          ) : (
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--text3)' }}>
              Click <strong>Sync</strong> to fetch real-time usage data
            </div>
          )}

          {/* Quick stats row */}
          {hasStats && (
            <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
              <QuickStat label="Tokens Used" value={formatNumber(apiKey.total_tokens_used)} color="var(--accent)" />
              <QuickStat label="Total Cost" value={formatCredits(apiKey.credits_used)} color="#ec4899" />
              <QuickStat label="Requests" value={formatNumber(apiKey.total_requests)} color="#f59e0b" />
              {apiKey.rate_limit_rpm && <QuickStat label="Rate Limit" value={`${formatNumber(apiKey.rate_limit_rpm)}/min`} color="var(--text3)" />}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-primary btn-sm" onClick={onSync} disabled={syncing} title="Sync usage">
            <RefreshCw size={12} className={syncing ? 'spin' : ''} />
            {syncing ? 'Syncing' : 'Sync'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onView}>
            <Eye size={12} /> Detail
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onView} title="View Graphs">
            <BarChart2 size={12} /> Graphs
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onCopy} title="Copy API key">
            {copied ? <CheckCircle size={12} color="#22c55e" /> : <Copy size={12} />}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onEdit}>
            <Edit2 size={12} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onToggle} title={apiKey.is_active ? 'Disable' : 'Enable'}>
            {apiKey.is_active ? '⏸' : '▶'}
          </button>
          <button className="btn btn-danger btn-sm" onClick={onDelete}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

function QuickStat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
