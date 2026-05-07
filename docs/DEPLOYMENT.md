# 生产部署说明

本文记录上线前环境变量、构建步骤、健康检查与常见问题，便于在服务器或 CI 中复现。

## 1. 环境要求

| 组件 | 版本建议 |
|------|----------|
| Python | 3.11+（推荐 3.12） |
| Node.js | 18+（仅构建前端静态资源时需要） |
| MongoDB | 4.4+；或使用云 MongoDB URI |
| 反向代理 | Nginx / Caddy 等（推荐：前端静态 + `/api` 反代到后端） |

## 2. 后端环境变量

在服务器 `backend` 目录放置 `.env`（**切勿提交仓库**，从 `backend/.env.example` 复制后修改）。

| 变量 | 必填 | 说明 |
|------|------|------|
| `MONGODB_URI` | 建议 | 默认 `mongodb://localhost:27017`；无 Mongo 时本地开发会退化为内存 Mock，**生产务必配置真实库** |
| `MONGODB_DB` | 否 | 数据库名，默认 `report_agent` |
| `DEEPSEEK_API_KEY` | Agent 功能必填 | DeepSeek 兼容接口密钥 |
| `JWT_SECRET_KEY` | **生产必填** | JWT 签名密钥，须为**长随机串**。示例：`python -c "import secrets;print(secrets.token_urlsafe(48))"` |
| `JWT_ALGORITHM` | 否 | 默认 `HS256` |
| `JWT_EXPIRE_MINUTES` | 否 | Token 过期分钟数，默认 `10080`（7 天） |
| `ALLOWED_ORIGINS` | **生产强烈建议** | 英文逗号分隔的前端 Origin，如 `https://你的域名`。不配则 CORS 为 `*`（仅适合开发） |
| `DOCS_ENABLED` | 否 | 设为 `false` 可关闭 `/docs` 与 `/redoc` |

启动时若 `JWT_SECRET_KEY` 仍为占位默认值或长度过短，日志会出现 `[SECURITY]` 告警，部署后应修正。

## 3. 后端安装与启动

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate   # Linux/macOS

pip install -r requirements.txt
```

生产不要用 `--reload`，示例：

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8002
```

可用 systemd、supervisor 或 Docker 托管进程。

### 健康检查

- `GET /api/health`：返回服务与数据库连通状态，便于负载均衡探活。

## 4. 前端构建与静态资源

```bash
cd frontend
npm ci
npm run build
```

产物在 `frontend/dist`，部署到 Nginx 站点根目录。

前端通过**相对路径**请求 `/api`，因此需在**同一域名**下将 `/api` 反向代理到后端，参见仓库内 `docs/nginx-report-agent.conf.example`。

开发时 Vite 将 `/api` 代理到 `http://localhost:8002`；生产必须靠 Nginx（或同类）完成等价代理。

## 5. 首次上线与账号

1. 部署完成后，浏览器访问站点会进入登录页。
2. 使用「注册」创建**第一个账号**：该账号会自动成为**管理员**（可在侧边栏「用户管理」中管理其他用户）。
3. 后续注册用户默认为普通用户，由管理员禁用/启用或删除。

## 6. 密码与 bcrypt 说明

- 密码使用 **bcrypt** 存储（依赖见 `requirements.txt` 中的 `bcrypt`）。
- bcrypt 规范限制：参与哈希的密码最多 **72 字节（UTF-8）**。含中文时每个汉字通常占 3 字节，请勿设置过长中文口令。
- 接口与前端已对 UTF-8 字节长度做校验；超长会返回中文提示，而非底层库的英文报错。
- 若自旧版本升级：历史上若使用 `passlib` 写入的哈希，仍为标准 `$2b$` 格式，可与当前 `bcrypt.checkpw` 兼容校验，一般无需迁移数据。

## 7. 安全相关行为（简要）

- 除登录、注册、健康检查等公开接口外，业务 API 需携带 `Authorization: Bearer <token>`。
- 登录连续失败 5 次会锁定该用户名一段时间；注册按 IP 限频（**单机内存计数**，多实例部署时需后续改为 Redis 等共享存储）。
- 修改密码后旧 JWT 会失效；前端会引导重新登录。

## 8. AI Agent 会话

多轮 `session_id` 当前在**单进程内存**中；若使用多个 uvicorn worker 或水平扩容，会话不会在进程间共享，需要时再引入 Redis 等（README 中亦有说明）。

## 9. 部署检查清单

- [ ] `backend/.env` 已配置且**未**加入 git
- [ ] `JWT_SECRET_KEY` 已替换为强随机串
- [ ] `ALLOWED_ORIGINS` 已设为生产前端域名
- [ ] 生产关闭文档或限制访问：`DOCS_ENABLED=false`（按需）
- [ ] `MONGODB_URI` 指向生产库且网络可达
- [ ] `pip install -r requirements.txt` 与 `npm run build` 已在目标环境执行成功
- [ ] Nginx（或等价）已配置 `/api` → 后端服务
- [ ] 访问 `/api/health` 返回正常
- [ ] 完成首个管理员注册并验证登录、核心业务页面加载

## 10. 常见问题

**Q：前端报网络错误或 401**  
A：确认反代 `/api` 是否指向后端端口；确认浏览器是否已登录且 Token 未过期；跨域时检查 `ALLOWED_ORIGINS`。

**Q：Agent 无响应**  
A：检查 `DEEPSEEK_API_KEY` 是否有效、后端日志是否有上游 API 错误。

**Q：注册提示密码相关英文错误**  
A：升级代码后应已改为中文校验；服务端请执行 `pip install -r requirements.txt` 确保使用当前 `bcrypt` 实现。

---

更多接口示例见 `docs/test.rest`；Nginx 示例见 `docs/nginx-report-agent.conf.example`。
