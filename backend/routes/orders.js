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

// Создать заявку
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { rewardId } = req.body;
    
    // Проверяем баланс пользователя
    const balanceResult = await pool.query(
      `SELECT COALESCE(SUM(points_amount), 0) as total_points
       FROM points_ledger
       WHERE user_id = $1 AND status = 'active'`,
      [req.userId]
    );
    
    const totalPoints = parseFloat(balanceResult.rows[0].total_points);
    
    // Получаем стоимость награды
    const rewardResult = await pool.query('SELECT points_cost, type FROM rewards WHERE id = $1', [rewardId]);
    if (rewardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Награда не найдена' });
    }
    
    const reward = rewardResult.rows[0];
    
    if (totalPoints < reward.points_cost) {
      return res.status(400).json({ error: 'Недостаточно баллов' });
    }
    
    // Для денег проверяем самозанятость
    if (reward.type === 'money') {
      const userResult = await pool.query('SELECT is_self_employed FROM users WHERE id = $1', [req.userId]);
      if (!userResult.rows[0].is_self_employed) {
        return res.status(400).json({ error: 'Вывод денег доступен только самозанятым' });
      }
    }
    
    // Создаём заявку
    const orderResult = await pool.query(
      `INSERT INTO reward_orders (user_id, reward_id, points_deducted, status)
       VALUES ($1, $2, $3, 'placed') RETURNING *`,
      [req.userId, rewardId, reward.points_cost]
    );
    
    res.json(orderResult.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Мои заявки
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*, r.name as reward_name, r.type as reward_type
       FROM reward_orders o
       JOIN rewards r ON o.reward_id = r.id
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Все заявки (админ)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const result = await pool.query(
      `SELECT o.*, r.name as reward_name, u.email, u.full_name
       FROM reward_orders o
       JOIN rewards r ON o.reward_id = r.id
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить статус заявки (админ)
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const { status, digital_content } = req.body;
    const orderId = req.params.id;
    
    await pool.query(
      `UPDATE reward_orders 
       SET status = $1, 
           digital_content = COALESCE($2, digital_content),
           admin_confirmed_at = CASE WHEN $1 = 'confirmed' THEN NOW() ELSE admin_confirmed_at END,
           fulfilled_at = CASE WHEN $1 = 'fulfilled' THEN NOW() ELSE fulfilled_at END,
           updated_at = NOW()
       WHERE id = $3`,
      [status, digital_content, orderId]
    );
    
    res.json({ message: 'Статус обновлён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;