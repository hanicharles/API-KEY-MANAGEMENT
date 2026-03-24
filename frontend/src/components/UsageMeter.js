import React from 'react';
import { formatCredits, formatNumber, getUsagePercent } from '../utils/providers';

export default function UsageMeter({ stats }) {
  if (!stats) return <div style={{ color: 'var(--text3)', fontSize: 12 }}>No data — sync to fetch</div>;

  const creditPct = getUsagePercent(stats.credits_used, stats.credits_total);
  const tokenPct = stats.tokens_remaining != null && stats.rate_limit_tpm
    ? Math.round((1 - stats.tokens_remaining / stats.rate_limit_tpm) * 100)
    : null;
  const reqPct = stats.provider === 'gemini' 
    ? Math.round((stats.total_requests / 1500) * 100)
    : stats.requests_remaining != null && stats.rate_limit_rpm
    ? Math.round((1 - stats.requests_remaining / stats.rate_limit_rpm) * 100)
    : null;

  const getColor = (pct) => {
    if (pct === null) return '#6366f1';
    if (pct >= 90) return '#ef4444';
    if (pct >= 70) return '#f59e0b';
    return '#22c55e';
  };

  const raw = typeof stats.raw_response === 'string' && stats.raw_response.startsWith('{') 
    ? JSON.parse(stats.raw_response) 
    : (stats.raw_response || {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Credits / Cost */}
      <MeterRow
        label="Credits Used"
        used={formatCredits(stats.credits_used)}
        remaining={stats.credits_remaining != null ? formatCredits(stats.credits_remaining) : null}
        total={stats.credits_total != null ? formatCredits(stats.credits_total) : null}
        pct={creditPct}
        color={getColor(creditPct)}
      />

      {/* Tokens */}
      <MeterRow
        label="Tokens Used"
        used={formatNumber(stats.total_tokens_used)}
        remaining={stats.tokens_remaining != null ? formatNumber(stats.tokens_remaining) : null}
        total={stats.rate_limit_tpm != null ? formatNumber(stats.rate_limit_tpm) + '/min' : null}
        pct={tokenPct}
        color={getColor(tokenPct)}
      />

      {/* Requests */}
      <MeterRow
        label="Requests"
        used={formatNumber(stats.total_requests) + ' total'}
        remaining={stats.requests_remaining != null ? formatNumber(stats.requests_remaining) + ' left' : null}
        total={stats.provider === 'gemini' ? '1,500/day' : (stats.rate_limit_rpm != null ? formatNumber(stats.rate_limit_rpm) + '/min' : null)}
        pct={reqPct}
        color={getColor(reqPct)}
      />

      {raw.daily_reset_time && (
        <div style={{ fontSize: 11, color: 'var(--text3)', textAlign: 'right', marginTop: '-6px' }}>
          Daily limit resets: {new Date(raw.daily_reset_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      )}
    </div>
  );
}

function MeterRow({ label, used, remaining, total, pct, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', fontFamily: 'var(--font-mono)' }}>{used}</span>
          {remaining && (
            <span style={{ fontSize: 12, color, fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
              {remaining} left
            </span>
          )}
          {total && !remaining && (
            <span style={{ fontSize: 11, color: 'var(--text3)' }}>/ {total}</span>
          )}
        </div>
      </div>
      {pct !== null && (
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${Math.max(2, pct)}%`, background: color, boxShadow: `0 0 8px ${color}60` }}
          />
        </div>
      )}
      {pct === null && (
        <div className="progress-bar">
          <div style={{ height: '100%', background: 'var(--border2)', borderRadius: 3, fontSize: 10, color: 'var(--text3)', display: 'flex', alignItems: 'center', paddingLeft: 8 }} />
        </div>
      )}
    </div>
  );
}
