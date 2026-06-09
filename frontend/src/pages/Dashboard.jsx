import { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard({ user }) {
  const [balance, setBalance] = useState({ available_points: 0, total_points: 0 });
  const [userName, setUserName] = useState('Загрузка...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Запрашиваем актуальный профиль из API
        const profileResponse = await axios.get('http://localhost:3001/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (profileResponse.data) {
          setUserName(profileResponse.data.full_name);
        }
        
        // Запрашиваем баланс
        const balanceResponse = await axios.get('http://localhost:3001/api/analytics/balance', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        setBalance({
          available_points: parseFloat(balanceResponse.data.available_points) || 0,
          total_points: parseFloat(balanceResponse.data.total_points) || 0
        });
      } catch (error) {
        console.error('Ошибка получения данных:', error);
        setUserName(user?.full_name || 'Пользователь');
        setBalance({ available_points: 0, total_points: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="p-6">Загрузка...</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Добро пожаловать, {userName}!</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Доступные баллы</h2>
          <p className="text-4xl font-bold text-blue-600">{balance.available_points}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Всего начислено</h2>
          <p className="text-4xl font-bold text-green-600">{balance.total_points}</p>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Подтверди участие и баллы</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="font-medium">Согласие на участие (Май)</p>
            <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Дать согласие</button>
          </div>
          <div className="p-4 border border-gray-200 rounded-lg">
            <p className="font-medium">Активация баллов (Апрель)</p>
            <button className="mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Активировать</button>
          </div>
        </div>
      </div>
    </div>
  );
}