"""OpenRank 指标 API。"""
from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, DatabaseDep
from app.services.stats_service import StatsService

router = APIRouter(tags=["OpenRank"])


@router.get("/openrank/overview")
async def get_openrank_overview(db: DatabaseDep, _user: CurrentUserDep):
    stats = StatsService(db)
    return await stats.get_openrank_overview()


@router.get("/openrank/ranking")
async def get_openrank_ranking(db: DatabaseDep, _user: CurrentUserDep, limit: int = Query(20)):
    stats = StatsService(db)
    return {"data": await stats.get_openrank_ranking(limit)}


@router.get("/openrank/trend/{repo_name}")
async def get_openrank_trend(db: DatabaseDep, _user: CurrentUserDep, repo_name: str):
    stats = StatsService(db)
    return {"data": await stats.get_openrank_trend(repo_name)}
