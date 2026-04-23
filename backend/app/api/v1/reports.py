"""报表生成 API。"""
from fastapi import APIRouter, HTTPException

from app.api.deps import DatabaseDep
from app.services.stats_service import StatsService

router = APIRouter(tags=["Reports"])


@router.get("/report/{period}")
async def get_report(db: DatabaseDep, period: str):
    if period not in ("daily", "weekly", "monthly"):
        raise HTTPException(400, "period must be daily, weekly, or monthly")
    stats = StatsService(db)
    return await stats.generate_report(period)
