"""年报数据 API。"""
from fastapi import APIRouter, Query

from app.api.deps import DatabaseDep
from app.services.stats_service import StatsService

router = APIRouter(tags=["Annual"])


@router.get("/annual/years")
async def get_annual_years(db: DatabaseDep):
    stats = StatsService(db)
    return {"data": await stats.get_annual_years()}


@router.get("/annual/metrics")
async def get_annual_metrics(db: DatabaseDep, year: int = Query(...), category: str = Query(None)):
    stats = StatsService(db)
    return {"data": await stats.get_annual_metrics(year, category)}


@router.get("/annual/comparison")
async def get_annual_comparison(db: DatabaseDep, year: int = Query(...), category: str = Query(None)):
    stats = StatsService(db)
    return await stats.get_annual_comparison(year, category)
