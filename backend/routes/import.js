const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

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

// Импорт пользователей
router.post('/users', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    let created = 0;
    let updated = 0;
    
    for (const row of data) {
      const email = row['электронная почта участника']?.toString().trim().toLowerCase();
      if (!email) continue;
      
      const fullName = row['ФИО участника'] || '';
      const companyName = row['Наименование дистрибутора (юрлицо)'] || '';
      const position = row['должность участника'] || '';
      const phone = row['номер телефона участника'] || '';
      
      // Проверяем, есть ли пользователь
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
      
      if (existing.rows.length > 0) {
        // Обновляем
        await pool.query(
          `UPDATE users SET 
            full_name = $1, company_name = $2, position = $3, phone = $4, updated_at = NOW()
           WHERE email = $5`,
          [fullName, companyName, position, phone, email]
        );
        updated++;
      } else {
        // Создаём нового с временным паролем
        const bcrypt = require('bcryptjs');
        const tempPassword = await bcrypt.hash('TempPass123!', 10);
        
        await pool.query(
          `INSERT INTO users (email, password_hash, full_name, company_name, position, phone, email_verified)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
          [email, tempPassword, fullName, companyName, position, phone]
        );
        created++;
      }
    }
    
    res.json({ message: `Импорт завершён. Создано: ${created}, Обновлено: ${updated}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка импорта: ' + error.message });
  }
});

// Импорт продаж и баллов
router.post('/sales', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ error: 'Доступ запрещён' });
    }
    
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    let imported = 0;
    
    for (const row of data) {
      const tpName = row['ТП ФИО']?.toString().trim();
      const clientCode = row['Код клиента']?.toString();
      
      if (!tpName || !clientCode) continue;
      
      // Находим пользователя по ФИО (упрощённо)
      const userResult = await pool.query('SELECT id FROM users WHERE full_name ILIKE $1', [`%${tpName}%`]);
      if (userResult.rows.length === 0) continue;
      
      const userId = userResult.rows[0].id;
      
      // Определяем период
      const year = parseInt(row['Год']);
      const monthName = row['Месяц'];
      const monthMap = {
        'Январь': 1, 'Февраль': 2, 'Март': 3, 'Апрель': 4,
        'Май': 5, 'Июнь': 6, 'Июль': 7, 'Август': 8,
        'Сентябрь': 9, 'Октябрь': 10, 'Ноябрь': 11, 'Декабрь': 12
      };
      const month = monthMap[monthName];
      
      if (!year || !month) continue;
      
      // Создаём или получаем период
      let periodResult = await pool.query('SELECT id FROM monthly_periods WHERE year = $1 AND month = $2', [year, month]);
      let periodId;
      
      if (periodResult.rows.length === 0) {
        const insertResult = await pool.query(
          `INSERT INTO monthly_periods (year, month) VALUES ($1, $2) RETURNING id`,
          [year, month]
        );
        periodId = insertResult.rows[0].id;
      } else {
        periodId = periodResult.rows[0].id;
      }
      
      // Добавляем детальную продажу
      await pool.query(
        `INSERT INTO sales_details 
          (user_id, period_id, distributor, branch, client_code, client_name, client_address,
           supervisor_name, tp_name, document_date, year, month, product_name, quantity, points)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [
          userId, periodId, row['Дистрибьютор'], row['Филиал'], clientCode,
          row['Название клиента'], row['Адрес клиента'], row['Супервайзер ФИО'],
          tpName, row['Дата документа (отгрузки товара)'], year, month,
          row['Название товара'], row['Количество, кор'], row['Кол-во начисленных баллов']
        ]
      );
      
      // Обновляем сумму баллов в ledger
      const points = parseFloat(row['Кол-во начисленных баллов']) || 0;
      await pool.query(
        `INSERT INTO points_ledger (user_id, period_id, points_amount, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (user_id, period_id) 
         DO UPDATE SET points_amount = points_ledger.points_amount + $3, last_updated_at = NOW()`,
        [userId, periodId, points]
      );
      
      imported++;
    }
    
    res.json({ message: `Импортировано записей: ${imported}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка импорта: ' + error.message });
  }
});

module.exports = router;