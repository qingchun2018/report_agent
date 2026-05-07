"""健康检查接口：用于负载均衡 / 监控探活。"""
from fastapi import APIRouter

from app.api.deps import DatabaseDep

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check(db: DatabaseDep):
    """检查服务及数据库连通性。失败也不抛异常，统一返回 status 字段。"""
    db_ok = True
    try:
        # 用 list_collection_names 触发一次轻量请求；mongomock 同样支持
        await db.list_collection_names()
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "report-agent-backend",
        "database": "ok" if db_ok else "fail",
    }
