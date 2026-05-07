import { useState, useRef, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Agent from './pages/Agent';
import Reports from './pages/Reports';
import OpenRank from './pages/OpenRank';
import HiveCompare from './pages/HiveCompare';
import AnnualReport from './pages/AnnualReport';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import UsersAdmin from './pages/UsersAdmin';
import NotFound from './pages/NotFound';
import RequireAuth from './components/RequireAuth';
import GuestOnly from './components/GuestOnly';
import BackToTop from './components/BackToTop';
import ScrollToTop from './components/ScrollToTop';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/openrank', label: 'OpenRank', icon: '◈' },
  { to: '/hive-compare', label: 'Hive 对比', icon: '⬢' },
  { to: '/annual', label: '年报数据', icon: '⊞' },
  { to: '/agent', label: 'AI Agent', icon: '⬡' },
  { to: '/reports', label: 'Reports', icon: '▤' },
];

const ADMIN_NAV_ITEMS = [
  { to: '/admin/users', label: '用户管理', icon: '◐' },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? '切换到浅色模式' : '切换到暗色模式'}
      aria-label="切换主题"
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-black/5 transition-colors text-[var(--apple-text-secondary)]"
    >
      <span className="text-base">{isDark ? '☀' : '☾'}</span>
      <span>{isDark ? '浅色模式' : '暗色模式'}</span>
    </button>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!user) return null;

  const displayName = user.full_name || user.username;
  const initial = (displayName || '?').slice(0, 1).toUpperCase();

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  const handleProfile = () => {
    setOpen(false);
    navigate('/profile');
  };

  const handleUsers = () => {
    setOpen(false);
    navigate('/admin/users');
  };

  return (
    <div ref={wrapperRef} className="relative px-3 pb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-black/5 transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-[var(--apple-blue)] text-white text-xs font-semibold flex items-center justify-center">
          {initial}
        </span>
        <span className="flex-1 text-left text-sm font-medium truncate">{displayName}</span>
        <span className="text-xs text-[var(--apple-text-secondary)]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="absolute left-3 right-3 bottom-full mb-2 bg-white rounded-lg shadow-lg border border-[var(--apple-border)] py-1 z-10">
          <button
            type="button"
            onClick={handleProfile}
            className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
          >
            个人中心
          </button>
          {user.is_admin && (
            <button
              type="button"
              onClick={handleUsers}
              className="w-full text-left px-3 py-2 text-sm hover:bg-black/5"
            >
              用户管理
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-[var(--apple-red)] hover:bg-black/5"
          >
            退出登录
          </button>
        </div>
      )}
    </div>
  );
}

function Sidebar() {
  const { user } = useAuth();
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white/80 backdrop-blur-xl border-r border-[var(--apple-border)] flex flex-col z-50 no-print">
      <div className="px-5 py-6">
        <h1 className="text-lg font-semibold tracking-tight">Report Agent</h1>
        <p className="text-xs text-[var(--apple-text-secondary)] mt-0.5">数据洞察平台</p>
      </div>
      <nav className="flex-1 px-3 overflow-y-auto">
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                isActive
                  ? 'bg-[var(--apple-blue)] text-white'
                  : 'text-[var(--apple-text)] hover:bg-black/5'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        {user?.is_admin && (
          <>
            <p className="text-[10px] text-[var(--apple-text-secondary)] mt-3 mb-1 ml-3 uppercase tracking-wider">
              管理
            </p>
            {ADMIN_NAV_ITEMS.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all mb-0.5 ${
                    isActive
                      ? 'bg-[var(--apple-blue)] text-white'
                      : 'text-[var(--apple-text)] hover:bg-black/5'
                  }`
                }
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </>
        )}
      </nav>
      <div className="px-3 pt-1">
        <ThemeToggle />
      </div>
      <UserMenu />
      <div className="px-5 py-3 border-t border-[var(--apple-border)]">
        <p className="text-[10px] text-[var(--apple-text-secondary)]">Powered by DeepSeek R1</p>
      </div>
    </aside>
  );
}

function MainLayout({ children }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="ml-56 flex-1 p-8">{children}</main>
      <BackToTop />
    </div>
  );
}

function AdminOnly({ children }) {
  const { user } = useAuth();
  // 非管理员展示 404；用 MainLayout 包裹以保留侧边栏与导航上下文
  if (!user?.is_admin) {
    return <MainLayout><NotFound /></MainLayout>;
  }
  return children;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
      {/* 仅未登录访客可访问；已登录用户跳首页 */}
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      {/* 受保护页面（需要登录） */}
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout><Dashboard /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/openrank"
        element={
          <RequireAuth>
            <MainLayout><OpenRank /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/hive-compare"
        element={
          <RequireAuth>
            <MainLayout><HiveCompare /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/annual"
        element={
          <RequireAuth>
            <MainLayout><AnnualReport /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/agent"
        element={
          <RequireAuth>
            <MainLayout><Agent /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/reports"
        element={
          <RequireAuth>
            <MainLayout><Reports /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <MainLayout><Profile /></MainLayout>
          </RequireAuth>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAuth>
            <AdminOnly>
              <MainLayout><UsersAdmin /></MainLayout>
            </AdminOnly>
          </RequireAuth>
        }
      />

      {/* 兜底 404 */}
      <Route
        path="*"
        element={
          <RequireAuth>
            <MainLayout><NotFound /></MainLayout>
          </RequireAuth>
        }
      />
      </Routes>
    </>
  );
}
