const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
require('dotenv').config();

// Validation helpers matching the mockup rules:
// - login id unique, 6-12 chars
// - email unique
// - password: unique, lower+upper+special char, min 8 chars
function isValidLoginId(id) {
  return typeof id === 'string' && id.length >= 6 && id.length <= 12;
}
function isValidPassword(pw) {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;
  return re.test(pw);
}

exports.signup = async (req, res) => {
  try {
    const { name, login_id, email, password, confirm_password } = req.body;

    if (!name || !login_id || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (!isValidLoginId(login_id)) {
      return res.status(400).json({ message: 'Login ID must be between 6 and 12 characters.' });
    }
    if (password !== confirm_password) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character.'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE login_id = ? OR email = ?',
      [login_id, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ message: 'Login ID or Email already in use.' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, login_id, email, password_hash) VALUES (?, ?, ?, ?)',
      [name, login_id, email, password_hash]
    );

    const token = jwt.sign(
      { id: result.insertId, login_id, name },
      process.env.JWT_SECRET || 'change_this_secret_key',
      { expiresIn: '7d' }
    );

    res.status(201).json({ message: 'Account created successfully.', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { login_id, password } = req.body;
    if (!login_id || !password) {
      return res.status(400).json({ message: 'Login ID and password are required.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE login_id = ? OR email = ?',
      [login_id, login_id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Invalid Login ID or Password.' });
    }

    const user = rows[0];

    // Passwords created through signup are BCrypt hashes. Older/local seed
    // data may contain a plain-text password in password_hash; support that
    // legacy case once, then immediately upgrade it to BCrypt so existing
    // local accounts do not become unusable.
    let match = false;
    const storedHash = String(user.password_hash || '');
    const isBcryptHash = /^\$2[aby]\$\d{2}\$/.test(storedHash);

    if (isBcryptHash) {
      match = await bcrypt.compare(password, storedHash);
    } else {
      match = password === storedHash;
      if (match) {
        const upgradedHash = await bcrypt.hash(password, 10);
        await pool.query(
          'UPDATE users SET password_hash = ? WHERE id = ?',
          [upgradedHash, user.id]
        );
      }
    }

    if (!match) {
      return res.status(401).json({ message: 'Invalid Login ID or Password.' });
    }

    const token = jwt.sign(
      { id: user.id, login_id: user.login_id, name: user.name },
      process.env.JWT_SECRET || 'change_this_secret_key',
      { expiresIn: '7d' }
    );

    res.json({ message: 'Login successful.', token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login.' });
  }
};

// OTP-based forgot password flow
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const [rows] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No account found with that email.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await pool.query('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE email = ?', [otp, expires, email]);

    // NOTE: In production, send the OTP via an email/SMS provider.
    // For local development, it is returned in the response.
    res.json({ message: 'OTP generated. Check your email.', dev_otp: otp });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error generating OTP.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, new_password } = req.body;
    if (!isValidPassword(new_password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a special character.'
      });
    }

    const [rows] = await pool.query(
      'SELECT * FROM users WHERE email = ? AND otp_code = ? AND otp_expires_at > NOW()',
      [email, otp]
    );
    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired OTP.' });
    }

    const password_hash = await bcrypt.hash(new_password, 10);
    await pool.query(
      'UPDATE users SET password_hash = ?, otp_code = NULL, otp_expires_at = NULL WHERE email = ?',
      [password_hash, email]
    );

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error resetting password.' });
  }
};
