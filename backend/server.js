require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Маршруты
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/rewards', require('./routes/rewards'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/import', require('./routes/import'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/content', require('./routes/content'));

// Базовый маршрут
app.get('/api', (req, res) => {
  res.json({ message: 'Промо-портал Чистая Линия API работает!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});