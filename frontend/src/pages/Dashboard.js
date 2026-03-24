import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Key, Zap, TrendingUp, AlertCircle, Plus } from 'lucide-react';
import { getDashboard, syncAll, addKey, getKeys } from '../utils/api';
import { getProvider, formatCredits, formatNumber, timeAgo } from '../utils/providers';
import { LineChart, Line, Legend, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import AddKeyModal from '../components/AddKeyModal';

export default function Dashboard({ navigate }) {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 120000
  });

  const { data: keysRes } = useQuery({
    queryKey: ['keys'],
    queryFn: getKeys,
    refetchInterval: 120000
  });

  const syncMut = useMutation({
    mutationFn: syncAll,
    onSuccess: (res) => {
      toast.success(`Synced ${res.results?.length || 0} keys`);
      qc.invalidateQueries(['dashboard']);
      qc.invalidateQueries(['keys']);
    },
    onError: () => toast.error('Sync failed')
  });

  const addMut = useMutation({
    mutationFn: addKey,
    onSuccess: () => {
      toast.success('API key added!');
      qc.invalidateQueries(['dashboard']);
      qc.invalidateQueries(['keys']);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to add key')
  });

  const d = data?.data;

  const statCards = [
    { label: 'Total Keys', value: d?.totalKeys ?? '—', icon: Key, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { label: 'Active Keys', value: d?.activeKeys ?? '—', icon: Zap, color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    { label: 'Providers', value: d?.providerStats?.length ?? '—', icon: TrendingUp, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    {
      label: 'Total Spend',
      value: formatCredits(d?.providerStats?.reduce((s, p) => s + parseFloat(p.total_credits_used || 0), 0) || 0),
      icon: AlertCircle,
      color: '#ec4899',
      bg: 'rgba(236,72,153,0.1)'
    }
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>
            Dashboard
          </h1>
          <p style={{ color: 'var(--text3)', fontSize: 13 }}>
            Real-time API usage across all your providers
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => setShowAdd(true)}>
            <Plus size={15} /> Add Key
          </button>
          <button
            className="btn btn-primary"
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
          >
            <RefreshCw size={15} className={syncMut.isPending ? 'spin' : ''} />
            {syncMut.isPending ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                {isLoading ? <span className="skeleton" style={{ width: 50, height: 22, display: 'block' }} /> : value}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Provider breakdown */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
            Provider Breakdown
          </div>
          {!d?.providerStats?.length ? (
            <EmptyState text="No providers yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {d.providerStats.map(ps => {
                const prov = getProvider(ps.provider);
                return (
                  <div key={ps.provider} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: prov.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16, flexShrink: 0, border: `1px solid ${prov.color}30`
                    }}>
                      {prov.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{prov.name}</span>
                        <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: '#ec4899' }}>
                          {formatCredits(ps.total_credits_used)}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {ps.key_count} key{ps.key_count !== 1 ? 's' : ''} · {formatNumber(ps.total_tokens)} tokens · {formatNumber(ps.total_requests)} req
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 16, fontSize: 14 }}>
            Recent Syncs
          </div>
          {!d?.recentSyncs?.length ? (
            <EmptyState text="No syncs yet" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {d.recentSyncs.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.status === 'success' ? '#22c55e' : '#ef4444', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{s.key_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.message}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>{timeAgo(s.created_at)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Grid for Meters and Line Graph */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 450px) 1fr', gap: 24, alignItems: 'flex-start' }}>
        
        {/* Compact Usage Meters left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {keysRes?.data?.filter(k => k.is_active).map((key) => {
          const stats = {
            provider: key.provider,
            credits_used: key.credits_used, credits_total: key.credits_total,
            total_requests: key.total_requests, rate_limit_rpm: key.rate_limit_rpm,
            raw_response: key.raw_response || {}
          };

          const raw = typeof stats.raw_response === 'string' && stats.raw_response.startsWith('{') 
            ? JSON.parse(stats.raw_response) 
            : (stats.raw_response || {});

          const isTokenMeter = stats.provider === 'openai' || stats.provider === 'anthropic';
          let pct = 0; let usedStr = ''; let resetStr = '12h';

          const formatResetFn = (isoDate) => {
            if(!isoDate) return '12h';
            const minDiff = Math.max(0, Math.floor((new Date(isoDate) - new Date()) / 60000));
            const h = Math.floor(minDiff / 60);
            const m = minDiff % 60;
            if (h > 0 && m > 0) return `${h}h ${m}m`;
            if (h > 0) return `${h}h`;
            return `${m}m`;
          };

          if (isTokenMeter) {
            pct = stats.credits_total ? Math.round(((stats.credits_used || 0) / stats.credits_total) * 100) : 0;
            usedStr = `${Math.floor(stats.credits_used || 0)}/${Math.floor(stats.credits_total || 20)}`;
            resetStr = formatResetFn(raw.daily_reset_time);
          } else if (stats.provider === 'gemini') {
            pct = Math.round(((stats.total_requests || 0) / 1500) * 100);
            usedStr = `${stats.total_requests || 0}/1500`;
            resetStr = formatResetFn(raw.daily_reset_time);
          } else {
            pct = Math.round(((stats.total_requests || 0) / (stats.rate_limit_rpm || 500)) * 100);
            usedStr = `${stats.total_requests || 0}/${stats.rate_limit_rpm || 500}`;
            resetStr = '1m';
          }

          pct = Math.min(100, pct);
          const fillCol = pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#b6cce2';
          const prov = getProvider(key.provider);

          return (
            <div key={key.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Logo Box */}
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: prov.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, flexShrink: 0, border: `1px solid ${prov.color}30`
              }}>
                {prov.icon}
              </div>
              
              {/* Meter Flex Column */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* Thick Progress Pill */}
                <div style={{ width: '100%', height: 24, background: '#1c1c1e', borderRadius: 20, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${Math.max(5, pct)}%`, background: fillCol, borderRadius: 20 }} />
                  <span style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', fontSize: 13, fontWeight: 700, color: '#1a1a1a', zIndex: 2 }}>
                    {pct}%
                  </span>
                </div>
                
                {/* Text Layout */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#e0e0e0' }}>
                  <span>Used: {usedStr}</span>
                  {pct >= 100 ? (<span>Requests Left: 0</span>) : (<span>Reset: {resetStr}</span>)}
                </div>
              </div>
            </div>
          );
        })}
        </div>

        {/* Comparative Provider Bar Chart right column */}
        <div className="card" style={{ position: 'sticky', top: 120 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 20, fontSize: 14 }}>
            Provider Usage Correlation
          </div>
          
          {(!d?.providerStats?.length) ? (
            <EmptyState text="No usage data recorded yet" />
          ) : (
            <div style={{ position: 'relative', width: '100%', height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: 20 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-evenly', flex: 1 }}>
                {(() => {
                  const activeKeysForGraph = keysRes?.data?.filter(k => k.is_active) || [];
                  if (activeKeysForGraph.length === 0) return null;
                  
                  const maxReq = Math.max(...activeKeysForGraph.map(p => p.total_requests || 0), 1);
                  
                  return activeKeysForGraph.map((key, idx) => {
                    const info = getProvider(key.provider);
                    const hRatio = (key.total_requests || 0) / maxReq;
                    const heightPx = Math.max(80, hRatio * 220); // Scale up to 220px height max

                    return (
                      <div key={key.id + '_' + idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 44, position: 'relative' }} title={key.name}>
                        {/* Outer Token Value */}
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#a0a0b0', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                          {formatNumber(key.total_tokens_used || 0)}
                        </div>

                        {/* Solid Bar */}
                        <div style={{ 
                          width: '100%', height: heightPx, background: info.color || '#6366f1', 
                          borderRadius: '8px 8px 0 0', display: 'flex', flexDirection: 'column', 
                          alignItems: 'center', position: 'relative', overflow: 'hidden'
                        }}>
                          {/* Translucent overlay cap matching exact image style */}
                          <div style={{ 
                            position: 'absolute', top: 0, left: 0, right: 0, height: 36, 
                            background: 'rgba(255,255,255,0.25)', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                          }} />
                          
                          {/* Inner Requests Value */}
                          <div style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', marginTop: 4, zIndex: 1, textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
                            {formatNumber(key.total_requests || 0)}
                          </div>

                          {/* Embedded Logo */}
                          <div style={{ 
                            marginTop: 6, width: 26, height: 26, borderRadius: 6, 
                            background: info.bg, border: `1px solid rgba(255,255,255,0.2)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1,
                            boxShadow: '0 2px 8px rgba(0,0,0,0.4)', color: info.color
                          }}>
                            {info.icon}
                          </div>
                        </div>
                        
                        {/* Distinct Key Name explicitly underneath floor line */}
                        <div style={{
                          position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
                          fontSize: 9, color: 'var(--text3)', whiteSpace: 'nowrap', maxWidth: 64, overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {key.name}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              
              {/* Floor Base */}
              <div style={{ width: '100%', height: 2, background: 'var(--border2)', marginTop: -1, zIndex: 3 }} />
              
              {/* Legend map */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32 }}>
                <div style={{ fontSize: 11, color: '#a0a0b0' }}><span style={{ fontWeight: 700, color: '#e0e0e0' }}>TOP:</span> Tokens Used</div>
                <div style={{ fontSize: 11, color: '#a0a0b0' }}><span style={{ fontWeight: 700, color: '#e0e0e0' }}>INSIDE:</span> API Requests</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick nav */}
      <div style={{ marginTop: 24 }}>
        <button className="btn btn-ghost" onClick={() => navigate('keys')}>
          View All API Keys →
        </button>
      </div>

      {showAdd && (
        <AddKeyModal
          onClose={() => setShowAdd(false)}
          onSubmit={(form) => addMut.mutateAsync(form)}
        />
      )}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)', fontSize: 13 }}>
      {text}
    </div>
  );
}
