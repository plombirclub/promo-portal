const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:291008@localhost:5432/promo_portal' 
});

async function importData() {
  try {
    // Генерируем хеш пароля
    const password = 'TempPass123!';
    const hash = await bcrypt.hash(password, 10);
    console.log('✅ Хеш пароля:', hash);

    // Обновляем пароли пользователям
    await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email IN ('promohl2026@gmail.com', 'mihail.ic.chl@gmail.com')",
      [hash]
    );
    console.log('✅ Пароли обновлены');

    // Читаем Excel файл с продажами
    const salesFile = path.join(__dirname, '../загрузка продаж и баллов на сайт промо ЧЛ.xlsx');
    const workbook = XLSX.readFile(salesFile);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const salesData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`📊 Загружено ${salesData.length - 1} записей о продажах`);

    // Пропускаем заголовок (первая строка)
    for (let i = 1; i < salesData.length; i++) {
      const row = salesData[i];
      
      // row[14] - Кол-во начисленных баллов ТП
      // row[15] - Кол-во начисленных баллов СВ
      // row[9] - Дата документа
      // row[11] - Месяц
      // row[7] - ТП ФИО
      // row[3] - ТП email (нужно найти)
      
      const tpEmail = row[3]; // Название клиента - это не email, нужно искать по ФИО
      const tpName = row[7]; // ТП ФИО
      const salesDate = row[9];
      const month = row[11];
      const tpPoints = parseFloat(row[14]) || 0;
      const svPoints = parseFloat(row[15]) || 0;

      // Определяем email по ФИО
      let userEmail = '';
      if (tpName === 'Иванов Иван Иванович') {
        userEmail = 'promohl2026@gmail.com';
      } else if (tpName === 'Петров Петр Петрович') {
        userEmail = 'mihail.ic.chl@gmail.com';
      }

      if (!userEmail) {
        console.log(`⚠️  Не найден пользователь для: ${tpName}`);
        continue;
      }

      // Вставляем продажу
      await pool.query(`
        INSERT INTO sales_details (user_id, sale_date, month, product_name, quantity, points)
        VALUES (
          (SELECT id FROM users WHERE email = $1),
          $2, $3, $4, $5, $6
        )
      `, [userEmail, salesDate, month, row[12], parseFloat(row[13]) || 0, tpPoints]);
    }

    console.log('✅ Данные о продажах загружены');
    
    // Обновляем баллы в points_ledger
    await pool.query(`
      INSERT INTO points_ledger (user_id, period_id, available_points, total_points)
      SELECT 
        u.id,
        mp.id,
        COALESCE(SUM(sd.points), 0),
        COALESCE(SUM(sd.points), 0)
      FROM users u
      CROSS JOIN monthly_periods mp
      LEFT JOIN sales_details sd ON sd.user_id = u.id AND EXTRACT(MONTH FROM sd.sale_date) = mp.month_num
      WHERE u.email IN ('promohl2026@gmail.com', 'mihail.ic.chl@gmail.com')
      GROUP BY u.id, mp.id
      ON CONFLICT (user_id, period_id) 
      DO UPDATE SET 
        available_points = EXCLUDED.available_points,
        total_points = EXCLUDED.total_points
    `);

    console.log('✅ Баллы обновлены в points_ledger');
    console.log('🎉 Импорт завершен успешно!');
    
    process.exit();
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

importData();