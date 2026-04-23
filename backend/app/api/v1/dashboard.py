"""Dashboard 与漏洞趋势 API。"""
from fastapi import APIRouter, Query

from app.api.deps import DatabaseDep
from app.services.stats_service import StatsService

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard")
async def get_dashboard(db: DatabaseDep):
    stats = StatsService(db)
    summary = await stats.get_dashboard_summary()
    by_severity = await stats.get_vuln_by_severity()
    by_status = await stats.get_vuln_by_status()
    by_package = await stats.get_vuln_by_package()
    return {
        "summary": summary,
        "by_severity": by_severity,
        "by_status": by_status,
        "by_package": by_package,
    }


@router.get("/vulns/trend")
async def get_vuln_trend(db: DatabaseDep, days: int = Query(30)):
    stats = StatsService(db)
    return {"data": await stats.get_vuln_trend(days)}
