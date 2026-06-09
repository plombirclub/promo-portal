import { useState } from 'react';

export default function AdminPanel() {
  const [message, setMessage] = useState('');

  const handleFileUpload = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      setMessage(`Файл "${file.name}" успешно загружен для импорта ${type === 'users' ? 'пользователей' : 'продаж'}!`);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Админ-панель</h1>
      
      {message && <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">{message}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Импорт пользователей</h2>
          <p className="text-sm text-gray-600 mb-4">Загрузите Excel файл с данными пользователей (ФИО, email, телефон, компания).</p>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'users')} className="w-full px-4 py-2 border rounded-lg" />
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Импорт продаж и баллов</h2>
          <p className="text-sm text-gray-600 mb-4">Загрузите Excel файл с детализацией продаж (Дистрибьютор, ТП ФИО, Товар, Кол-во, Баллы).</p>
          <input type="file" accept=".xlsx,.xls" onChange={(e) => handleFileUpload(e, 'sales')} className="w-full px-4 py-2 border rounded-lg" />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mt-6">
        <h2 className="text-xl font-semibold mb-4">Управление заявками</h2>
        <p className="text-gray-600">Здесь будет таблица заявок на обмен баллов со статусами и кнопками подтверждения.</p>
      </div>
    </div>
  );
}