import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const SEV_COLORS = { critical: '#ff3b30', high: '#ff9500', medium: '#ffcc00', low: '#34c759' };
const STATUS_COLORS = { open: '#ff3b30', in_progress: '#ff9500', fixed: '#34c759', wont_fix: '#86868b' };
const RISK_COLORS = { high: '#ff3b30', medium: '#ff9500', low: '#34c759' };
const PIE_COLORS = ['#0071e3', '#5856d6', '#ff9500', '#34c759', '#ff3b30', '#ffcc00', '#af52de'];
const STATUS_LABELS = { open: '待处理', in_progress: '处理中', fixed: '已修复', wont_fix: '不修复' };
const SEV_LABELS = { critical: '严重', high: '高危', medium: '中危', low: '低危' };

export default function Reports() {
  const [period, setPeriod] = useState('weekly');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async (p) => {
    setPeriod(p);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/report/${p}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setError('加载失败，请确认后端已启动');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { generate('weekly'); }, []);

  const periodLabel = period === 'daily' ? '日报' : period === 'weekly' ? '周报' : '月报';

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">安全报表</h2>
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-[var(--apple-border)]">
          {['daily', 'weekly', 'monthly'].map(p => (
            <button key={p} onClick={() => generate(p)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                period === p ? 'bg-[var(--apple-blue)] text-white' : 'hover:bg-black/5'
              }`}>
              {p === 'daily' ? '日报' : p === 'weekly' ? '周报' : '月报'}
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
          <p className="text-sm">生成{periodLabel}中...</p>
        </div>
      )}

      {report && !loading && (
        <div className="space-y-6">
          {/* Report Title */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">安全态势{periodLabel}</h3>
                <p className="text-xs text-[var(--apple-text-secondary)] mt-1">
                  生成时间：{new Date(report.generated_at).toLocaleString('zh-CN')}
                </p>
              </div>
              <span className="px-3 py-1 text-xs font-medium bg-[var(--apple-blue)]/10 text-[var(--apple-blue)] rounded-full">
                {periodLabel}
              </span>
            </div>
          </div>

          {/* Anomaly Alerts */}
          {report.anomalies?.length > 0 && (
            <div className="bg-[var(--apple-orange)]/10 border border-[var(--apple-orange)]/30 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-[var(--apple-orange)] mb-3">异常检测预警</h3>
              <div className="space-y-2">
                {report.anomalies.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-white/60 rounded-xl px-4 py-2">
                    <span className="font-medium">{a.repo}</span>
                    <span>
                      日均 Star: {a.avg_daily_before} → <span className="text-[var(--apple-red)] font-bold">{a.avg_daily_recent}</span>
                      <span className="ml-2 px-2 py-0.5 bg-[var(--apple-red)]/10 text-[var(--apple-red)] rounded-full text-xs font-bold">{a.growth_ratio}x</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: '漏洞总量', value: report.summary.total_vulns, icon: '🛡️' },
              { label: '待处理', value: report.summary.open_vulns, color: 'text-[var(--apple-red)]', icon: '⚠️' },
              { label: '严重漏洞', value: report.summary.critical_vulns, color: 'text-[var(--apple-red)]', icon: '🔴' },
              { label: '本周新增', value: report.summary.new_this_week, color: 'text-[var(--apple-blue)]', icon: '📈' },
              { label: '本月新增', value: report.summary.new_this_month, color: 'text-[var(--apple-blue)]', icon: '📊' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[var(--apple-border)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--apple-text-secondary)] uppercase tracking-wide">{card.label}</p>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p className={`text-3xl font-bold mt-2 ${card.color || ''}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Row 1: Trend + Severity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">漏洞趋势</h3>
              {report.vuln_trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={report.vuln_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="var(--apple-blue)" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-[var(--apple-text-secondary)] text-center py-12">该周期暂无漏洞数据</p>}
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">严重级别分布</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={report.vuln_by_severity} dataKey="count" nameKey="severity" cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    label={({ severity, count }) => `${SEV_LABELS[severity] || severity}: ${count}`}>
                    {report.vuln_by_severity.map((entry, i) => (
                      <Cell key={i} fill={SEV_COLORS[entry.severity] || PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, SEV_LABELS[n] || n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 2: Status + Package */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">漏洞处理状态</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={report.vuln_by_status || []} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={85} innerRadius={45}
                    label={({ status, count }) => `${STATUS_LABELS[status] || status}: ${count}`}>
                    {(report.vuln_by_status || []).map((entry, i) => (
                      <Cell key={i} fill={STATUS_COLORS[entry.status] || PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, STATUS_LABELS[n] || n]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">Top 10 受影响组件</h3>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={report.vuln_by_package || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="package" type="category" tick={{ fontSize: 11 }} width={85} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--apple-blue)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Sources + License Risk */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">漏洞数据来源</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={report.vuln_sources || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="source" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#5856d6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">License 风险分布</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={report.license_risk || []} dataKey="count" nameKey="risk_level" cx="50%" cy="50%" outerRadius={80}
                    label={({ risk_level, count }) => `${risk_level}: ${count}`}>
                    {(report.license_risk || []).map((entry, i) => (
                      <Cell key={i} fill={RISK_COLORS[entry.risk_level] || PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GitHub Trending */}
          {report.github_trending?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">GitHub 热门项目 (Star 增长)</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={report.github_trending}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="repo" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white p-3 rounded-xl shadow-lg border text-xs">
                        <p className="font-semibold">{d.owner}/{d.repo}</p>
                        <p className="text-[var(--apple-text-secondary)] mt-1">{d.description}</p>
                        <p className="mt-1">Total Stars: {d.stars?.toLocaleString()}</p>
                        <p className="text-[var(--apple-green)]">+{d.stars_gained?.toLocaleString()} gained</p>
                        <p>Avg {d.avg_daily}/day • {d.language}</p>
                      </div>
                    );
                  }} />
                  <Bar dataKey="stars_gained" fill="var(--apple-blue)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Critical Vulns Table */}
          {report.top_critical?.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">Top 高危/严重漏洞</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--apple-border)]">
                      <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">CVE</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">标题</th>
                      <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">组件</th>
                      <th className="text-center py-2 px-3 font-medium text-[var(--apple-text-secondary)]">级别</th>
                      <th className="text-center py-2 px-3 font-medium text-[var(--apple-text-secondary)]">CVSS</th>
                      <th className="text-center py-2 px-3 font-medium text-[var(--apple-text-secondary)]">状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.top_critical.map((v, i) => (
                      <tr key={i} className="border-b border-[var(--apple-border)]/50 hover:bg-black/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs">{v.cve_id}</td>
                        <td className="py-2.5 px-3 max-w-[250px] truncate">{v.title}</td>
                        <td className="py-2.5 px-3"><span className="px-2 py-0.5 bg-black/5 rounded-full text-xs">{v.package}</span></td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white`}
                            style={{ backgroundColor: SEV_COLORS[v.severity] }}>
                            {SEV_LABELS[v.severity] || v.severity}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold tabular-nums">{v.cvss_score}</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-xs" style={{ color: STATUS_COLORS[v.status] }}>
                            {STATUS_LABELS[v.status] || v.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Summary */}
          <div className="bg-[var(--apple-bg)] rounded-2xl p-5 border border-[var(--apple-border)] text-center">
            <p className="text-xs text-[var(--apple-text-secondary)]">
              数据总览：{report.summary.total_packages} 个组件 • {report.summary.total_versions} 个版本 • {report.summary.total_vulns} 个漏洞 • {report.github_trending?.length || 0} 个热门项目
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
