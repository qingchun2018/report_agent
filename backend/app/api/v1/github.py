"""GitHub 趋势相关 API。"""
from fastapi import APIRouter, Query

from app.api.deps import DatabaseDep
from app.services.stats_service import StatsService

router = APIRouter(tags=["GitHub"])


@router.get("/github/trending")
async def get_github_trending(db: DatabaseDep, days: int = Query(7)):
    stats = StatsService(db)
    return {"data": await stats.get_github_trending(days)}


@router.get("/github/star-history/{repo_name}")
async def get_star_history(db: DatabaseDep, repo_name: str, days: int = Query(30)):
    stats = StatsService(db)
    return {"data": await stats.get_github_star_history(repo_name, days)}


@router.get("/github/anomalies")
async def get_anomalies(db: DatabaseDep):
    stats = StatsService(db)
    return {"data": await stats.detect_trending_anomalies()}
