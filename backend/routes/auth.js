const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

// Логин
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const user = userResult.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        first_login_completed: user.first_login_completed
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Смена пароля при первом входе
router.post('/change-password', async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      'UPDATE users SET password_hash = $1, first_login_completed = TRUE WHERE id = $2',
      [hashedPassword, userId]
    );
    
    res.json({ message: 'Пароль изменён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Принятие согласий при первом входе
router.post('/accept-agreements', async (req, res) => {
  try {
    const { userId, rules, personalData, newsletter } = req.body;
    
    await pool.query(
      `UPDATE users SET 
        rules_accepted = $1, 
        personal_data_accepted = $2, 
        newsletter_accepted = $3,
        email_verified = TRUE
       WHERE id = $4`,
      [rules, personalData, newsletter, userId]
    );
    
    res.json({ message: 'Согласия приняты' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;