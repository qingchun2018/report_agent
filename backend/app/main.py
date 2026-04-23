"""FastAPI 应用入口（对齐分层：main + api + services + utils）。"""
import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

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


app = FastAPI(
    title="Report Agent API",
    description="企业级报表智能体：漏洞、GitHub 趋势、OpenRank、AI 问答",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")
