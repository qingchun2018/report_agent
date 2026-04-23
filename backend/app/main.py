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
from app.utils.database import close_db, connect_db, get_db
from app.utils.seed_data import seed_database

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    db = get_db()
    seeded = await seed_database(db)
    if seeded:
        logger.info("Database seeded with mock data")
    else:
        logger.info("Database already contains data, skipping seed")
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
