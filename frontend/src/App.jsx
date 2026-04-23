import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Agent from './pages/Agent';
import Reports from './pages/Reports';
import OpenRank from './pages/OpenRank';
import HiveCompare from './pages/HiveCompare';
import AnnualReport from './pages/AnnualReport';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: '◉' },
  { to: '/openrank', label: 'OpenRank', icon: '◈' },
  { to: '/hive-compare', label: 'Hive 对比', icon: '⬢' },
  { to: '/annual', label: '年报数据', icon: '⊞' },
  { to: '/agent', label: 'AI Agent', icon: '⬡' },
  { to: '/reports', label: 'Reports', icon: '▤' },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-white/80 backdrop-blur-xl border-r border-[var(--apple-border)] flex flex-col z-50">
      <div className="px-5 py-6">
        <h1 className="text-lg font-semibold tracking-tight">Report Agent</h1>
        <p className="text-xs text-[var(--apple-text-secondary)] mt-0.5">数据洞察平台</p>
      </div>
      <nav className="flex-1 px-3">
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
      </nav>
      <div className="px-5 py-4 border-t border-[var(--apple-border)]">
        <p className="text-[10px] text-[var(--apple-text-secondary)]">Powered by DeepSeek R1</p>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-56 flex-1 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/openrank" element={<OpenRank />} />
            <Route path="/hive-compare" element={<HiveCompare />} />
            <Route path="/annual" element={<AnnualReport />} />
            <Route path="/agent" element={<Agent />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
