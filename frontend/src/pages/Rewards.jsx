import { useState, useEffect } from 'react';

export default function Rewards() {
  const [rewards, setRewards] = useState([
    { id: 1, name: 'Сертификат OZON 1000₽', cost: 1000, type: 'digital' },
    { id: 2, name: 'Сертификат Wildberries 3000₽', cost: 3000, type: 'digital' },
    { id: 3, name: 'Деньги на карту (Самозанятые)', cost: 5000, type: 'money' }
  ]);

  const handleOrder = (reward) => {
    if (confirm(`Обменять баллы на "${reward.name}"?`)) {
      alert('Заявка успешно создана! Статус: Размещена');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Каталог призов</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rewards.map(reward => (
          <div key={reward.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
            <div className="h-32 bg-gray-100 rounded mb-4 flex items-center justify-center text-gray-400">Фото награды</div>
            <h3 className="text-xl font-semibold mb-2">{reward.name}</h3>
            <p className="text-2xl font-bold text-blue-600 mb-4">{reward.cost} баллов</p>
            <button onClick={() => handleOrder(reward)} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Обменять</button>
          </div>
        ))}
      </div>
    </div>
  );
}