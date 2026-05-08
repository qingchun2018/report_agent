"""年报数据 API — GitHub 组件年度排名。"""
from fastapi import APIRouter, Query

from app.api.deps import CurrentUserDep, DatabaseDep
from app.services.stats_service import StatsService

router = APIRouter(tags=["Annual"])


@router.get("/annual/years")
async def get_annual_years(db: DatabaseDep, _user: CurrentUserDep):
    stats = StatsService(db)
    return {"data": await stats.get_github_annual_years()}


@router.get("/annual/github/kpi")
async def get_github_annual_kpi_api(db: DatabaseDep, _user: CurrentUserDep):
    stats = StatsService(db)
    return await stats.get_github_annual_kpi()


@router.get("/annual/github/years")
async def get_github_annual_years_api(db: DatabaseDep, _user: CurrentUserDep):
    stats = StatsService(db)
    return {"data": await stats.get_github_annual_years()}


@router.get("/annual/github/ranking")
async def get_github_annual_ranking_api(
    db: DatabaseDep,
    _user: CurrentUserDep,
    year: int = Query(...),
    top: int = Query(10, ge=1, le=200),
):
    stats = StatsService(db)
    return await stats.get_github_annual_ranking(year, top)


@router.get("/annual/metrics")
async def get_annual_metrics(
    db: DatabaseDep,
    _user: CurrentUserDep,
    year: int = Query(...),
    category: str = Query(None),
):
    stats = StatsService(db)
    return {"data": await stats.get_annual_metrics(year, category)}


@router.get("/annual/comparison")
async def get_annual_comparison(
    db: DatabaseDep,
    _user: CurrentUserDep,
    year: int = Query(...),
    category: str = Query(None),
):
    stats = StatsService(db)
    return await stats.get_annual_comparison(year, category)
