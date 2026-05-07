"""FastAPI 应用入口（对齐分层：main + api + services + utils）。"""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 从 backend/.env 加载，避免工作目录不在 backend 时读不到环境变量
_backend_root = Path(__file__).resolve().parent.parent
load_dotenv(_backend_root / ".env")

from app.api.v1 import api_router
from app.services.auth_service import AuthService
from app.utils.database import close_db, connect_db, get_db
from app.utils.seed_data import seed_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


_DEFAULT_JWT_SECRET = "please_change_me_to_a_long_random_string"


def _check_jwt_secret() -> None:
    """启动时校验 JWT_SECRET_KEY；用默认值或过短时打告警，便于运维及时修正。"""
    secret = os.getenv("JWT_SECRET_KEY", _DEFAULT_JWT_SECRET)
    if secret == _DEFAULT_JWT_SECRET:
        logger.warning(
            "[SECURITY] JWT_SECRET_KEY 仍是默认值，生产环境请务必改为长随机串。"
            " 例如：python -c \"import secrets;print(secrets.token_urlsafe(48))\""
        )
    elif len(secret) < 32:
        logger.warning(
            "[SECURITY] JWT_SECRET_KEY 长度不足 32，建议使用至少 48 字节随机串。"
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _check_jwt_secret()
    await connect_db()
    db = get_db()
    seeded = await seed_database(db)
    if seeded:
        logger.info("Database seeded with mock data")
    else:
        logger.info("Database already contains data, skipping seed")
    # 启动时确保用户表索引就绪，避免首个并发注册时争抢
    try:
        await AuthService(db).ensure_indexes()
    except Exception as exc:
        logger.warning("ensure user indexes failed: %s", exc)
    yield
    await close_db()


_docs_enabled = os.getenv("DOCS_ENABLED", "true").strip().lower() in ("1", "true", "yes")

# CORS：生产环境请设置 ALLOWED_ORIGINS 为英文逗号分隔的前端地址列表
_origins_raw = os.getenv("ALLOWED_ORIGINS", "*").strip()
if _origins_raw == "*":
    _allow_origins = ["*"]
else:
    _allow_origins = [x.strip() for x in _origins_raw.split(",") if x.strip()]

app = FastAPI(
    title="Report Agent API",
    description="企业级报表智能体：漏洞、GitHub 趋势、OpenRank、AI 问答",
    lifespan=lifespan,
    docs_url="/docs" if _docs_enabled else None,
    redoc_url="/redoc" if _docs_enabled else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
