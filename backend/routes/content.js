const express = require('express');
const router = express.Router();
const pool = require('../db');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Нет токена' });
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Неверный токен' });
  }
};

// Получить страницу
router.get('/:slug', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM content_pages WHERE slug = $1', [req.params.slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Страница не найдена' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить страницу (админ)
router.put('/:slug', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const { title, content } = req.body;
    await pool.query(
      'UPDATE content_pages SET title = $1, content = $2, updated_at = NOW() WHERE slug = $3',
      [title, content, req.params.slug]
    );
    
    res.json({ message: 'Страница обновлена' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;