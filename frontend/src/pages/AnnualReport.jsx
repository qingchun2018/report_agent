import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { apiJson } from '../api/client';

const TOP_OPTIONS = [10, 50, 100];
const METRIC_COLORS = [
  '#0071e3', '#5856d6', '#ff9500', '#34c759', '#ff3b30',
  '#ffcc00', '#af52de', '#00c7be', '#ff6482', '#30b0c7',
  '#a2845e', '#64d2ff', '#e8633a', '#5ac8fa',
];

const LANG_COLORS = {
  Python: '#3572A5', JavaScript: '#f1e05a', TypeScript: '#3178c6',
  Go: '#00ADD8', Rust: '#dea584', Java: '#b07219',
  'C++': '#f34b7d', Ruby: '#701516', Swift: '#F05138',
  Kotlin: '#A97BFF', Shell: '#89e051', PHP: '#4F5D95',
};

export default function AnnualReport() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [topN, setTopN] = useState(10);
  const [ranking, setRanking] = useState([]);
  const [repoNames, setRepoNames] = useState([]);
  const [monthlyTrend, setMonthlyTrend] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRepos, setSelectedRepos] = useState([]);

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    if (selectedYear) loadRanking(selectedYear, topN);
  }, [selectedYear, topN]);

  const loadYears = async () => {
    try {
      const data = await apiJson('/api/annual/github/years', { silent: true });
      const yrs = data.data || [];
      setYears(yrs);
      if (yrs.length > 0) setSelectedYear(yrs[0]);
    } catch (e) {
      setError(e.message || '加载年份失败');
    }
  };

  const loadRanking = async (year, top) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiJson(
        `/api/annual/github/ranking?year=${year}&top=${top}`,
        { silent: true }
      );
      setRanking(data.ranking || []);
      setRepoNames(data.repo_names || []);
      setMonthlyTrend(data.monthly_trend || []);

      // 默认选中前 5 个展示趋势
      const top5 = (data.ranking || []).slice(0, 5).map(r => r.repo);
      setSelectedRepos(top5);
    } catch (e) {
      setError(e.message || '加载排名失败');
    } finally {
      setLoading(false);
    }
  };

  const toggleRepoSelect = (repo) => {
    setSelectedRepos(prev =>
      prev.includes(repo) ? prev.filter(r => r !== repo) : [...prev, repo]
    );
  };

  const fmtNum = (n) => {
    if (n == null) return '—';
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return n.toLocaleString();
  };

  const trendChartData = monthlyTrend
    .filter(d => d.month != null)
    .sort((a, b) => a.month - b.month)
    .map(d => ({
      month: `${d.month}月`,
      ...Object.fromEntries(
        selectedRepos.map(r => [r, d[r] || 0])
      ),
    }));

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">GitHub 年度排行</h2>
          <p className="text-xs text-[var(--apple-text-secondary)] mt-1">
            AI/开发者工具 · 年增 Star 排名 · Top {topN}
          </p>
        </div>
      </div>

      {/* 年份选择 */}
      <div className="flex gap-2 flex-wrap">
        {years.map(y => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all ${
              selectedYear === y
                ? 'bg-[var(--apple-blue)] text-white shadow-lg shadow-[var(--apple-blue)]/25'
                : 'bg-white border border-[var(--apple-border)] hover:bg-black/5'
            }`}
          >
            {y} 年
          </button>
        ))}
      </div>

      {/* Top N 选择 */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--apple-text-secondary)]">排名范围：</span>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-[var(--apple-border)]">
          {TOP_OPTIONS.map(n => (
            <button
              key={n}
              onClick={() => setTopN(n)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                topN === n ? 'bg-[var(--apple-blue)] text-white' : 'hover:bg-black/5'
              }`}
            >
              Top {n}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-[var(--apple-red)]/10 border border-[var(--apple-red)]/30 rounded-2xl p-4">
          <p className="text-sm text-[var(--apple-red)]">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64 text-[var(--apple-text-secondary)]">
          <p className="text-sm">加载排名数据中...</p>
        </div>
      )}

      {ranking.length > 0 && !loading && (
        <>
          {/* 排行榜表格 */}
          <div className="bg-white rounded-2xl shadow-sm border border-[var(--apple-border)] overflow-hidden">
            <div className="p-5 border-b border-[var(--apple-border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {selectedYear} 年 GitHub 项目排名 · Top {topN}
              </h3>
              <span className="text-xs text-[var(--apple-text-secondary)]">
                共 {ranking.length} 个项目
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--apple-border)] bg-[var(--apple-bg)]">
                    <th className="text-center py-3 px-2 font-medium text-[var(--apple-text-secondary)]">#</th>
                    <th className="text-left py-3 px-3 font-medium text-[var(--apple-text-secondary)]">项目</th>
                    <th className="text-right py-3 px-3 font-medium text-[var(--apple-text-secondary)]">年增 ⭐</th>
                    <th className="text-right py-3 px-3 font-medium text-[var(--apple-text-secondary)] hidden md:table-cell">总 ⭐</th>
                    <th className="text-right py-3 px-3 font-medium text-[var(--apple-text-secondary)] hidden md:table-cell">日均</th>
                    <th className="text-right py-3 px-3 font-medium text-[var(--apple-text-secondary)] hidden lg:table-cell">峰值</th>
                    <th className="text-right py-3 px-3 font-medium text-[var(--apple-text-secondary)] hidden lg:table-cell">OpenRank</th>
                    <th className="text-right py-3 px-3 font-medium text-[var(--apple-text-secondary)] hidden lg:table-cell">活跃度</th>
                    <th className="text-right py-3 px-3 font-medium text-[var(--apple-text-secondary)] hidden xl:table-cell">🧑‍💻</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((r, i) => {
                    const isSelected = selectedRepos.includes(r.repo);
                    return (
                      <tr
                        key={r.repo}
                        onClick={() => toggleRepoSelect(r.repo)}
                        className={`border-b border-[var(--apple-border)]/50 hover:bg-black/[0.02] transition-colors cursor-pointer ${
                          isSelected ? 'bg-[var(--apple-blue)]/5' : ''
                        }`}
                      >
                        <td className="text-center py-3 px-2">
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                            i < 3
                              ? 'bg-[var(--apple-blue)] text-white'
                              : 'text-[var(--apple-text-secondary)]'
                          }`}>
                            {r.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: LANG_COLORS[r.language] || '#999' }}
                              title={r.language}
                            />
                            <div className="min-w-0">
                              <p className="font-semibold truncate max-w-[200px]">
                                <a
                                  href={`https://github.com/${r.owner}/${r.repo}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="hover:text-[var(--apple-blue)] transition-colors"
                                >
                                  {r.repo}
                                </a>
                              </p>
                              <p className="text-[11px] text-[var(--apple-text-secondary)] truncate max-w-[300px]">
                                {r.owner}/{r.repo} {r.description && `· ${r.description.slice(0, 60)}${r.description.length > 60 ? '…' : ''}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-3 font-bold tabular-nums text-[var(--apple-green)]">
                          +{fmtNum(r.stars_gained)}
                        </td>
                        <td className="text-right py-3 px-3 tabular-nums hidden md:table-cell text-[var(--apple-text-secondary)]">
                          {fmtNum(r.stars)}
                        </td>
                        <td className="text-right py-3 px-3 tabular-nums hidden md:table-cell">
                          {r.avg_daily}
                        </td>
                        <td className="text-right py-3 px-3 tabular-nums hidden lg:table-cell text-[var(--apple-orange)]">
                          {r.peak_daily}
                        </td>
                        <td className="text-right py-3 px-3 tabular-nums hidden lg:table-cell">
                          {r.openrank != null ? r.openrank.toFixed(1) : '—'}
                        </td>
                        <td className="text-right py-3 px-3 tabular-nums hidden lg:table-cell">
                          {r.activity != null ? fmtNum(r.activity) : '—'}
                        </td>
                        <td className="text-right py-3 px-3 tabular-nums hidden xl:table-cell text-[var(--apple-text-secondary)]">
                          {r.participants != null ? r.participants : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 趋势图区域 */}
          {trendChartData.length > 0 && selectedRepos.length > 0 && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold">月度 Star 增量趋势</h3>
                  <div className="flex gap-2 flex-wrap">
                    {ranking.slice(0, 14).map((r, i) => {
                      const sel = selectedRepos.includes(r.repo);
                      return (
                        <button
                          key={r.repo}
                          onClick={() => toggleRepoSelect(r.repo)}
                          className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                            sel
                              ? 'text-white font-medium'
                              : 'border border-[var(--apple-border)] hover:bg-black/5'
                          }`}
                          style={sel ? { backgroundColor: METRIC_COLORS[i % METRIC_COLORS.length] } : {}}
                        >
                          {r.repo}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(v, name) => [typeof v === 'number' ? v.toLocaleString() : v, name]}
                    />
                    <Legend />
                    {selectedRepos.map((repo, i) => (
                      <Line
                        key={repo}
                        type="monotone"
                        dataKey={repo}
                        stroke={METRIC_COLORS[i % METRIC_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-[11px] text-[var(--apple-text-secondary)] mt-3">
                  💡 点击排行榜中的项目行，或上方标签，可在趋势图中添加/移除项目。折线图展示各项目每月 Star 增量趋势。
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {ranking.length === 0 && !loading && !error && (
        <div className="bg-white rounded-2xl p-10 text-center border border-[var(--apple-border)]">
          <p className="text-[var(--apple-text-secondary)]">
            暂无 {selectedYear} 年的 GitHub 趋势数据
          </p>
        </div>
      )}
    </div>
  );
}
