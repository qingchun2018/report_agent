"""API v1 路由聚合。"""
from fastapi import APIRouter

from app.api.v1 import agent, annual, dashboard, github, hive, openrank, raw_data, reports

api_router = APIRouter()
api_router.include_router(dashboard.router)
api_router.include_router(github.router)
api_router.include_router(openrank.router)
api_router.include_router(reports.router)
api_router.include_router(hive.router)
api_router.include_router(annual.router)
api_router.include_router(agent.router)
api_router.include_router(raw_data.router)
