import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout({ user, onLogout }) {
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Главная' },
    { path: '/profile', label: 'Профиль' },
    { path: '/rewards', label: 'Каталог призов' },
    { path: '/analytics', label: 'Аналитика' },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ path: '/admin', label: 'Админ-панель' });
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-blue-600 text-white flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold">ЧИСТАЯ ЛИНИЯ</h1>
          <p className="text-sm text-blue-200 mt-1">Программа мотивации 2026</p>
        </div>
        
        <nav className="flex-1 px-4">
          {menuItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-4 py-3 rounded-lg mb-2 transition ${
                location.pathname === item.path
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-blue-700">
          <div className="mb-3">
            <p className="text-sm text-blue-200">{user?.email}</p>
            <p className="text-xs text-blue-300">{user?.full_name}</p>
          </div>
          <button
            onClick={onLogout}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm transition"
          >
            Выйти
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}