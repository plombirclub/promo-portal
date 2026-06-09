const { Pool } = require('pg');
const XLSX = require('xlsx');
const path = require('path');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:291008@localhost:5432/promo_portal' 
});

async function importSales() {
  try {
    const filePath = path.join(__dirname, '../загрузка продаж и баллов на сайт промо ЧЛ.xlsx');
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    console.log(`📊 Загружено ${data.length - 1} записей`);

    // Сначала очистим старые данные для этих пользователей
    await pool.query(`
      DELETE FROM sales_details 
      WHERE user_id IN (
        SELECT id FROM users WHERE email IN ('promohl2026@gmail.com', 'mihail.ic.chl@gmail.com')
      )
    `);
    console.log('🗑️  Старые данные удалены');

    let inserted = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const tpName = row[7]; // ТП ФИО
      const documentDate = row[9]; // Дата документа
      const year = parseInt(row[10]) || 2026; // Год
      const monthName = row[11]; // Месяц (название: "Июнь")
      const productName = row[12]; // Название товара
      const quantity = parseFloat(row[13]) || 0;
      const points = parseFloat(row[14]) || 0;

      // Определяем email по ФИО
      let userEmail = '';
      if (tpName === 'Иванов Иван Иванович') {
        userEmail = 'promohl2026@gmail.com';
      } else if (tpName === 'Петров Петр Петрович') {
        userEmail = 'mihail.ic.chl@gmail.com';
      }

      if (!userEmail) {
        continue;
      }

      // Преобразуем дату из Excel
      let formattedDate = null;
      if (documentDate) {
        if (typeof documentDate === 'object' && documentDate instanceof Date) {
          formattedDate = documentDate.toISOString().split('T')[0];
        } else {
          const parts = documentDate.toString().split('.');
          if (parts.length === 3) {
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
      }

      // Преобразуем название месяца в номер
      const monthNames = {
        'Январь': 1, 'Февраль': 2, 'Март': 3, 'Апрель': 4,
        'Май': 5, 'Июнь': 6, 'Июль': 7, 'Август': 8,
        'Сентябрь': 9, 'Октябрь': 10, 'Ноябрь': 11, 'Декабрь': 12
      };
      const monthNum = monthNames[monthName] || 6;

      // Получаем user_id
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [userEmail]
      );
      
      if (userResult.rows.length === 0) {
        continue;
      }
      
      const userId = userResult.rows[0].id;

      // Получаем period_id (столбец называется month, а не month_num)
      let periodResult = await pool.query(
        'SELECT id FROM monthly_periods WHERE year = $1 AND month = $2',
        [year, monthNum]
      );
      
      let periodId = null;
      if (periodResult.rows.length === 0) {
        // Создаём период если нет
        const insertPeriod = await pool.query(
          'INSERT INTO monthly_periods (year, month) VALUES ($1, $2) RETURNING id',
          [year, monthNum]
        );
        periodId = insertPeriod.rows[0].id;
      } else {
        periodId = periodResult.rows[0].id;
      }

      // Вставляем продажу (без ON CONFLICT, так как уже удалили старые)
      await pool.query(`
        INSERT INTO sales_details (
          user_id, period_id, document_date, year, month, 
          product_name, quantity, points, tp_name
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        userId,
        periodId,
        formattedDate,
        year,
        monthNum,
        productName,
        quantity,
        points,
        tpName
      ]);
      
      inserted++;
      
      if (inserted % 10 === 0) {
        console.log(`✅ Вставлено ${inserted} из ${data.length - 1}`);
      }
    }

    console.log(`\n✅ Вставлено продаж: ${inserted}`);

    // Обновляем баллы (нужно проверить структуру points_ledger)
    console.log('\n⏳  Обновление баллов...');
    
    process.exit();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
}

importSales();