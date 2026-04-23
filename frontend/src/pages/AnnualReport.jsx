import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const CATEGORY_MAP = {
  all: '全部',
  financial: '财务指标',
  operational: '运营指标',
};

const METRIC_COLORS = [
  '#0071e3', '#5856d6', '#ff9500', '#34c759', '#ff3b30',
  '#ffcc00', '#af52de', '#00c7be', '#ff6482', '#30b0c7',
  '#a2845e', '#64d2ff',
];

export default function AnnualReport() {
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [category, setCategory] = useState('all');
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState(null);

  useEffect(() => {
    loadYears();
  }, []);

  useEffect(() => {
    if (selectedYear) loadComparison(selectedYear, category === 'all' ? null : category);
  }, [selectedYear, category]);

  const loadYears = async () => {
    try {
      const res = await fetch('/api/annual/years');
      const data = await res.json();
      const yrs = data.data || [];
      setYears(yrs);
      if (yrs.length > 0) setSelectedYear(yrs[0]);
    } catch (e) {
      setError('加载年份列表失败');
    }
  };

  const loadComparison = async (year, cat) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ year });
      if (cat) params.set('category', cat);
      const res = await fetch(`/api/annual/comparison?${params}`);
      const data = await res.json();
      setComparison(data);
      if (data.metrics?.length > 0 && !selectedMetric) {
        setSelectedMetric(data.metrics[0].metric_key);
      }
    } catch (e) {
      setError('加载年报数据失败');
    } finally {
      setLoading(false);
    }
  };

  const renderYoY = (val) => {
    if (val === null || val === undefined) return <span className="text-[var(--apple-text-secondary)]">—</span>;
    const color = val >= 0 ? 'text-[var(--apple-green)]' : 'text-[var(--apple-red)]';
    const arrow = val >= 0 ? '↑' : '↓';
    return <span className={`font-medium ${color}`}>{arrow} {Math.abs(val)}%</span>;
  };

  const currentMetricData = comparison?.metrics?.find(m => m.metric_key === selectedMetric);

  const chartData = currentMetricData?.monthly_data?.map(d => ({
    month: `${d.month}月`,
    value: d.value,
    yoy: d.yoy,
    mom: d.mom,
  })) || [];

  const financialSummary = comparison?.yearly_summary?.filter(s => s.category === 'financial') || [];
  const operationalSummary = comparison?.yearly_summary?.filter(s => s.category === 'operational') || [];

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">年报数据</h2>
          <p className="text-xs text-[var(--apple-text-secondary)] mt-1">年度指标分析 · 同比与环比对比</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white rounded-xl p-1 border border-[var(--apple-border)]">
            {Object.entries(CATEGORY_MAP).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  category === key ? 'bg-[var(--apple-blue)] text-white' : 'hover:bg-black/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

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

      {error && (
        <div className="bg-[var(--apple-red)]/10 border border-[var(--apple-red)]/30 rounded-2xl p-4">
          <p className="text-sm text-[var(--apple-red)]">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64 text-[var(--apple-text-secondary)]">
          <p className="text-sm">加载年报数据中...</p>
        </div>
      )}

      {comparison && !loading && (
        <div className="space-y-6">
          {/* 年度汇总卡片 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">{selectedYear} 年度汇总 vs {comparison.prev_year} 年</h3>
              <span className="px-3 py-1 text-xs font-medium bg-[var(--apple-blue)]/10 text-[var(--apple-blue)] rounded-full">
                同比分析
              </span>
            </div>

            {(category === 'all' || category === 'financial') && financialSummary.length > 0 && (
              <>
                <p className="text-xs text-[var(--apple-text-secondary)] mb-3 font-medium uppercase tracking-wide">财务指标</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                  {financialSummary.map((s, i) => (
                    <div key={i} className="bg-[var(--apple-bg)] rounded-xl p-3">
                      <p className="text-[11px] text-[var(--apple-text-secondary)]">{s.metric_label}</p>
                      <p className="text-xl font-bold mt-1 tabular-nums">
                        {s.unit === '%' ? s.current_year_total.toFixed(1) : (s.current_year_total / 10000).toFixed(1)}
                        <span className="text-xs font-normal text-[var(--apple-text-secondary)] ml-0.5">
                          {s.unit === '%' ? '%' : '亿' + s.unit.replace('万', '')}
                        </span>
                      </p>
                      <div className="mt-1 text-xs">
                        {renderYoY(s.yoy_pct)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(category === 'all' || category === 'operational') && operationalSummary.length > 0 && (
              <>
                <p className="text-xs text-[var(--apple-text-secondary)] mb-3 font-medium uppercase tracking-wide">运营指标</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {operationalSummary.map((s, i) => (
                    <div key={i} className="bg-[var(--apple-bg)] rounded-xl p-3">
                      <p className="text-[11px] text-[var(--apple-text-secondary)]">{s.metric_label}</p>
                      <p className="text-xl font-bold mt-1 tabular-nums">
                        {s.unit === '%' ? s.current_year_total.toFixed(1) :
                          s.current_year_total > 10000 ? (s.current_year_total / 10000).toFixed(1) :
                          s.current_year_total.toFixed(0)}
                        <span className="text-xs font-normal text-[var(--apple-text-secondary)] ml-0.5">
                          {s.unit === '%' ? '%' : s.current_year_total > 10000 ? '亿' : s.unit}
                        </span>
                      </p>
                      <div className="mt-1 text-xs">
                        {renderYoY(s.yoy_pct)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 指标选择 + 趋势图 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-3">选择指标</h3>
              <div className="space-y-1">
                {comparison.metrics?.map((m, i) => (
                  <button
                    key={m.metric_key}
                    onClick={() => setSelectedMetric(m.metric_key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedMetric === m.metric_key
                        ? 'bg-[var(--apple-blue)] text-white'
                        : 'hover:bg-black/5'
                    }`}
                  >
                    <span className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ backgroundColor: METRIC_COLORS[i % METRIC_COLORS.length] }} />
                    {m.metric_label}
                    <span className={`ml-1 text-xs ${
                      selectedMetric === m.metric_key ? 'text-white/70' : 'text-[var(--apple-text-secondary)]'
                    }`}>({m.unit})</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6">
              {currentMetricData && (
                <>
                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
                    <h3 className="text-sm font-semibold mb-4">
                      {currentMetricData.metric_label} — 月度趋势
                      <span className="text-xs text-[var(--apple-text-secondary)] ml-2">({currentMetricData.unit})</span>
                    </h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v, name) => {
                            const labels = { value: '数值', yoy: '同比 %', mom: '环比 %' };
                            return [typeof v === 'number' ? v.toFixed(2) : v, labels[name] || name];
                          }}
                        />
                        <Legend formatter={v => ({ value: '数值', yoy: '同比', mom: '环比' }[v] || v)} />
                        <Bar dataKey="value" fill="var(--apple-blue)" radius={[6, 6, 0, 0]} name="value" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
                    <h3 className="text-sm font-semibold mb-4">
                      同比 & 环比变化率
                    </h3>
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} unit="%" />
                        <Tooltip formatter={(v) => v !== null && v !== undefined ? `${v}%` : '—'} />
                        <Legend formatter={v => ({ yoy: '同比 (YoY)', mom: '环比 (MoM)' }[v] || v)} />
                        <Line type="monotone" dataKey="yoy" stroke="var(--apple-blue)" strokeWidth={2} dot={{ r: 3 }}
                          name="yoy" connectNulls />
                        <Line type="monotone" dataKey="mom" stroke="#ff9500" strokeWidth={2} dot={{ r: 3 }}
                          name="mom" strokeDasharray="5 5" connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 月度明细表 */}
          {currentMetricData && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">
                {currentMetricData.metric_label} — 月度明细
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--apple-border)]">
                      <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">月份</th>
                      <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">
                        数值 ({currentMetricData.unit})
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">同比</th>
                      <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">环比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentMetricData.monthly_data.map((d, i) => (
                      <tr key={i} className="border-b border-[var(--apple-border)]/50 hover:bg-black/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-medium">{d.period}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-bold">{d.value.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right">{renderYoY(d.yoy)}</td>
                        <td className="py-2.5 px-3 text-right">{renderYoY(d.mom)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
