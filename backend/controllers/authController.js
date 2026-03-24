const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy');

async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing.length > 0) return res.status(400).json({ error: 'Email already exists' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hash]);
    
    const user = { id: result.insertId, name, email };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
    
    res.json({ token, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function login(req, res) {
  const { email, password } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(401).json({ error: 'Invalid email or password' });
    
    const user = users[0];
    if (!user.password) return res.status(401).json({ error: 'Please login using Google' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function googleLogin(req, res) {
  const { credential } = req.body; 
  if (!credential) return res.status(400).json({ error: 'Credential missing' });

  try {
    // Determine payload from credential (decode jwt if we don't strictly verify client ID for local demo)
    const payload = jwt.decode(credential); 
    if (!payload || !payload.email) return res.status(400).json({ error: 'Invalid Google token' });

    const { sub: googleId, email, name, picture } = payload;
    
    let [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let user;
    
    if (users.length === 0) {
      const [result] = await pool.query('INSERT INTO users (name, email, google_id) VALUES (?, ?, ?)', [name, email, googleId]);
      user = { id: result.insertId, name, email };
    } else {
      user = users[0];
      if (!user.google_id) {
         await pool.query('UPDATE users SET google_id = ? WHERE id = ?', [googleId, user.id]);
      }
    }
    
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, picture } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateProfile(req, res) {
  const { name, email } = req.body;
  try {
    await pool.query('UPDATE users SET name = ?, email = ? WHERE id = ?', [name, email, req.user.id]);
    const [users] = await pool.query('SELECT id, name, email, google_id FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, user: users[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Email already in use' });
    res.status(500).json({ error: err.message });
  }
}

async function updatePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword) return res.status(400).json({ error: 'New password is required' });
  try {
    const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id]);
    const user = users[0];
    
    if (user.password && currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) return res.status(401).json({ error: 'Incorrect current password' });
    } else if (user.password && !currentPassword) {
      return res.status(401).json({ error: 'Current password is required' });
    }
    
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function forgotPassword(req, res) {
  const { email } = req.body;
  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length) {
      // Return success anyway to prevent email enumeration attacks
      return res.json({ success: true, message: 'If the email exists, a password reset link has been sent.' });
    }
    
    // In production, you would generate a secure token and send it via an email service (NodeMailer/SendGrid).
    // For this prototype, we simulate a successful mock workflow.
    res.json({ success: true, message: 'If the email exists, a password reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { register, login, googleLogin, updateProfile, updatePassword, forgotPassword };
