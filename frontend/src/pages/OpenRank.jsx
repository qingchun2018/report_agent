import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BarChart, Bar, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { apiJson } from '../api/client';
import PageSkeleton from '../components/Skeleton';

function MetricCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-[var(--apple-border)]">
      <p className="text-xs text-[var(--apple-text-secondary)] uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-[var(--apple-text-secondary)] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function OpenRank() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const trendSectionRef = useRef(null);
  const pendingTrendScrollRef = useRef(false);

  const loadTrend = useCallback((repo, scrollToChartAfterLoad = false) => {
    pendingTrendScrollRef.current = scrollToChartAfterLoad;
    setSelectedRepo(repo);
    apiJson(`/api/openrank/trend/${encodeURIComponent(repo)}`, { silent: true })
      .then(d => setTrendData(d.data || []))
      .catch(() => setTrendData([]));
  }, []);

  useEffect(() => {
    apiJson('/api/openrank/overview', { silent: true }).then(d => {
      setData(d);
      setLoading(false);
      if (d.ranking?.length > 0) loadTrend(d.ranking[0].repo, false);
    }).catch(() => setLoading(false));
  }, [loadTrend]);

  // 用户点击「查看」后，等趋势图渲染完成再滚到图表区域
  // 注意：StrictMode 下 effect 会跑两次，cleanup 里若 cancelAnimationFrame 会把首次调度的滚动帧取消，
  // 导致永远不滚动；因此这里改用 setTimeout 且不在 cleanup 中取消（一次性滚动操作即便组件卸载也无副作用）。
  useEffect(() => {
    if (!pendingTrendScrollRef.current) return;
    if (!selectedRepo) return;
    if (trendData.length === 0) {
      pendingTrendScrollRef.current = false;
      return;
    }
    pendingTrendScrollRef.current = false;
    // 留一点时间让 ResponsiveContainer 完成宽高测量，再滚动到目标位置
    setTimeout(() => {
      trendSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }, [selectedRepo, trendData]);

  if (loading) return <PageSkeleton />;
  if (!data) return <div className="text-center py-12 text-[var(--apple-text-secondary)]">无法加载 OpenRank 数据</div>;

  const { ranking = [], top_active = [], health_scores = [], growth_leaders = [] } = data;
  const top1 = ranking[0];

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">OpenRank 指标</h2>
          <p className="text-sm text-[var(--apple-text-secondary)] mt-1">基于 X-lab OpenDigger 的开源项目评估体系</p>
        </div>
      </div>

      {/* Summary Cards */}
      {top1 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard label="Top 1 项目" value={top1.repo} sub={`OpenRank: ${top1.openrank}`} />
          <MetricCard label="最高 Activity" value={top_active[0]?.activity ?? '-'} sub={top_active[0]?.repo} />
          <MetricCard label="最佳健康度" value={`${health_scores[0]?.health ?? '-'}%`} sub={health_scores[0]?.repo} />
          <MetricCard label="增长最快" value={growth_leaders[0] ? `+${growth_leaders[0].growth_pct}%` : '-'} sub={growth_leaders[0]?.repo} />
          <MetricCard label="项目总数" value={ranking.length} sub="参与排名" />
        </div>
      )}

      {/* OpenRank Ranking Table */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
        <h3 className="text-sm font-semibold mb-4">OpenRank 排名</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--apple-border)]">
                <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">#</th>
                <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">项目</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">OpenRank</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">Activity</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">Bus Factor</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">参与者</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">新贡献者</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">PR Merged</th>
                <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">Attention</th>
                <th className="text-center py-2 px-3 font-medium text-[var(--apple-text-secondary)]">趋势</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((r, i) => (
                <tr key={i} className={`border-b border-[var(--apple-border)]/50 hover:bg-black/[0.02] transition-colors ${selectedRepo === r.repo ? 'bg-[var(--apple-blue)]/5' : ''}`}>
                  <td className="py-2.5 px-3 font-bold text-[var(--apple-text-secondary)]">{r.rank}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium">{r.owner}/</span>
                    <span className="font-semibold">{r.repo}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold tabular-nums text-[var(--apple-blue)]">{r.openrank}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{r.activity}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.bus_factor >= 8 ? 'bg-[#34c759]/15 text-[#34c759]' : r.bus_factor >= 3 ? 'bg-[#ff9500]/15 text-[#ff9500]' : 'bg-[#ff3b30]/15 text-[#ff3b30]'
                    }`}>{r.bus_factor}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{r.participants}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-[var(--apple-green)]">+{r.new_contributors}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{r.pr_merged}</td>
                  <td className="py-2.5 px-3 text-right tabular-nums">{r.attention?.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-center">
                    <button type="button" onClick={() => loadTrend(r.repo, true)}
                      className="px-2 py-0.5 text-xs bg-[var(--apple-blue)]/10 text-[var(--apple-blue)] rounded-full hover:bg-[var(--apple-blue)]/20 transition-colors">
                      查看
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trend Chart for Selected Repo */}
      {selectedRepo && trendData.length > 0 && (
        <div ref={trendSectionRef} className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)] scroll-mt-24">
          <h3 className="text-sm font-semibold mb-4">{selectedRepo} — OpenRank 趋势（12 个月）</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="openrank" stroke="#0071e3" strokeWidth={2.5} dot={{ r: 3 }} name="OpenRank" />
              <Line yAxisId="right" type="monotone" dataKey="activity" stroke="#ff9500" strokeWidth={2} dot={{ r: 2 }} name="Activity" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row: Activity Top + Health Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
          <h3 className="text-sm font-semibold mb-4">Activity Top 10</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={top_active} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="repo" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="activity" fill="#ff9500" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
          <h3 className="text-sm font-semibold mb-4">项目健康度评分</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={health_scores.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="repo" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-xl shadow-lg border text-xs">
                    <p className="font-semibold">{d.repo}</p>
                    <p>健康度：{d.health}%</p>
                    <p>Bus Factor：{d.bus_factor}</p>
                  </div>
                );
              }} />
              <Bar dataKey="health" radius={[0, 6, 6, 0]}>
                {health_scores.slice(0, 10).map((entry, i) => {
                  const color = entry.health >= 70 ? '#34c759' : entry.health >= 40 ? '#ff9500' : '#ff3b30';
                  return <Cell key={`health-${entry.repo}-${i}`} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Growth Leaders */}
      {growth_leaders.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
          <h3 className="text-sm font-semibold mb-4">OpenRank 增长排行（月环比）</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={growth_leaders}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="repo" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={55} />
              <YAxis tick={{ fontSize: 10 }} unit="%" />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-white p-3 rounded-xl shadow-lg border text-xs">
                    <p className="font-semibold">{d.repo}</p>
                    <p>增长：<span className="text-[var(--apple-green)] font-bold">+{d.growth_pct}%</span></p>
                    <p>当前：{d.current} ← 上月：{d.previous}</p>
                  </div>
                );
              }} />
              <Bar dataKey="growth_pct" fill="#34c759" radius={[6, 6, 0, 0]} name="增长率 %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
