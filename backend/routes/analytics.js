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

// Аналитика пользователя (коробки за период)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.query;
    
    let query = `
      SELECT 
        sd.product_name,
        SUM(sd.quantity) as total_boxes,
        SUM(sd.points) as total_points
      FROM sales_details sd
      WHERE sd.user_id = $1
    `;
    
    const params = [req.userId];
    
    if (year && month) {
      query += ` AND sd.year = $2 AND sd.month = $3`;
      params.push(parseInt(year), parseInt(month));
    }
    
    query += ` GROUP BY sd.product_name ORDER BY total_boxes DESC`;
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Баланс баллов пользователя
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(SUM(CASE WHEN status = 'active' THEN points_amount ELSE 0 END), 0) as available_points,
        COALESCE(SUM(points_amount), 0) as total_points
       FROM points_ledger
       WHERE user_id = $1`,
      [req.userId]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// История начислений
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT pl.*, mp.year, mp.month
       FROM points_ledger pl
       JOIN monthly_periods mp ON pl.period_id = mp.id
       WHERE pl.user_id = $1
       ORDER BY mp.year DESC, mp.month DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;