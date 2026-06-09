const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'TempPass123!';
  const hash = await bcrypt.hash(password, 10);
  console.log('Хеш для пароля "TempPass123!":');
  console.log(hash);
}

generateHash();