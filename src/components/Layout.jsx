import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const navItems = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/food', label: 'Food', icon: FoodIcon },
  { path: '/water', label: 'Water', icon: WaterIcon },
  { path: '/goals', label: 'Goals', icon: GoalsIcon },
  { path: '/weight', label: 'Weight', icon: WeightIcon },
  { path: '/household', label: 'Household', icon: HouseholdIcon },
];

export default function Layout({ children }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    api.get('/notifications')
      .then(notifs => setUnreadCount(notifs.filter(n => !n.is_read).length))
      .catch(() => {});
  }, [user]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 fixed inset-y-0">
        <div className="px-6 py-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <div>
              <h1 className="font-heading font-bold text-gray-900 text-sm leading-tight">SnuggleState</h1>
              <p className="text-xs text-green-600 font-medium">Lean</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-green-50 text-green-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon active={isActive} />
                  <span>{label}</span>
                  {label === 'Household' && unreadCount > 0 && (
                    <span className="ml-auto bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500">
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
              {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <span className="truncate">{user?.name}</span>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64 pb-20 md:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 flex z-50">
        {navItems.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center py-2 text-xs font-medium transition-colors relative ${
                isActive ? 'text-green-600' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} />
                <span className="mt-0.5">{label}</span>
                {label === 'Household' && unreadCount > 0 && (
                  <span className="absolute top-1 right-1/2 translate-x-3 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function HomeIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}
function FoodIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.87c1.355 0 2.697.055 4.024.165C17.155 8.51 18 9.473 18 10.608v2.513m-3-4.87v-1.5m-6 1.5v-1.5m0 1.5c.342 0 .677.009 1.009.027m12.982 0A48.108 48.108 0 0012 7.5a48.108 48.108 0 00-9.01 1.275M4.5 21l1.5-7.5M19.5 21l-1.5-7.5M9 15l.75-3.75M15 15l-.75-3.75" />
    </svg>
  );
}
function WaterIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75c-3.75 5.25-5.25 8.25-5.25 11.25a5.25 5.25 0 0010.5 0c0-3-1.5-6-5.25-11.25z" />
    </svg>
  );
}
function GoalsIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  );
}
function WeightIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 100 18A9 9 0 0012 3zm0 0v2m0 14v2m-8-8H2m18 0h2M5.636 5.636L4.22 4.222m15.558 15.558l-1.414-1.414M5.636 18.364L4.22 19.778M19.778 4.222l-1.414 1.414M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9zm0 2.25a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
    </svg>
  );
}
function HouseholdIcon({ active }) {
  return (
    <svg className={`w-5 h-5 ${active ? 'text-green-600' : 'text-gray-400'}`} fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}
