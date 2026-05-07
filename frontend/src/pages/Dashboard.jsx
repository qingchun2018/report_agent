import { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { apiJson } from '../api/client';
import PageSkeleton from '../components/Skeleton';

const COLORS = {
  critical: '#ff3b30', high: '#ff9500', medium: '#ffcc00', low: '#34c759',
  open: '#ff3b30', in_progress: '#ff9500', fixed: '#34c759', wont_fix: '#86868b',
};
const PIE_COLORS = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0071e3', '#5856d6'];

const SEV_LABELS = { critical: '严重', high: '高危', medium: '中危', low: '低危' };
const STATUS_LABELS = { open: '待处理', in_progress: '处理中', fixed: '已修复', wont_fix: '不修复' };

function Card({ title, value, subtitle, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
      <p className="text-xs font-medium text-[var(--apple-text-secondary)] uppercase tracking-wide">{title}</p>
      <p className={`text-3xl font-bold mt-1 ${color || 'text-[var(--apple-text)]'}`}>{value ?? '-'}</p>
      {subtitle && <p className="text-xs text-[var(--apple-text-secondary)] mt-1">{subtitle}</p>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [trend, setTrend] = useState([]);
  const [trending, setTrending] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const safeJson = (url) =>
      apiJson(url, { silent: true }).catch((e) => {
        console.warn(`Failed to fetch ${url}:`, e);
        return null;
      });

    Promise.all([
      safeJson('/api/dashboard'),
      safeJson('/api/vulns/trend?days=30'),
      safeJson('/api/github/trending?days=7'),
      safeJson('/api/github/anomalies'),
    ]).then(([dashboard, trendData, trendingData, anomalyData]) => {
      setData(dashboard || { summary: {}, by_severity: [], by_status: [], by_package: [] });
      setTrend(trendData?.data || []);
      setTrending(trendingData?.data || []);
      setAnomalies(anomalyData?.data || []);
      setLoading(false);
      setError(!dashboard ? '无法加载仪表盘数据，请确认登录态或后端可用性' : null);
    });
  }, []);

  if (loading) return <PageSkeleton />;

  const { summary = {}, by_severity = [], by_status = [], by_package = [] } = data || {};

  return (
    <div className="space-y-6 max-w-7xl">
      <h2 className="text-2xl font-bold">仪表盘</h2>

      {error && (
        <div className="bg-[var(--apple-red)]/10 border border-[var(--apple-red)]/30 rounded-2xl p-4">
          <p className="text-sm text-[var(--apple-red)]">{error}</p>
        </div>
      )}

      {anomalies.length > 0 && (
        <div className="bg-[var(--apple-orange)]/10 border border-[var(--apple-orange)]/30 rounded-2xl p-4">
          <p className="font-semibold text-[var(--apple-orange)] text-sm">趋势异常预警</p>
          {anomalies.map((a, i) => (
            <p key={i} className="text-sm mt-1">
              <span className="font-semibold">{a.repo}</span> — Star 增速异常：
              日均 {a.avg_daily_before} → {a.avg_daily_recent}（{a.growth_ratio}x）
            </p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="漏洞总数" value={summary.total_vulns} />
        <Card title="待处理" value={summary.open_vulns} color="text-[var(--apple-red)]" />
        <Card title="严重级别" value={summary.critical_vulns} color="text-[var(--apple-red)]" />
        <Card title="本周新增" value={summary.new_this_week} color="text-[var(--apple-blue)]" subtitle={`本月新增：${summary.new_this_month ?? '-'}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
          <h3 className="text-sm font-semibold mb-4">漏洞趋势（近 30 天）</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="var(--apple-blue)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
          <h3 className="text-sm font-semibold mb-4">按严重级别分布</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={by_severity}
                dataKey="count"
                nameKey="severity"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ severity, count }) => `${SEV_LABELS[severity] || severity}: ${count}`}
              >
                {by_severity.map((entry, i) => (
                  <Cell key={i} fill={COLORS[entry.severity] || PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, SEV_LABELS[n] || n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
          <h3 className="text-sm font-semibold mb-4">受影响最多的组件 Top</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={by_package} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="package" type="category" tick={{ fontSize: 11 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--apple-blue)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
          <h3 className="text-sm font-semibold mb-4">按处理状态分布</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={by_status}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ status, count }) => `${STATUS_LABELS[status] || status}: ${count}`}
              >
                {by_status.map((entry, i) => (
                  <Cell key={i} fill={COLORS[entry.status] || PIE_COLORS[i]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v, STATUS_LABELS[n] || n]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
        <h3 className="text-sm font-semibold mb-4">GitHub 热门项目（近 7 天）</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--apple-border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">项目</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">语言</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">Stars</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">新增</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">日均</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">描述</th>
              </tr>
            </thead>
            <tbody>
              {trending.map((repo, i) => (
                <tr key={i} className="border-b border-[var(--apple-border)]/50 hover:bg-black/[0.02] transition-colors">
                  <td className="py-2.5 px-3 font-medium">{repo.owner}/{repo.repo}</td>
                  <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-black/5 rounded-full text-xs">{repo.language}</span></td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{repo.stars?.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[var(--apple-green)] font-medium">+{repo.stars_gained?.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{repo.avg_daily}</td>
                  <td className="py-2.5 px-3 text-[var(--apple-text-secondary)] truncate max-w-[200px]">{repo.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
