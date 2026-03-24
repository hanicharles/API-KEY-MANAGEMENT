const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
require('dotenv').config();

const { initializeDatabase, pool } = require('./config/database');
const apiKeysRouter = require('./routes/apiKeys');
const { fetchProviderUsage } = require('./config/providers');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, slow down!' }
});
app.use('/api/', limiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
const { authenticateToken } = require('./middleware/authMiddleware');
app.use('/api', authenticateToken, apiKeysRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Auto-sync every 30 minutes
cron.schedule('*/30 * * * *', async () => {
  console.log('⏰ Auto-sync triggered...');
  try {
    const [keys] = await pool.query('SELECT * FROM api_keys WHERE is_active = 1');
    for (const key of keys) {
      const result = await fetchProviderUsage(key.provider, key.api_key);
      if (result.success) {
        const d = result.data;
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
        console.log(`  ✅ Synced: ${key.name}`);
      } else {
        console.log(`  ❌ Failed: ${key.name} — ${result.error}`);
      }
    }
  } catch (err) {
    console.error('Auto-sync error:', err.message);
  }
});

// Start
async function start() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 API Key Management System`);
      console.log(`   Backend: http://localhost:${PORT}`);
      console.log(`   Health:  http://localhost:${PORT}/health`);
      console.log(`   Auto-sync: every 30 minutes\n`);
    });
  } catch (err) {
    console.error('Failed to start:', err.message);
    process.exit(1);
  }
}

start();
