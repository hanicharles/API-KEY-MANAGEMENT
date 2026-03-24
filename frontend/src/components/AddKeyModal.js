import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { PROVIDERS } from '../utils/providers';
import toast from 'react-hot-toast';

export default function AddKeyModal({ onClose, onSubmit, editKey = null }) {
  const [form, setForm] = useState({
    name: editKey?.name || '',
    provider: editKey?.provider || 'anthropic',
    api_key: '',
    notes: editKey?.notes || '',
    tags: editKey?.tags || ''
  });
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEdit = !!editKey;
  const providerConfig = PROVIDERS[form.provider] || PROVIDERS.anthropic;

  const handle = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Name is required');
    if (!isEdit && !form.api_key.trim()) return toast.error('API key is required');

    setLoading(true);
    try {
      await onSubmit(form);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit API Key' : 'Add New API Key'}</span>
          <button className="btn btn-icon" onClick={onClose}><X size={16} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body">
            {/* Provider selector */}
            {!isEdit && (
              <div className="form-group">
                <label className="form-label">Provider</label>
                <select className="form-input" value={form.provider} onChange={handle('provider')}>
                  {Object.entries(PROVIDERS).map(([k, v]) => (
                    <option key={k} value={k}>{v.icon} {v.label}</option>
                  ))}
                </select>
                {providerConfig.docsUrl && (
                  <a
                    href={providerConfig.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--accent)', fontSize: 12, marginTop: 4 }}
                  >
                    <ExternalLink size={12} />
                    Get API key from {providerConfig.name} →
                  </a>
                )}
              </div>
            )}

            {/* Name */}
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                placeholder="e.g. Production Claude Key"
                value={form.name}
                onChange={handle('name')}
                required
              />
            </div>

            {/* API Key */}
            {!isEdit && (
              <div className="form-group">
                <label className="form-label">API Key</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-input"
                    type={showKey ? 'text' : 'password'}
                    placeholder={providerConfig.placeholder || 'Paste your API key...'}
                    value={form.api_key}
                    onChange={handle('api_key')}
                    style={{ paddingRight: 44, fontFamily: 'var(--font-mono)', fontSize: 13 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(s => !s)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer'
                    }}
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  🔒 Stored securely in your local MySQL database
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                className="form-input"
                placeholder="What is this key used for?"
                value={form.notes}
                onChange={handle('notes')}
                rows={3}
              />
            </div>

            {/* Tags */}
            <div className="form-group">
              <label className="form-label">Tags (optional)</label>
              <input
                className="form-input"
                placeholder="production, backend, team-a"
                value={form.tags}
                onChange={handle('tags')}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <><span className="spin" style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> {isEdit ? 'Saving...' : 'Adding & Syncing...'}</>
              ) : (
                isEdit ? 'Save Changes' : '✨ Add & Sync'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
