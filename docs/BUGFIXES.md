# 缺陷修复说明（累计）

本文档记录近期排查并修复的问题，便于复核与发布说明。

## 2026-05 批次

### 1. GitHub 年度 KPI 时间窗口（后端）

**文件：** `backend/app/services/stats_service.py` 中 `get_github_annual_kpi`。

**问题：** 当年自然年的统计结束时间曾写死为固定日历日，导致 KPI 与真实累计区间不一致。

**修复：** 按当前系统时间截断：对每个自然年使用 `[当年 1 月 1 日, min(次年 1 月 1 日, 当前时间))`；尚未开始的年份跳过。

---

### 2. 年度报告页：数字格式化与界面文案（前端）

**文件：** `frontend/src/pages/AnnualReport.jsx`。

**问题：** KPI/表格数字格式化在值为非数字类型时可能触发运行时异常；表头曾使用 emoji，与项目「界面不使用 emoji」约定不一致。

**修复：** `fmtKpi`、`fmtNum` 先 `Number()` 转换并用 `Number.isFinite` 校验；表头改为文字「贡献者」；趋势图下方提示去掉 emoji，改为「提示：」前缀。

---

### 3. 路由切换滚动复位（前端）

**文件：** `frontend/src/components/ScrollToTop.jsx`。

**问题：** 曾使用 `behavior: 'instant'` 等对象形式滚动，部分环境不支持该枚举值。

**修复：** 改为 `window.scrollTo(0, 0)`，兼容性更好。

---

### 4. Agent 图表渲染（前端）

**文件：** `frontend/src/pages/Agent.jsx` 中 `ChartRenderer`。

**问题：** `title` 传入但未用于渲染；数值列默认 `keys[1]`，当只有一列或列顺序异常时可能为 `undefined`。

**修复：** 在单结果分支由 `ChartRenderer` 内部渲染 `title`（避免与外层重复）；多步骤子结果仍仅在外层显示「步骤 N：标题」，不再向组件重复传 `title`。数值列 / 标签列通过类型与列名回退解析，避免取错下标。

---

### 5. OpenRank 首屏加载与 `loadTrend` 声明顺序（前端）

**文件：** `frontend/src/pages/OpenRank.jsx`。

**问题：** 首次请求 overview 的 `useEffect` 内调用 `loadTrend`，但 `loadTrend` 写在 effect 之后，违反暂时性死区规则，且 eslint 报告「在声明前访问」。

**修复：** 使用 `useCallback` 将 `loadTrend` 提前定义，首屏 effect 依赖 `[loadTrend]`。

---

### 6. 年度报告未使用状态（前端）

**文件：** `frontend/src/pages/AnnualReport.jsx`。

**问题：** `repoNames` / `setRepoNames` 从未参与渲染或逻辑，仅增加噪音与 lint 报错。

**修复：** 删除该状态及对 `data.repo_names` 的赋值（排名数据已由 `ranking` 提供）。

---

### 7. 骨架屏卡片高度参数（前端）

**文件：** `frontend/src/components/Skeleton.jsx` 中 `SkeletonCardGrid`。

**问题：** 解构参数 `height` 未使用，触发 `no-unused-vars`。

**修复：** 将 `height` 作用于每个卡片容器的 `minHeight`，与注释中的「参数化高度」一致。

---

### 8. 认证启动态与 Fast Refresh 规则（前端）

**文件：** `frontend/src/contexts/AuthContext.jsx`、`frontend/eslint.config.js`。

**问题：** 无 token 时在 `useEffect` 内同步 `setLoading(false)` 触发 `react-hooks/set-state-in-effect`；Context/Toast 除组件外还导出 `useAuth` 等，触发现用 `react-refresh/only-export-components` 误报。

**修复：** `loading` 初值用 `useState(() => !!tokenStore.get())`，无 token 时不再在 effect 里改 loading；在 `eslint.config.js` 对 `contexts` 与 `Toast.jsx` 为上述导出名称配置 `allowExportNames`（并保留 `allowConstantExport: true`）。

---

### 9. 改密后旧 token 失效判定的时区偏差（后端）

**文件：** `backend/app/api/deps.py` 中 `get_current_user`。

**问题：** Motor / PyMongo 默认 `tz_aware=False`，从真实 MongoDB 读出的 `password_changed_at` 是「裸 UTC」的 naive datetime，直接调用 `.timestamp()` 会按本地时区解释，导致与 JWT 中以 UTC 生成的 `iat` 比较时出现 `tz_offset` 小时的偏差。在 UTC+8 环境下，理论上会让改密前 8 小时签发的旧 token 仍能通过校验，留下安全窗口。

**修复：** 解析 `password_changed_at` 时若 `tzinfo is None`，按 UTC 补全后再调用 `.timestamp()`，确保与 `iat` 严格对齐；mongomock 与已经 `tz_aware` 的客户端不受影响。

---

### 10. 年报环比（MoM）依赖未排序的查询结果（后端）

**文件：** `backend/app/services/stats_service.py` 中 `get_annual_comparison`。

**问题：** MongoDB 的 `find` 不保证返回顺序；原逻辑用 `months_data[-1]["value"]` 作为「上一个月」基准计算 MoM，一旦返回顺序非月份升序，环比结果会与真实「上月」无关，得到错误百分比。

**修复：** 取到 `current_docs` 后按 `month` 升序排序再进入聚合循环；同比（YoY）通过 `prev_map` 查表，不受影响。

---

### 11. AI Agent 行内 code 被错渲染为块级（前端）

**文件：** `frontend/src/pages/Agent.jsx` 中 `TextBlock` 的 ReactMarkdown components。

**问题：** 项目升级到 `react-markdown@10` 后，`code` 组件不再接收 `inline` 属性；原代码仍用 `inline ? ... : ...` 判断，导致所有 code 都走「块级」分支，行内 code（如 `package`）在段落中被渲染为整行 block，破坏排版。

**修复：** 用 `className`（围栏代码语言提示）或 `children` 是否含换行作为「块级」判定；行内 code 走 pill 样式，块级 code 仅设字号、由外层 `pre` 负责圆角/背景/横向滚动。
