const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:291008@localhost:5432/promo_portal' 
});

async function fixPasswords() {
  try {
    const password = 'TempPass123!';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('✅ Сгенерирован хеш:', hash);
    
    const result = await pool.query(
      "UPDATE users SET password_hash = $1",
      [hash]
    );
    
    console.log(`✅ Обновлено пользователей: ${result.rowCount}`);
    
    // Проверяем результат
    const users = await pool.query("SELECT email, LEFT(password_hash, 30) FROM users");
    console.log('\n Список пользователей:');
    users.rows.forEach(u => {
      console.log(`  ${u.email}: ${u.left}`);
    });
    
    // Тестируем вход
    const testHash = await bcrypt.compare(password, hash);
    console.log(`\n🧪 Тест пароля: ${testHash ? '✅ РАБОТАЕТ' : '❌ НЕ РАБОТАЕТ'}`);
    
    process.exit();
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

fixPasswords();