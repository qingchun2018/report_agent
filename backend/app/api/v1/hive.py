"""Hive 表差异 API。"""
from fastapi import APIRouter, Query

from app.api.deps import DatabaseDep
from app.services.stats_service import StatsService

router = APIRouter(tags=["Hive"])


@router.get("/hive/table-pairs")
async def get_hive_table_pairs(db: DatabaseDep):
    stats = StatsService(db)
    return {"data": await stats.get_hive_table_pairs()}


@router.get("/hive/diffs")
async def get_hive_diffs(
    db: DatabaseDep,
    source_table: str = Query(None),
    target_table: str = Query(None),
    compare_date: str = Query(None),
    limit: int = Query(50),
):
    stats = StatsService(db)
    return {"data": await stats.get_hive_diff_list(source_table, target_table, compare_date, limit)}


@router.get("/hive/diff-trend")
async def get_hive_diff_trend(
    db: DatabaseDep,
    source_table: str = Query(...),
    target_table: str = Query(...),
    days: int = Query(30),
):
    stats = StatsService(db)
    return {"data": await stats.get_hive_diff_trend(source_table, target_table, days)}
