# Report Agent（报表智能体）

企业级报表智能体：漏洞管理、GitHub 趋势、OpenRank、Hive 差异、年报与 **AI 数据分析 Agent**（多轮会话、任务分解、工具链）。  
项目结构与文档组织参考全栈分层实践（如 [eq-management-platform](https://github.com/qingchun2018/eq-management-platform) 的 `app/` + `api/` + 文档习惯），技术栈保持本仓库原有选型。

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Python 3.11+、FastAPI、Motor（MongoDB）、OpenAI SDK（DeepSeek 兼容接口） |
| 前端 | React 19、Vite 8、Tailwind CSS 4、Recharts |
| 数据 | MongoDB（可选；未连接时使用内存 Mock） |

## 功能特性

- **Dashboard**：漏洞总览、趋势、GitHub 热门、异常检测  
- **OpenRank / Hive / 年报**：指标与表差异、年度对比  
- **Reports**：日报 / 周报 / 月报  
- **AI Agent**：自然语言查库、图表建议、执行轨迹；支持 `session_id` 多轮与复合问题分解  

## 快速开始

### 前置要求

- Python 3.11+（推荐 3.12）  
- Node.js 18+  
- MongoDB 4.4+（可选；不配则自动 Mock）  
- [DeepSeek](https://www.deepseek.com/) API Key（AI 问答必填）

### 后端

```powershell
cd backend
pip install -r requirements.txt
# 复制并编辑 .env：DEEPSEEK_API_KEY、可选 MONGODB_URI
python -m uvicorn app.main:app --reload --port 8002
```

- **Swagger**：http://127.0.0.1:8002/docs  
- **ReDoc**：http://127.0.0.1:8002/redoc  

### 前端

```powershell
cd frontend
npm install
npm run dev
```

浏览器打开：http://localhost:5175/

### 可选：Docker 启动 MongoDB

```powershell
docker compose up -d mongo
```

默认连接串与 `backend/.env.example` 中 `mongodb://localhost:27017` 一致。

### Windows 一键开两个窗口（后端 + 前端）

```powershell
.\scripts\start-dev.ps1
```

## 项目结构

```
report-agent/
├── backend/
│   ├── app/                    # 应用包（对齐分层入口）
│   │   ├── main.py             # FastAPI 实例、生命周期、路由挂载
│   │   ├── api/                # HTTP 路由
│   │   │   ├── deps.py         # 依赖注入（如数据库）
│   │   │   └── v1/             # v1 路由按领域拆分
│   │   ├── services/           # 业务逻辑（统计、Agent）
│   │   ├── utils/              # 数据库、种子数据
│   │   └── models/             # Pydantic / 领域模型（预留扩展）
│   ├── requirements.txt
│   ├── .env.example
│   └── scripts/                # 演示与工具脚本
├── frontend/                   # React + Vite
├── docs/
│   └── test.rest               # REST Client 示例请求
├── scripts/
│   └── start-dev.ps1           # Windows 开发启动
├── docker-compose.yml          # 可选本地 Mongo
└── README.md
```

## API 与调试

- 在线文档：后端启动后见 `/docs`、`/redoc`。  
- 离线示例：`docs/test.rest`（VS Code REST Client 等插件可直接运行）。  
- Agent 能力演示：`python backend/scripts/agent_feature_demo.py`（需后端已启动且已配置 Key）。

## 开发说明

- 后端入口模块为 **`app.main:app`**，请勿再使用已移除的根目录 `main.py`。  
- 新增接口：在 `backend/app/api/v1/` 下建路由模块，并在 `app/api/v1/__init__.py` 中 `include_router`。  
- 跨路由共享逻辑放在 `app/services/`。

## 许可证

沿用仓库原有约定（若未指定，以项目文件为准）。
