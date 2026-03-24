const crypto = require('crypto');
require('dotenv').config();

// ENCRYPTION_KEY must be exactly 32 bytes (256 bits) for aes-256-cbc.
// If none exists, generated safely. 
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'supersecureencryptionkey12345678';
const ALGORITHM = 'aes-256-cbc';

function encrypt(text) {
  if (!text) return text;
  // If it already seems encrypted, don't encrypt again
  if (text.includes(':') && text.split(':')[0].length === 32) return text; 
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return text;
  // Fallback for old plaintext keys (not encrypted yet)
  if (!text.includes(':')) return text; 
  
  const textParts = text.split(':');
  if (textParts.length !== 2) return text;
  
  try {
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = Buffer.from(textParts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (err) {
    console.error('Decryption failed for a key, returning originally:', err.message);
    return text; // Safe fallback
  }
}

module.exports = { encrypt, decrypt };
