const { pool } = require('../config/database');
const { fetchProviderUsage } = require('../config/providers');
const { encrypt, decrypt } = require('../utils/encryption');

// Get all API keys
async function getApiKeys(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT 
        k.id, k.name, k.provider, k.is_active, k.created_at, k.updated_at, k.last_synced, k.notes, k.tags,
        k.api_key,

        s.total_tokens_used, s.tokens_remaining, s.total_requests, s.requests_remaining,
        s.credits_used, s.credits_remaining, s.credits_total, s.rate_limit_rpm, s.rate_limit_tpm,
        s.model_breakdown, s.raw_response, s.fetched_at as stats_fetched_at
      FROM api_keys k
      LEFT JOIN (
        SELECT * FROM usage_stats us1
        WHERE us1.id = (
          SELECT MAX(us2.id) FROM usage_stats us2 WHERE us2.api_key_id = us1.api_key_id
        )
      ) s ON s.api_key_id = k.id
      WHERE k.user_id = ? OR k.user_id IS NULL
      ORDER BY k.created_at DESC
    `, [req.user.id]);

    const formatted = rows.map(r => {
      const plain = decrypt(r.api_key);
      const api_key_masked = plain ? `${plain.substring(0, 8)}...${plain.substring(plain.length - 4)}` : '';
      return {
        ...r,
        api_key: undefined,
        api_key_masked,
        model_breakdown: r.model_breakdown ? (typeof r.model_breakdown === 'string' ? JSON.parse(r.model_breakdown) : r.model_breakdown) : {}
      }
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Get single API key
async function getApiKey(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT k.* FROM api_keys k WHERE k.id = ? AND (k.user_id = ? OR k.user_id IS NULL)`, [id, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, error: 'API key not found or access denied' });
    
    const plain = decrypt(rows[0].api_key);
    const api_key_masked = plain ? `${plain.substring(0, 8)}...${plain.substring(plain.length - 4)}` : '';
    rows[0].api_key = undefined;
    rows[0].api_key_masked = api_key_masked;

    const [stats] = await pool.query(
      'SELECT * FROM usage_stats WHERE api_key_id = ? ORDER BY fetched_at DESC LIMIT 1', [id]
    );

    const [history] = await pool.query(
      'SELECT * FROM usage_history WHERE api_key_id = ? ORDER BY recorded_date DESC LIMIT 30', [id]
    );

    const [logs] = await pool.query(
      'SELECT * FROM sync_logs WHERE api_key_id = ? ORDER BY created_at DESC LIMIT 10', [id]
    );

    res.json({
      success: true,
      data: {
        ...rows[0],
        latest_stats: stats[0] || null,
        history,
        logs
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Add API key
async function addApiKey(req, res) {
  try {
    const { name, provider, api_key, notes, tags } = req.body;
    if (!name || !provider || !api_key) {
      return res.status(400).json({ success: false, error: 'name, provider and api_key are required' });
    }

    const encKey = encrypt(api_key);

    const [result] = await pool.query(
      'INSERT INTO api_keys (user_id, name, provider, api_key, notes, tags) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name, provider.toLowerCase(), encKey, notes || null, tags || null]
    );

    const newId = result.insertId;

    // Immediately fetch usage for this new key
    const fetchResult = await fetchProviderUsage(provider, api_key);

    if (fetchResult.success) {
      const d = fetchResult.data;
      await pool.query(
        `INSERT INTO usage_stats 
         (api_key_id, provider, total_tokens_used, tokens_remaining, total_requests, requests_remaining,
          credits_used, credits_remaining, credits_total, rate_limit_rpm, rate_limit_tpm, model_breakdown, raw_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId, provider.toLowerCase(),
          d.total_tokens_used || 0, d.tokens_remaining,
          d.total_requests || 0, d.requests_remaining,
          d.credits_used || 0, d.credits_remaining, d.credits_total,
          d.rate_limit_rpm, d.rate_limit_tpm,
          JSON.stringify(d.model_breakdown || {}),
          JSON.stringify(d.raw_response || {})
        ]
      );

      await pool.query('UPDATE api_keys SET last_synced = NOW() WHERE id = ?', [newId]);
      await pool.query(
        'INSERT INTO sync_logs (api_key_id, status, message, response_time) VALUES (?, ?, ?, ?)',
        [newId, 'success', 'Initial sync successful', fetchResult.responseTime]
      );
    } else {
      await pool.query(
        'INSERT INTO sync_logs (api_key_id, status, message, response_time) VALUES (?, ?, ?, ?)',
        [newId, 'error', fetchResult.error, fetchResult.responseTime]
      );
    }

    res.json({
      success: true,
      message: 'API key added successfully',
      data: { id: newId, fetchSuccess: fetchResult.success, fetchError: fetchResult.error }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Update API key
async function updateApiKey(req, res) {
  try {
    const { id } = req.params;
    const { name, notes, tags, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM api_keys WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, req.user.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'API key not found' });

    await pool.query(
      'UPDATE api_keys SET name = ?, notes = ?, tags = ?, is_active = ? WHERE id = ?',
      [
        name || existing[0].name,
        notes !== undefined ? notes : existing[0].notes,
        tags !== undefined ? tags : existing[0].tags,
        is_active !== undefined ? is_active : existing[0].is_active,
        id
      ]
    );

    res.json({ success: true, message: 'API key updated' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Delete API key
async function deleteApiKey(req, res) {
  try {
    const { id } = req.params;
    const [existing] = await pool.query('SELECT id FROM api_keys WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, req.user.id]);
    if (!existing.length) return res.status(404).json({ success: false, error: 'API key not found' });

    await pool.query('DELETE FROM api_keys WHERE id = ?', [id]);
    res.json({ success: true, message: 'API key deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Sync a single key's usage
async function syncApiKey(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM api_keys WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'API key not found' });

    const key = rows[0];
    const plainKey = decrypt(key.api_key);
    const fetchResult = await fetchProviderUsage(key.provider, plainKey);

    if (fetchResult.success) {
      const d = fetchResult.data;
      await pool.query(
        `INSERT INTO usage_stats 
         (api_key_id, provider, total_tokens_used, tokens_remaining, total_requests, requests_remaining,
          credits_used, credits_remaining, credits_total, rate_limit_rpm, rate_limit_tpm, model_breakdown, raw_response)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, key.provider,
          d.total_tokens_used || 0, d.tokens_remaining,
          d.total_requests || 0, d.requests_remaining,
          d.credits_used || 0, d.credits_remaining, d.credits_total,
          d.rate_limit_rpm, d.rate_limit_tpm,
          JSON.stringify(d.model_breakdown || {}),
          JSON.stringify(d.raw_response || {})
        ]
      );

      // Record history
      const today = new Date().toISOString().split('T')[0];
      await pool.query(
        `INSERT INTO usage_history (api_key_id, provider, tokens_used, requests_count, cost, recorded_date)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE tokens_used = VALUES(tokens_used), requests_count = VALUES(requests_count), cost = VALUES(cost)`,
        [id, key.provider, d.total_tokens_used || 0, d.total_requests || 0, d.credits_used || 0, today]
      );

      await pool.query('UPDATE api_keys SET last_synced = NOW() WHERE id = ?', [id]);
      await pool.query(
        'INSERT INTO sync_logs (api_key_id, status, message, response_time) VALUES (?, ?, ?, ?)',
        [id, 'success', 'Sync successful', fetchResult.responseTime]
      );

      res.json({ success: true, message: 'Sync successful', data: d });
    } else {
      await pool.query(
        'INSERT INTO sync_logs (api_key_id, status, message, response_time) VALUES (?, ?, ?, ?)',
        [id, 'error', fetchResult.error, fetchResult.responseTime]
      );
      res.status(400).json({ success: false, error: fetchResult.error });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Sync all active keys
async function syncAllKeys(req, res) {
  try {
    const [keys] = await pool.query('SELECT * FROM api_keys WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL)', [req.user.id]);
    const results = [];

    for (const key of keys) {
      const plainKey = decrypt(key.api_key);
      const fetchResult = await fetchProviderUsage(key.provider, plainKey);
      if (fetchResult.success) {
        const d = fetchResult.data;
        await pool.query(
          `INSERT INTO usage_stats 
           (api_key_id, provider, total_tokens_used, tokens_remaining, total_requests, requests_remaining,
            credits_used, credits_remaining, credits_total, rate_limit_rpm, rate_limit_tpm, model_breakdown, raw_response)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            key.id, key.provider,
            d.total_tokens_used || 0, d.tokens_remaining,
            d.total_requests || 0, d.requests_remaining,
            d.credits_used || 0, d.credits_remaining, d.credits_total,
            d.rate_limit_rpm, d.rate_limit_tpm,
            JSON.stringify(d.model_breakdown || {}),
            JSON.stringify(d.raw_response || {})
          ]
        );

        const today = new Date().toISOString().split('T')[0];
        await pool.query(
          `INSERT INTO usage_history (api_key_id, provider, tokens_used, requests_count, cost, recorded_date)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE tokens_used = VALUES(tokens_used), requests_count = VALUES(requests_count), cost = VALUES(cost)`,
          [key.id, key.provider, d.total_tokens_used || 0, d.total_requests || 0, d.credits_used || 0, today]
        );

        await pool.query('UPDATE api_keys SET last_synced = NOW() WHERE id = ?', [key.id]);
        await pool.query(
          'INSERT INTO sync_logs (api_key_id, status, message, response_time) VALUES (?, ?, ?, ?)',
          [key.id, 'success', 'Auto-sync successful', fetchResult.responseTime]
        );
      }
      results.push({ id: key.id, name: key.name, success: fetchResult.success, error: fetchResult.error });
    }

    res.json({ success: true, message: `Synced ${keys.length} keys`, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Dashboard stats
async function getDashboardStats(req, res) {
  try {
    const [[totalKeys]] = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE user_id = ? OR user_id IS NULL', [req.user.id]);
    const [[activeKeys]] = await pool.query('SELECT COUNT(*) as count FROM api_keys WHERE is_active = 1 AND (user_id = ? OR user_id IS NULL)', [req.user.id]);

    const [providerStats] = await pool.query(`
      SELECT k.provider, COUNT(*) as key_count,
             SUM(COALESCE(s.credits_used, 0)) as total_credits_used,
             SUM(COALESCE(s.total_tokens_used, 0)) as total_tokens,
             SUM(COALESCE(s.total_requests, 0)) as total_requests
      FROM api_keys k
      LEFT JOIN (
        SELECT us1.* FROM usage_stats us1
        WHERE us1.id = (SELECT MAX(us2.id) FROM usage_stats us2 WHERE us2.api_key_id = us1.api_key_id)
      ) s ON s.api_key_id = k.id
      WHERE k.user_id = ? OR k.user_id IS NULL
      GROUP BY k.provider
    `, [req.user.id]);

    const [recentSyncs] = await pool.query(`
      SELECT sl.*, k.name as key_name, k.provider
      FROM sync_logs sl
      JOIN api_keys k ON k.id = sl.api_key_id
      WHERE k.user_id = ? OR k.user_id IS NULL
      ORDER BY sl.created_at DESC LIMIT 5
    `, [req.user.id]);

    const [usageTrend] = await pool.query(`
      SELECT h.recorded_date, 
             SUM(h.tokens_used) as total_tokens,
             SUM(h.requests_count) as total_requests,
             SUM(h.cost) as total_cost
      FROM usage_history h
      JOIN api_keys k ON k.id = h.api_key_id
      WHERE k.user_id = ? OR k.user_id IS NULL
      GROUP BY h.recorded_date
      ORDER BY h.recorded_date DESC LIMIT 14
    `, [req.user.id]);

    const [providerTrend] = await pool.query(`
      SELECT h.recorded_date, k.provider,
             SUM(h.requests_count) as total_requests,
             SUM(h.tokens_used) as total_tokens
      FROM usage_history h
      JOIN api_keys k ON k.id = h.api_key_id
      WHERE k.user_id = ? OR k.user_id IS NULL
      GROUP BY h.recorded_date, k.provider
      ORDER BY h.recorded_date ASC LIMIT 50
    `, [req.user.id]);

    res.json({
      success: true,
      data: {
        totalKeys: totalKeys.count,
        activeKeys: activeKeys.count,
        providerStats,
        recentSyncs,
        usageTrend: usageTrend.reverse(),
        providerTrend
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// Reveal raw API key (for export/copy)
async function revealApiKey(req, res) {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT api_key FROM api_keys WHERE id = ? AND (user_id = ? OR user_id IS NULL)', [id, req.user.id]);
    if (!rows.length) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, api_key: decrypt(rows[0].api_key) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  getApiKeys, getApiKey, addApiKey, updateApiKey, deleteApiKey,
  syncApiKey, syncAllKeys, getDashboardStats, revealApiKey
};
