const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:291008@localhost:5432/promo_portal' 
});

async function importSVPoints() {
  try {
    const filePath = path.join(__dirname, '../загрузка продаж и баллов на сайт промо ЧЛ.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`📊 Загружено ${data.length - 1} записей`);

    // Очищаем старые баллы Петрова
    await pool.query(`
      DELETE FROM points_ledger 
      WHERE user_id = (SELECT id FROM users WHERE email = 'mihail.ic.chl@gmail.com')
    `);
    console.log('🗑️  Старые баллы Петрова удалены');

    let totalSVPoints = 0;
    let processedRows = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Индексы колонок из Excel:
      // [5] - Супервайзер ФИО
      // [10] - Год
      // [11] - Месяц
      // [15] - Кол-во начисленных баллов СВ (колонка 16)
      
      const svName = row[5]; // Супервайзер ФИО
      const year = parseInt(row[10]) || 2026;
      const monthName = row[11];
      const svPoints = parseFloat(row[15]) || 0; // Колонка 16!

      // Проверяем, что это Петров И есть баллы
      if (svName !== 'Петров Петр Петрович') {
        continue;
      }
      
      if (svPoints === 0 || isNaN(svPoints)) {
        continue;
      }

      processedRows++;

      // Преобразуем название месяца в номер
      const monthNames = {
        'Январь': 1, 'Февраль': 2, 'Март': 3, 'Апрель': 4,
        'Май': 5, 'Июнь': 6, 'Июль': 7, 'Август': 8,
        'Сентябрь': 9, 'Октябрь': 10, 'Ноябрь': 11, 'Декабрь': 12
      };
      const monthNum = monthNames[monthName] || 6;

      // Получаем user_id Петрова
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        ['mihail.ic.chl@gmail.com']
      );
      
      if (userResult.rows.length === 0) {
        console.log('❌ Пользователь mihail.ic.chl@gmail.com не найден!');
        continue;
      }
      const userId = userResult.rows[0].id;

      // Получаем period_id
      let periodResult = await pool.query(
        'SELECT id FROM monthly_periods WHERE year = $1 AND month = $2',
        [year, monthNum]
      );
      
      let periodId = null;
      if (periodResult.rows.length === 0) {
        const insertPeriod = await pool.query(
          'INSERT INTO monthly_periods (year, month) VALUES ($1, $2) RETURNING id',
          [year, monthNum]
        );
        periodId = insertPeriod.rows[0].id;
        console.log(`📅 Создан период: ${year}-${monthNum}`);
      } else {
        periodId = periodResult.rows[0].id;
      }

      // Вставляем баллы
      await pool.query(`
        INSERT INTO points_ledger (user_id, period_id, points_amount)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, period_id) 
        DO UPDATE SET points_amount = points_ledger.points_amount + $3
      `, [userId, periodId, svPoints]);

      totalSVPoints += svPoints;
      
      if (processedRows <= 5) {
        console.log(`✅ Строка ${i}: ${svName} - ${monthName} ${year} - ${svPoints} баллов`);
      }
    }

    console.log(`\n📊 Обработано строк: ${processedRows}`);
    console.log(`✅ Всего баллов Петрова (СВ): ${totalSVPoints}`);
    
    // Проверяем результат
    const checkResult = await pool.query(`
      SELECT u.email, u.full_name, pl.points_amount, mp.year, mp.month
      FROM points_ledger pl
      JOIN users u ON pl.user_id = u.id
      JOIN monthly_periods mp ON pl.period_id = mp.id
      WHERE u.email = 'mihail.ic.chl@gmail.com'
      ORDER BY mp.year, mp.month
    `);
    
    console.log('\n📊 Баллы Петрова в базе:');
    if (checkResult.rows.length === 0) {
      console.log('  ❌ Нет записей');
    } else {
      checkResult.rows.forEach(row => {
        console.log(`  ${row.full_name}: ${row.points_amount} баллов (${row.year}-${row.month})`);
      });
    }
    
    console.log('\n🎉 Готово!');
    process.exit();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error);
    process.exit(1);
  }
}

importSVPoints();