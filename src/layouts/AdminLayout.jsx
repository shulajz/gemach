import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from '../firebase/auth.js';
import { useAuth } from '../hooks/useAuth.js';
import Button from '../components/Button.jsx';

const navItems = [
  { to: '/admin/dashboard', label: 'לוח בקרה' },
  { to: '/admin/inventory', label: 'ניהול מלאי' },
  { to: '/admin/orders', label: 'ניהול הזמנות' },
  { to: '/admin/opening-schedule', label: 'לו״ז פתיחת גמ״ח' },
  { to: '/admin/calendar', label: 'לוח אירועים' },
  { to: '/admin/order-conflicts', label: 'בקרת עומסים' },
  { to: '/admin/reports', label: 'דוחות' },
  { to: '/admin/gallery', label: 'גלריית תמונות' },
  { to: '/admin/important-info', label: 'הנחיות חשובות' },
];

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50/80" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white shadow-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2.5 text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="תפריט"
              aria-expanded={menuOpen}
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <NavLink
              to="/admin/dashboard"
              className="rounded-xl px-2 py-1 text-base font-bold text-gray-900 transition-colors hover:bg-primary-50 hover:text-primary-700 sm:text-lg"
            >
              ניהול גמ״ח
            </NavLink>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-lg bg-gray-100 px-3 py-1.5 text-sm text-gray-600 md:inline">
              {user?.email}
            </span>
            <Button variant="secondary" onClick={handleLogout} ariaLabel="יציאה">
              יציאה
            </Button>
          </div>
        </div>
        <nav
          className={`max-h-[70vh] overflow-y-auto overscroll-contain border-t border-gray-100 bg-white md:max-h-none md:overflow-visible md:border-t-0 ${menuOpen ? 'block' : 'hidden md:block'}`}
          aria-label="ניווט מנהל"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-0 md:flex-row md:gap-1 md:px-4 md:py-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-4 py-3 text-sm font-semibold transition-all md:my-1 ${
                    isActive ? 'bg-primary-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>
      <main className="admin-content-layer mx-auto max-w-6xl px-3 py-4 sm:px-4 md:py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
