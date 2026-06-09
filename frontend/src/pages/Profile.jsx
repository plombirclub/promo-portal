import { useState } from 'react';

export default function Profile({ user }) {
  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    company_name: user?.company_name || '',
    phone: user?.phone || '',
    inn_number: '',
    is_self_employed: false
  });
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage('Профиль успешно обновлен!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Профиль</h1>
      
      {message && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">{message}</div>}
      
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow max-w-2xl">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
            <input type="text" value={formData.full_name} onChange={(e) => setFormData({...formData, full_name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Компания (Дистрибьютор)</label>
            <input type="text" value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ИНН</label>
            <input type="text" value={formData.inn_number} onChange={(e) => setFormData({...formData, inn_number: e.target.value})} className="w-full px-4 py-2 border rounded-lg" />
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="self_employed" checked={formData.is_self_employed} onChange={(e) => setFormData({...formData, is_self_employed: e.target.checked})} className="w-4 h-4" />
            <label htmlFor="self_employed" className="text-sm text-gray-700">Я самозанятый</label>
          </div>

          {formData.is_self_employed && (
            <div className="p-4 bg-yellow-50 rounded-lg text-sm text-yellow-800">
              Для обмена баллов на деньги загрузите справку КНД 1122035 в разделе документов.
            </div>
          )}
        </div>
        
        <button type="submit" className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Сохранить изменения</button>
      </form>
    </div>
  );
}