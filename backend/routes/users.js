const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');

// Настройка загрузки файлов
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Middleware для проверки токена
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

// Получить профиль пользователя
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    console.log('🔍 Запрос профиля для userId:', req.userId);
    
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);
    
    console.log('📊 Результат из БД:', result.rows[0]);
    console.log('📝 full_name из БД:', result.rows[0].full_name);
    console.log('🔤 full_name bytes:', Buffer.from(result.rows[0].full_name).toString('hex'));
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Обновить профиль
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, phone, inn_number, bank_card_number, bank_card_holder_name, bank_bik } = req.body;
    
    await pool.query(
      `UPDATE users SET 
        full_name = COALESCE($1, full_name),
        phone = COALESCE($2, phone),
        inn_number = COALESCE($3, inn_number),
        bank_card_number = COALESCE($4, bank_card_number),
        bank_card_holder_name = COALESCE($5, bank_card_holder_name),
        bank_bik = COALESCE($6, bank_bik),
        updated_at = NOW()
       WHERE id = $7`,
      [full_name, phone, inn_number, bank_card_number, bank_card_holder_name, bank_bik, req.userId]
    );
    
    res.json({ message: 'Профиль обновлён' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Загрузка документов
router.post('/upload-document', authMiddleware, upload.single('document'), async (req, res) => {
  try {
    const { documentType } = req.body;
    const fileUrl = `/uploads/${req.file.filename}`;
    
    let updateQuery = '';
    if (documentType === 'passport') updateQuery = 'passport_photo_url = $1';
    else if (documentType === 'inn') updateQuery = 'inn_photo_url = $1';
    else if (documentType === 'knd') updateQuery = 'knd_1122035_url = $1';
    
    await pool.query(`UPDATE users SET ${updateQuery} WHERE id = $2`, [fileUrl, req.userId]);
    
    res.json({ message: 'Документ загружен', url: fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Список всех пользователей (для админа)
router.get('/all', authMiddleware, async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const result = await pool.query('SELECT id, email, full_name, company_name, role, created_at FROM users ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;