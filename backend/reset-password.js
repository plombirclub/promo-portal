const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:291008@localhost:5432/promo_portal' 
});

async function resetPasswords() {
  const password = 'TempPass123!';
  const hash = await bcrypt.hash(password, 10);
  
  console.log('Новый хеш:', hash);
  
  await pool.query(
    "UPDATE users SET password_hash = $1 WHERE email IN ('admin@promochl.ru', 'user@test.ru')",
    [hash]
  );
  
  console.log('✅ Пароли обновлены для обоих пользователей');
  process.exit();
}

resetPasswords();