import { useState, useEffect } from 'react';
import {
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const LAYER_COLORS = {
  'ODS→DWD': '#0071e3',
  'DWD→DWS': '#5856d6',
  'DWS→ADS': '#ff9500',
};

const LAYER_DESC = {
  ODS: '原始数据层',
  DWD: '明细数据层',
  DWS: '汇总数据层',
  ADS: '应用数据层',
};

const STATUS_STYLE = {
  matched: { bg: 'bg-[var(--apple-green)]/10', text: 'text-[var(--apple-green)]', label: '一致' },
  has_diff: { bg: 'bg-[var(--apple-red)]/10', text: 'text-[var(--apple-red)]', label: '有差异' },
};

const DIFF_TYPE_LABELS = {
  missing_in_target: '目标缺失',
  missing_in_source: '源端缺失',
  value_mismatch: '值不匹配',
  type_mismatch: '类型不匹配',
  null_diff: '空值差异',
};

export default function HiveCompare() {
  const [tablePairs, setTablePairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState(null);
  const [diffs, setDiffs] = useState([]);
  const [trend, setTrend] = useState([]);
  const [compareDate, setCompareDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [layerFilter, setLayerFilter] = useState('all');

  useEffect(() => {
    loadTablePairs();
  }, []);

  const loadTablePairs = async () => {
    try {
      const res = await fetch('/api/hive/table-pairs');
      const data = await res.json();
      setTablePairs(data.data || []);
    } catch (e) {
      setError('加载 Hive 表对信息失败');
    }
  };

  const loadDiffs = async (pair, date) => {
    setLoading(true);
    setError(null);
    setSelectedPair(pair);
    try {
      const params = new URLSearchParams();
      if (pair) {
        params.set('source_table', pair.source_table);
        params.set('target_table', pair.target_table);
      }
      if (date) params.set('compare_date', date);
      params.set('limit', '50');

      const res = await fetch(`/api/hive/diffs?${params}`);
      const data = await res.json();
      setDiffs(data.data || []);

      if (pair) {
        const trendRes = await fetch(
          `/api/hive/diff-trend?source_table=${pair.source_table}&target_table=${pair.target_table}&days=30`
        );
        const trendData = await trendRes.json();
        setTrend(trendData.data || []);
      }
    } catch (e) {
      setError('查询 Hive 差异数据失败');
    } finally {
      setLoading(false);
    }
  };

  const filteredPairs = layerFilter === 'all'
    ? tablePairs
    : tablePairs.filter(p => `${p.source_layer}→${p.target_layer}` === layerFilter);

  const layerGroups = [...new Set(tablePairs.map(p => `${p.source_layer}→${p.target_layer}`))];

  const diffSummary = diffs.reduce((acc, d) => {
    acc.total++;
    acc.diffRows += d.diff_count;
    acc.avgMatch += d.match_rate;
    if (d.status === 'has_diff') acc.hasDiff++;
    return acc;
  }, { total: 0, diffRows: 0, avgMatch: 0, hasDiff: 0 });
  if (diffSummary.total > 0) diffSummary.avgMatch = (diffSummary.avgMatch / diffSummary.total).toFixed(2);

  const firstDiff = diffs[0];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Hive 表数据差异对比</h2>
          <p className="text-xs text-[var(--apple-text-secondary)] mt-1">
            数仓分层校验 · ODS → DWD → DWS → ADS 各层 Hive 表数据一致性
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={compareDate}
            onChange={e => setCompareDate(e.target.value)}
            className="px-3 py-1.5 text-sm border border-[var(--apple-border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)]/30"
            placeholder="选择分区日期 (dt)"
          />
          <button
            onClick={() => loadDiffs(selectedPair, compareDate)}
            className="px-4 py-1.5 text-sm font-medium bg-[var(--apple-blue)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            查询
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[var(--apple-red)]/10 border border-[var(--apple-red)]/30 rounded-2xl p-4">
          <p className="text-sm text-[var(--apple-red)]">{error}</p>
        </div>
      )}

      {/* 数仓层级架构图 */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
        <h3 className="text-sm font-semibold mb-3">Hive 数仓分层架构</h3>
        <div className="flex items-center justify-center gap-0">
          {['ODS', 'DWD', 'DWS', 'ADS'].map((layer, i) => (
            <div key={layer} className="flex items-center">
              <button
                onClick={() => setLayerFilter(i < 3 ? `${layer}→${['DWD','DWS','ADS'][i]}` : layerFilter)}
                className={`flex flex-col items-center px-6 py-3 rounded-xl transition-all ${
                  layerFilter !== 'all' && layerFilter.startsWith(layer)
                    ? 'bg-[var(--apple-blue)]/10 ring-1 ring-[var(--apple-blue)]'
                    : 'hover:bg-black/5'
                }`}
              >
                <span className="text-lg font-bold">{layer}</span>
                <span className="text-[10px] text-[var(--apple-text-secondary)] mt-0.5">{LAYER_DESC[layer]}</span>
                <span className="text-[10px] text-[var(--apple-text-secondary)]">
                  {layer === 'ODS' ? 'TextFile' : layer === 'ADS' ? 'Parquet' : 'ORC'}
                </span>
              </button>
              {i < 3 && (
                <div className="flex items-center mx-1">
                  <div className="w-8 h-[2px]" style={{ backgroundColor: LAYER_COLORS[`${layer}→${['DWD','DWS','ADS'][i]}`] || '#ccc' }} />
                  <span className="text-[var(--apple-text-secondary)] text-xs">→</span>
                  <div className="w-8 h-[2px]" style={{ backgroundColor: LAYER_COLORS[`${layer}→${['DWD','DWS','ADS'][i]}`] || '#ccc' }} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-center mt-2">
          <button
            onClick={() => setLayerFilter('all')}
            className={`px-3 py-1 text-xs rounded-lg transition-colors ${
              layerFilter === 'all' ? 'bg-[var(--apple-blue)] text-white' : 'text-[var(--apple-text-secondary)] hover:bg-black/5'
            }`}
          >
            查看全部层级
          </button>
        </div>
      </div>

      {/* Hive 表对选择 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {filteredPairs.map((pair, i) => {
          const layerKey = `${pair.source_layer}→${pair.target_layer}`;
          const isSelected = selectedPair?.source_table === pair.source_table && selectedPair?.target_table === pair.target_table;
          return (
            <button
              key={i}
              onClick={() => loadDiffs(pair, compareDate)}
              className={`text-left bg-white rounded-2xl p-4 shadow-sm border transition-all hover:shadow-md ${
                isSelected ? 'border-[var(--apple-blue)] ring-2 ring-[var(--apple-blue)]/20' : 'border-[var(--apple-border)]'
              }`}
            >
              <span className="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full mb-2"
                style={{ backgroundColor: (LAYER_COLORS[layerKey] || '#0071e3') + '15',
                         color: LAYER_COLORS[layerKey] || '#0071e3' }}>
                {layerKey}
              </span>
              <p className="text-[10px] text-[var(--apple-text-secondary)] mb-0.5 font-mono">
                {pair.source_layer === 'ODS' ? 'ods_db' : pair.source_layer === 'DWD' ? 'dwd_db' : pair.source_layer === 'DWS' ? 'dws_db' : 'ads_db'}.
              </p>
              <p className="text-xs font-semibold truncate font-mono" title={pair.source_table}>{pair.source_table}</p>
              <p className="text-[10px] text-[var(--apple-text-secondary)] my-1 text-center">↓ dt 分区 ↓</p>
              <p className="text-[10px] text-[var(--apple-text-secondary)] mb-0.5 font-mono">
                {pair.target_layer === 'DWD' ? 'dwd_db' : pair.target_layer === 'DWS' ? 'dws_db' : 'ads_db'}.
              </p>
              <p className="text-xs font-semibold truncate font-mono" title={pair.target_table}>{pair.target_table}</p>
            </button>
          );
        })}
      </div>

      {/* 选中后的元信息 + 统计 */}
      {selectedPair && !loading && diffs.length > 0 && (
        <>
          {/* Hive 表元信息卡片 */}
          {firstDiff && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">Hive 表信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--apple-bg)] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[var(--apple-blue)]/10 text-[var(--apple-blue)] rounded">
                      {firstDiff.source_layer}
                    </span>
                    <span className="text-sm font-semibold">源表</span>
                  </div>
                  <div className="text-xs space-y-1 text-[var(--apple-text-secondary)]">
                    <p>完整表名: <span className="font-mono text-[var(--apple-text)] font-medium">{firstDiff.source_db}.{firstDiff.source_table}</span></p>
                    <p>存储格式: <span className="font-mono text-[var(--apple-text)]">{firstDiff.source_storage}</span></p>
                    <p>字段数量: <span className="text-[var(--apple-text)]">{firstDiff.source_columns} 列</span></p>
                    <p>分区字段: <span className="font-mono text-[var(--apple-text)]">{firstDiff.partition_field}={firstDiff.partition_value}</span></p>
                    <p className="truncate" title={firstDiff.hdfs_source}>
                      HDFS: <span className="font-mono text-[var(--apple-text)] text-[10px]">{firstDiff.hdfs_source}</span>
                    </p>
                  </div>
                </div>
                <div className="bg-[var(--apple-bg)] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-[#5856d6]/10 text-[#5856d6] rounded">
                      {firstDiff.target_layer}
                    </span>
                    <span className="text-sm font-semibold">目标表</span>
                  </div>
                  <div className="text-xs space-y-1 text-[var(--apple-text-secondary)]">
                    <p>完整表名: <span className="font-mono text-[var(--apple-text)] font-medium">{firstDiff.target_db}.{firstDiff.target_table}</span></p>
                    <p>存储格式: <span className="font-mono text-[var(--apple-text)]">{firstDiff.target_storage}</span></p>
                    <p>字段数量: <span className="text-[var(--apple-text)]">{firstDiff.target_columns} 列</span></p>
                    <p>分区字段: <span className="font-mono text-[var(--apple-text)]">{firstDiff.partition_field}={firstDiff.partition_value}</span></p>
                    <p className="truncate" title={firstDiff.hdfs_target}>
                      HDFS: <span className="font-mono text-[var(--apple-text)] text-[10px]">{firstDiff.hdfs_target}</span>
                    </p>
                  </div>
                </div>
              </div>
              {firstDiff.comment && (
                <p className="text-xs text-[var(--apple-text-secondary)] mt-3 text-center">
                  数据流向: {firstDiff.comment}
                </p>
              )}
            </div>
          )}

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '对比记录数', value: diffSummary.total, icon: '📋' },
              { label: '存在差异', value: diffSummary.hasDiff, icon: '⚠️', color: 'text-[var(--apple-red)]' },
              { label: '差异行数合计', value: diffSummary.diffRows.toLocaleString(), icon: '📊', color: 'text-[var(--apple-orange)]' },
              { label: '平均匹配率', value: `${diffSummary.avgMatch}%`, icon: '✓', color: 'text-[var(--apple-green)]' },
            ].map((card, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-[var(--apple-border)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-[var(--apple-text-secondary)]">{card.label}</p>
                  <span className="text-lg">{card.icon}</span>
                </div>
                <p className={`text-2xl font-bold mt-2 ${card.color || ''}`}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* 趋势图 */}
          {trend.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
                <h3 className="text-sm font-semibold mb-4">差异数量趋势 (按 dt 分区)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="compare_date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip labelFormatter={v => `dt=${v}`} />
                    <Line type="monotone" dataKey="diff_count" stroke="var(--apple-red)" strokeWidth={2} dot={{ r: 2 }} name="差异行数" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
                <h3 className="text-sm font-semibold mb-4">匹配率趋势 (按 dt 分区)</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="compare_date" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 10 }} domain={[94, 100]} />
                    <Tooltip labelFormatter={v => `dt=${v}`} />
                    <Line type="monotone" dataKey="match_rate" stroke="var(--apple-green)" strokeWidth={2} dot={{ r: 2 }} name="匹配率 %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 差异明细表 */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
            <h3 className="text-sm font-semibold mb-1">
              差异明细 —
              <span className="text-[var(--apple-blue)] font-mono ml-1">{firstDiff?.source_db}.{selectedPair.source_table}</span>
              <span className="text-[var(--apple-text-secondary)] mx-1">vs</span>
              <span className="text-[#5856d6] font-mono">{firstDiff?.target_db}.{selectedPair.target_table}</span>
            </h3>
            <p className="text-[10px] text-[var(--apple-text-secondary)] mb-4">
              分区: {firstDiff?.partition_field} · 存储: {firstDiff?.source_storage} → {firstDiff?.target_storage}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--apple-border)]">
                    <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">源表 (Hive)</th>
                    <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">目标表 (Hive)</th>
                    <th className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">比对日期 (dt)</th>
                    <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">源端行数</th>
                    <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">目标行数</th>
                    <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">差异行数</th>
                    <th className="text-right py-2 px-3 font-medium text-[var(--apple-text-secondary)]">匹配率</th>
                    <th className="text-center py-2 px-3 font-medium text-[var(--apple-text-secondary)]">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {diffs.map((d, i) => {
                    const st = STATUS_STYLE[d.status] || STATUS_STYLE.has_diff;
                    return (
                      <tr key={i} className="border-b border-[var(--apple-border)]/50 hover:bg-black/[0.02] transition-colors">
                        <td className="py-2.5 px-3 font-mono text-xs">
                          <span className="text-[var(--apple-text-secondary)]">{d.source_db}.</span>{d.source_table}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs">
                          <span className="text-[var(--apple-text-secondary)]">{d.target_db}.</span>{d.target_table}
                        </td>
                        <td className="py-2.5 px-3 text-xs tabular-nums font-mono">{d.compare_date}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{d.total_source_rows?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{d.total_target_rows?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums font-medium text-[var(--apple-red)]">{d.diff_count?.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-right tabular-nums">{d.match_rate}%</td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 差异样本 */}
          {diffs.some(d => d.diff_samples?.length > 0) && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
              <h3 className="text-sm font-semibold mb-4">差异样本详情 (Hive 字段级)</h3>
              <div className="space-y-3">
                {diffs.filter(d => d.diff_samples?.length > 0).slice(0, 5).map((d, i) => (
                  <div key={i} className="bg-[var(--apple-bg)] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-medium bg-white border border-[var(--apple-border)] rounded font-mono">
                        dt={d.compare_date}
                      </span>
                      <span className="text-[10px] text-[var(--apple-text-secondary)] font-mono">
                        {d.source_db}.{d.source_table} → {d.target_db}.{d.target_table}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {d.diff_samples.map((s, j) => (
                        <div key={j} className="bg-white rounded-lg p-3 text-xs border border-[var(--apple-border)]/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium font-mono">{s.field}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--apple-orange)]/10 text-[var(--apple-orange)]">
                              {DIFF_TYPE_LABELS[s.diff_type] || s.diff_type}
                            </span>
                          </div>
                          {s.source_value !== undefined && (
                            <div className="mt-1 space-y-0.5 text-[var(--apple-text-secondary)]">
                              <p>源 ({d.source_layer}): <span className="text-[var(--apple-text)] font-mono">{s.source_value ?? 'NULL'}</span></p>
                              <p>目标 ({d.target_layer}): <span className="text-[var(--apple-text)] font-mono">{s.target_value ?? 'NULL'}</span></p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {loading && (
        <div className="flex items-center justify-center h-64 text-[var(--apple-text-secondary)]">
          <p className="text-sm">正在查询 Hive 表差异数据...</p>
        </div>
      )}

      {!selectedPair && !loading && (
        <div className="flex flex-col items-center justify-center h-48 text-[var(--apple-text-secondary)]">
          <p className="text-sm">请选择一组 Hive 表对进行分层数据差异对比</p>
          <p className="text-[10px] mt-1">支持按日期分区 (dt) 筛选</p>
        </div>
      )}
    </div>
  );
}
