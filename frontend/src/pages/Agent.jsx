import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { apiFetch } from '../api/client';
import { useAuth } from '../contexts/AuthContext';

const CHART_COLORS = ['#0071e3', '#5856d6', '#ff9500', '#34c759', '#ff3b30', '#ffcc00', '#af52de', '#007aff'];

const SUGGESTION_GROUPS = [
  {
    label: '漏洞分析',
    color: '#ff3b30',
    items: [
      '统计各严重级别的漏洞数量',
      '本月新增了多少高危漏洞？',
      '哪个组件的漏洞最多？Top 10',
      '目前有多少漏洞是待处理状态？',
      '列出 CVSS 评分最高的 5 个严重漏洞',
      'openssl 有哪些已知漏洞？',
      '来自 NVD 的漏洞有多少？按来源统计',
      '最近 7 天新发现了哪些漏洞？',
    ],
  },
  {
    label: '版本管理',
    color: '#0071e3',
    items: [
      '哪些组件的版本漏洞数最多？',
      'django 有哪些版本？',
      '统计各组件的版本数量',
      '使用 MIT 许可证的组件有哪些？',
    ],
  },
  {
    label: 'License 合规',
    color: '#5856d6',
    items: [
      '有哪些高风险的 License？',
      '统计各风险等级的 License 数量',
      '哪个 License 被最多项目使用？',
      'GPL-3.0 有哪些使用条件和限制？',
    ],
  },
  {
    label: 'GitHub 趋势',
    color: '#34c759',
    items: [
      '最近一周哪个项目 star 增长最快？',
      'openclaw 项目的 star 总数是多少？',
      '有哪些 Python 语言的热门项目？',
      '统计各编程语言的项目数量',
      '最近哪些项目的 fork 数最多？',
      '列出所有 AI 相关的项目',
    ],
  },
  {
    label: 'OpenRank 指标',
    color: '#ff3b30',
    items: [
      '哪个项目的 OpenRank 值最高？列出 Top 10',
      'openclaw 项目的 OpenRank 趋势是什么样的？',
      '哪个项目的 Bus Factor 最低？可能存在风险',
      '统计所有项目的平均 Activity 值',
      '最近一个月新增贡献者最多的项目是哪些？',
      '哪些项目的 Issue 关闭率最高？',
      'cursor 项目的代码变更量是多少？',
      '哪个项目的 PR 合并数最多？',
      '列出 attention 值最高的 5 个项目',
      '统计所有项目的 technical_fork 总量',
    ],
  },
];

function ChartRenderer({ type, data, title }) {
  if (!data || data.length === 0) return <p className="text-sm text-[var(--apple-text-secondary)]">无数据</p>;

  const row0 = data[0];
  const keys = Object.keys(row0).filter(k => k !== '_id');
  if (keys.length === 0) return <p className="text-sm text-[var(--apple-text-secondary)]">无数据</p>;

  // 数值列 / 标签列：避免仅有一列或列顺序异常时取 keys[1] 得到 undefined
  const numericKey =
    keys.find(k => typeof row0[k] === 'number') ??
    keys.find(k => Number.isFinite(Number(row0[k])));
  const labelKey =
    keys.find(k => typeof row0[k] === 'string' && k !== numericKey) ??
    keys.find(k => k !== numericKey) ??
    keys[0];
  const nk = numericKey ?? keys[0];
  const lk = labelKey ?? keys[0];

  const heading = title ? (
    <p className="text-sm font-semibold mb-2">{title}</p>
  ) : null;

  if (type === 'number') {
    const val = row0[nk] ?? row0[keys[0]];
    return (
      <div>
        {heading}
        <div className="flex items-center justify-center h-32">
          <span className="text-5xl font-bold text-[var(--apple-blue)]">{typeof val === 'number' ? val.toLocaleString() : val}</span>
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    return (
      <div>
        {heading}
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={data} dataKey={nk} nameKey={lk} cx="50%" cy="50%" outerRadius={100}
              label={({ [lk]: name, [nk]: val }) => `${name}: ${val}`}>
              {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'line') {
    return (
      <div>
        {heading}
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={lk} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Line type="monotone" dataKey={nk} stroke="var(--apple-blue)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (type === 'bar') {
    return (
      <div>
        {heading}
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey={lk} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey={nk} fill="var(--apple-blue)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // table
  return (
    <div>
      {heading}
      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--apple-border)]">
              {keys.map(k => <th key={k} className="text-left py-2 px-3 font-medium text-[var(--apple-text-secondary)]">{k}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-[var(--apple-border)]/50">
                {keys.map(k => <td key={k} className="py-2 px-3">{typeof row[k] === 'number' ? row[k].toLocaleString() : String(row[k] ?? '')}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 按用户区分会话，避免共用机器时窜聊天
function buildStorageKey(userId) {
  return `agent_history:${userId || 'anon'}`;
}
const MAX_PERSIST_MESSAGES = 100;

function normalizeAssistantText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function TextBlock({ text, className = '' }) {
  const normalized = normalizeAssistantText(text);
  if (!normalized) return null;
  return (
    <div className={`text-sm text-[var(--apple-text)] leading-6 break-words ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-1 whitespace-pre-wrap">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-1 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1 space-y-1">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          code: ({ children, className }) => {
            // react-markdown v9+ 已不再透传 inline 属性；块级 code（围栏代码）由 <pre> 包裹，
            // 通常带有 language-xxx 的 className 或内容含换行；其余视为行内 code。
            const text = typeof children === 'string' ? children : '';
            const isBlock = Boolean(className) || text.includes('\n');
            return isBlock ? (
              <code className={`text-[12px] ${className || ''}`.trim()}>{children}</code>
            ) : (
              <code className="px-1 py-0.5 rounded bg-black/[0.06] text-[12px]">{children}</code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-2 p-2 rounded bg-black/[0.06] overflow-x-auto text-[12px]">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full text-xs border border-[var(--apple-border)]">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-[var(--apple-border)] px-2 py-1 text-left bg-black/[0.03]">{children}</th>,
          td: ({ children }) => <td className="border border-[var(--apple-border)] px-2 py-1 align-top">{children}</td>,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}

export default function Agent() {
  const { user } = useAuth();
  const storageKey = buildStorageKey(user?.id);

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const sessionIdRef = useRef(null);
  const inputRef = useRef(null);

  // 切换用户时从 localStorage 恢复历史
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const obj = JSON.parse(raw);
        if (Array.isArray(obj.messages)) setMessages(obj.messages);
        if (obj.session_id) sessionIdRef.current = obj.session_id;
      } else {
        setMessages([]);
        sessionIdRef.current = null;
      }
    } catch {
      // 忽略解析失败
    }
  }, [storageKey]);

  // 写回 localStorage（截断，避免无限膨胀）
  useEffect(() => {
    try {
      const trimmed = messages.slice(-MAX_PERSIST_MESSAGES);
      localStorage.setItem(
        storageKey,
        JSON.stringify({ messages: trimmed, session_id: sessionIdRef.current })
      );
    } catch {
      // 忽略 localStorage 写入失败（如配额超限）
    }
  }, [messages, storageKey]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const clearConversation = useCallback(() => {
    setMessages([]);
    sessionIdRef.current = null;
    try { localStorage.removeItem(storageKey); } catch { /* 忽略 */ }
  }, [storageKey]);

  const adjustTextareaHeight = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput('');
    requestAnimationFrame(() => adjustTextareaHeight(inputRef.current));
    if (!sessionIdRef.current) {
      sessionIdRef.current = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sess-${Date.now()}`;
    }
    setMessages(prev => [...prev, { role: 'user', content: q }]);
    setLoading(true);

    try {
      const res = await apiFetch('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ query: q, session_id: sessionIdRef.current }),
        silent: true,
      });
      if (!res.ok) {
        let errMsg = `服务器错误 (${res.status})`;
        try {
          const errData = await res.json();
          errMsg = errData.detail || errData.error || errMsg;
        } catch { /* 解析失败 */ }
        if (errMsg && (errMsg.includes('Authentication') || errMsg.includes('api key'))) {
          errMsg = 'DeepSeek API Key 无效，请在 backend/.env 中配置正确的 DEEPSEEK_API_KEY';
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      if (data.detail) throw new Error(data.detail);
      if (data.error) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', ...data }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', error: e.message }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Enter 发送，Shift+Enter 换行
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-2xl font-bold">AI Agent</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            className="text-sm px-3 py-1.5 rounded-lg border border-[var(--apple-border)] bg-white hover:bg-black/5 text-[var(--apple-text-secondary)]"
          >
            清空会话
          </button>
        )}
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="mt-6 space-y-5">
            <div className="text-center">
              <p className="text-lg font-semibold">数据分析助手</p>
              <p className="text-[var(--apple-text-secondary)] text-sm mt-1">选择一个问题或输入自定义查询</p>
            </div>
            {SUGGESTION_GROUPS.map((group, gi) => (
              <div key={gi}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2 ml-1" style={{ color: group.color }}>
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((s, si) => (
                    <button key={si} onClick={() => send(s)}
                      className="px-3 py-1.5 text-sm bg-white border border-[var(--apple-border)] rounded-full hover:bg-black/5 hover:border-black/20 transition-colors text-left">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-[var(--apple-blue)] text-white'
                : 'bg-white border border-[var(--apple-border)] shadow-sm'
            }`}>
              {msg.role === 'user' ? (
                <p className="text-sm">{msg.content}</p>
              ) : msg.error ? (
                <p className="text-sm text-[var(--apple-red)]">{msg.error}</p>
              ) : (
                <div className="space-y-3">
                  {Array.isArray(msg.decomposition) && msg.decomposition.length > 1 && (
                    <div className="text-xs rounded-lg bg-black/[0.04] px-3 py-2 text-[var(--apple-text-secondary)]">
                      <span className="font-semibold text-[var(--apple-text)]">任务分解 </span>
                      {msg.decomposition.map((p, pi) => (
                        <span key={pi} className="block mt-1">{pi + 1}. {p}</span>
                      ))}
                    </div>
                  )}
                  {Array.isArray(msg.sub_results) && msg.sub_results.length > 1 ? (
                    msg.sub_results.map((sr, si) => (
                      <div key={si} className="space-y-2 pt-2 border-t border-[var(--apple-border)] first:border-t-0 first:pt-0">
                        <p className="text-xs text-[var(--apple-text-secondary)] whitespace-pre-wrap break-words leading-5">
                          {normalizeAssistantText(sr.pipeline_explanation)}
                        </p>
                        {sr.chart_title && <p className="text-sm font-semibold">步骤 {si + 1}：{sr.chart_title}</p>}
                        <ChartRenderer type={sr.chart_type} data={sr.data} />
                        <TextBlock text={sr.summary} />
                      </div>
                    ))
                  ) : (
                    <>
                      <p className="text-xs text-[var(--apple-text-secondary)] whitespace-pre-wrap break-words leading-5">
                        {normalizeAssistantText(msg.pipeline_explanation)}
                      </p>
                      <ChartRenderer type={msg.chart_type} data={msg.data} title={msg.chart_title} />
                    </>
                  )}
                  {msg.summary && normalizeAssistantText(msg.summary) !== normalizeAssistantText(msg.pipeline_explanation) && (
                    <div className="mt-2 pt-2 border-t border-[var(--apple-border)]">
                      {(Array.isArray(msg.sub_results) && msg.sub_results.length > 1) || (Array.isArray(msg.decomposition) && msg.decomposition.length > 1) ? (
                        <p className="text-sm font-medium text-[var(--apple-text)]">综合解读</p>
                      ) : null}
                      <TextBlock text={msg.summary} className="mt-1" />
                    </div>
                  )}
                  {msg.trace && (
                    <details className="text-xs text-[var(--apple-text-secondary)]">
                      <summary className="cursor-pointer select-none hover:text-[var(--apple-text)]">执行轨迹</summary>
                      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words bg-black/[0.03] rounded-lg p-2 max-h-48 overflow-y-auto">
                        {JSON.stringify(msg.trace, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-[var(--apple-border)] rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[var(--apple-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[var(--apple-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[var(--apple-text-secondary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[var(--apple-border)] pt-4">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              adjustTextareaHeight(e.target);
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="输入你的问题（Enter 发送，Shift+Enter 换行）"
            className="flex-1 px-4 py-3 bg-white border border-[var(--apple-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)]/30 focus:border-[var(--apple-blue)] resize-none leading-6 max-h-40"
            disabled={loading}
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-[var(--apple-blue)] text-white text-sm font-medium rounded-xl hover:bg-[#0077ed] disabled:opacity-40 transition-colors shrink-0"
          >
            发送
          </button>
        </div>
        <p className="text-[10px] text-[var(--apple-text-secondary)] mt-1.5 ml-1">
          会话已按用户保存在本地，刷新不会丢失；最多保留最近 {MAX_PERSIST_MESSAGES} 条。
        </p>
      </div>
    </div>
  );
}
