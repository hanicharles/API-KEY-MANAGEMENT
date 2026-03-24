const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'api_key_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+00:00'
});

async function initializeDatabase() {
  const conn = await pool.getConnection();
  try {
    // Create database if not exists
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'api_key_management'}\``);
    await conn.query(`USE \`${process.env.DB_NAME || 'api_key_management'}\``);

    // Users table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password VARCHAR(255),
        google_id VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // API Keys table - updated with user_id
    await conn.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        name VARCHAR(255) NOT NULL,
        provider VARCHAR(100) NOT NULL,
        api_key TEXT NOT NULL,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_synced TIMESTAMP NULL,
        notes TEXT,
        tags VARCHAR(500),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Usage stats table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS usage_stats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key_id INT NOT NULL,
        provider VARCHAR(100) NOT NULL,
        total_tokens_used BIGINT DEFAULT 0,
        tokens_remaining BIGINT DEFAULT NULL,
        total_requests INT DEFAULT 0,
        requests_remaining INT DEFAULT NULL,
        credits_used DECIMAL(12,4) DEFAULT 0,
        credits_remaining DECIMAL(12,4) DEFAULT NULL,
        credits_total DECIMAL(12,4) DEFAULT NULL,
        rate_limit_rpm INT DEFAULT NULL,
        rate_limit_tpm INT DEFAULT NULL,
        model_breakdown JSON,
        raw_response JSON,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
        INDEX idx_api_key_id (api_key_id),
        INDEX idx_fetched_at (fetched_at)
      )
    `);

    // Usage history table (for charts)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS usage_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key_id INT NOT NULL,
        provider VARCHAR(100) NOT NULL,
        tokens_used BIGINT DEFAULT 0,
        requests_count INT DEFAULT 0,
        cost DECIMAL(12,6) DEFAULT 0,
        recorded_date DATE NOT NULL,
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE,
        INDEX idx_api_key_date (api_key_id, recorded_date)
      )
    `);

    // Sync logs table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        api_key_id INT NOT NULL,
        status ENUM('success','error','pending') DEFAULT 'pending',
        message TEXT,
        response_time INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Database initialized successfully');
  } catch (err) {
    console.error('❌ Database init error:', err.message);
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, initializeDatabase };
