import { useState, useEffect } from 'react';

export default function Analytics() {
  const [period, setPeriod] = useState({ year: 2026, month: 6 });
  const [salesData, setSalesData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(
          `http://localhost:3001/api/analytics/my?year=${period.year}&month=${period.month}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          // Маппим данные из API в формат frontend
          const mappedData = data.map(item => ({
            product: item.product_name,
            boxes: parseInt(item.total_boxes),
            points: parseFloat(item.total_points)
          }));
          setSalesData(mappedData);
        } else {
          console.error('Ошибка загрузки аналитики:', response.status);
        }
      } catch (error) {
        console.error('Ошибка:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [period]);

  const totalBoxes = salesData.reduce((sum, item) => sum + item.boxes, 0);
  const totalPoints = salesData.reduce((sum, item) => sum + item.points, 0);

  if (loading) {
    return <div className="p-6">Загрузка...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Аналитика продаж</h1>
        <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Экспорт в Excel</button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <div className="flex gap-4 mb-6">
          <select 
            value={period.year} 
            onChange={(e) => setPeriod({...period, year: parseInt(e.target.value)})} 
            className="px-4 py-2 border rounded-lg"
          >
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
          <select 
            value={period.month} 
            onChange={(e) => setPeriod({...period, month: parseInt(e.target.value)})} 
            className="px-4 py-2 border rounded-lg"
          >
            <option value={6}>Июнь</option>
            <option value={5}>Май</option>
            <option value={4}>Апрель</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600">Всего отгружено коробок</p>
            <p className="text-3xl font-bold text-blue-600">{totalBoxes}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600">Начислено баллов</p>
            <p className="text-3xl font-bold text-green-600">{totalPoints}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Детализация по товарам</h2>
        {salesData.length === 0 ? (
          <p className="text-gray-500">Нет данных за выбранный период</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3">Товар</th>
                <th className="text-right py-3">Коробок</th>
                <th className="text-right py-3">Баллов</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((item, index) => (
                <tr key={index} className="border-b hover:bg-gray-50">
                  <td className="py-3">{item.product}</td>
                  <td className="text-right py-3">{item.boxes}</td>
                  <td className="text-right py-3">{item.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}