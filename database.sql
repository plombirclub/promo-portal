-- Создаём базу данных
CREATE DATABASE promo_portal;
\c promo_portal;

-- Таблица пользователей
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  company_name VARCHAR(255),
  position VARCHAR(100),
  phone VARCHAR(20),
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Статус самозанятости
  is_self_employed BOOLEAN DEFAULT FALSE,
  inn_number VARCHAR(12),
  
  -- Документы (пути к файлам)
  passport_data JSONB,
  passport_photo_url VARCHAR(500),
  inn_photo_url VARCHAR(500),
  knd_1122035_url VARCHAR(500),
  
  -- Верификация
  documents_verified BOOLEAN DEFAULT FALSE,
  documents_verified_at TIMESTAMP,
  
  -- Согласия
  rules_accepted BOOLEAN DEFAULT FALSE,
  personal_data_accepted BOOLEAN DEFAULT FALSE,
  newsletter_accepted BOOLEAN DEFAULT FALSE,
  email_verified BOOLEAN DEFAULT FALSE,
  first_login_completed BOOLEAN DEFAULT FALSE,
  
  -- Банковские данные (только для самозанятых)
  bank_card_number VARCHAR(20),
  bank_card_holder_name VARCHAR(255),
  bank_bik VARCHAR(9),
  
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Периоды (месяцы)
CREATE TABLE monthly_periods (
  id SERIAL PRIMARY KEY,
  year INT NOT NULL,
  month INT NOT NULL,
  participation_deadline DATE,
  activation_deadline DATE,
  activation_date DATE,
  UNIQUE(year, month)
);

-- Согласие на участие
CREATE TABLE user_participation_consent (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  period_id INT REFERENCES monthly_periods(id),
  consent_given BOOLEAN NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period_id)
);

-- Активация баллов
CREATE TABLE user_points_activation (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  period_id INT REFERENCES monthly_periods(id),
  activated BOOLEAN NOT NULL,
  submitted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, period_id)
);

-- Журнал баллов
CREATE TABLE points_ledger (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  period_id INT REFERENCES monthly_periods(id),
  points_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  activated_at TIMESTAMP,
  UNIQUE(user_id, period_id)
);

-- Детализированные продажи
CREATE TABLE sales_details (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  period_id INT REFERENCES monthly_periods(id),
  
  distributor VARCHAR(255),
  branch VARCHAR(255),
  client_code VARCHAR(50),
  client_name VARCHAR(255),
  client_address TEXT,
  supervisor_name VARCHAR(255),
  supervisor_code VARCHAR(50),
  tp_name VARCHAR(255),
  tp_code VARCHAR(50),
  
  document_date DATE,
  year INT,
  month INT,
  product_name VARCHAR(255),
  quantity DECIMAL(10,2),
  points DECIMAL(10,2),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Награды
CREATE TABLE rewards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  points_cost INT NOT NULL,
  type VARCHAR(20) NOT NULL,
  image_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Заявки на награды
CREATE TABLE reward_orders (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  reward_id INT REFERENCES rewards(id),
  
  status VARCHAR(30) DEFAULT 'placed',
  
  -- Для денежных выплат
  bank_card_number VARCHAR(20),
  bank_card_holder_name VARCHAR(255),
  bank_bik VARCHAR(9),
  
  -- Для цифровых товаров
  digital_content VARCHAR(500),
  
  points_deducted INT NOT NULL,
  admin_confirmed_at TIMESTAMP,
  fulfilled_at TIMESTAMP,
  rejection_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Статические страницы
CREATE TABLE content_pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_points_ledger_user_period ON points_ledger(user_id, period_id);
CREATE INDEX idx_reward_orders_user ON reward_orders(user_id);
CREATE INDEX idx_sales_details_user_period ON sales_details(user_id, period_id);

-- Создаём админа по умолчанию
INSERT INTO users (email, password_hash, full_name, role, email_verified, first_login_completed)
VALUES ('admin@promochl.ru', '$2a$10$XQ5f6Q5f6Q5f6Q5f6Q5f6OxJzKxJzKxJzKxJzKxJzKxJzKxJzKx', 'Администратор', 'admin', TRUE, TRUE);

-- Создаём тестового пользователя
INSERT INTO users (email, password_hash, full_name, company_name, position, role, email_verified, first_login_completed)
VALUES ('user@test.ru', '$2a$10$XQ5f6Q5f6Q5f6Q5f6Q5f6OxJzKxJzKxJzKxJzKxJzKxJzKxJzKx', 'Иванов Иван Иванович', 'Торг-Сервис', 'Торговый представитель', 'user', TRUE, TRUE);

-- Добавляем тестовые награды
INSERT INTO rewards (name, description, points_cost, type, is_active) VALUES
('Сертификат OZON 1000₽', 'Электронный сертификат на 1000 рублей', 1000, 'digital', TRUE),
('Сертификат Wildberries 3000₽', 'Электронный сертификат на 3000 рублей', 3000, 'digital', TRUE),
('Деньги на карту (самозанятые)', 'Вывод денежных средств на банковскую карту', 5000, 'money', TRUE);

-- Добавляем статические страницы
INSERT INTO content_pages (slug, title, content) VALUES
('conditions', 'Условия акции', '<h2>Условия программы мотивации "Чистая Линия" 2026</h2><p>Текст условий...</p>'),
('materials', 'Материалы', '<h2>Обучающие материалы</h2><p>Текст материалов...</p>'),
('products', 'Продукция Чистая Линия', '<h2>Продукция</h2><p>Информация о товарах...</p>'),
('faq', 'Частые вопросы', '<h2>FAQ</h2><p>Ответы на вопросы...</p>'),
('instructions', 'Инструкция для участников', '<h2>Инструкция</h2><p>Пошаговая инструкция...</p>');