"""原始列表数据 API。"""
from fastapi import APIRouter, Query

from app.api.deps import DatabaseDep

router = APIRouter(tags=["Raw Data"])


@router.get("/vulns")
async def list_vulns(
    db: DatabaseDep,
    severity: str = Query(None),
    status: str = Query(None),
    package: str = Query(None),
    limit: int = Query(20),
    skip: int = Query(0),
):
    query_filter = {}
    if severity:
        query_filter["severity"] = severity
    if status:
        query_filter["status"] = status
    if package:
        query_filter["package"] = package

    total = await db.vulnerabilities.count_documents(query_filter)
    cursor = db.vulnerabilities.find(query_filter, {"_id": 0}).sort("published_date", -1).skip(skip).limit(limit)
    items = await cursor.to_list(limit)

    for item in items:
        for k, v in list(item.items()):
            if hasattr(v, "isoformat"):
                item[k] = v.isoformat()

    return {"total": total, "items": items}


@router.get("/versions")
async def list_versions(db: DatabaseDep, name: str = Query(None), limit: int = Query(50)):
    query_filter = {}
    if name:
        query_filter["name"] = name
    cursor = db.versions.find(query_filter, {"_id": 0}).sort("release_date", -1).limit(limit)
    items = await cursor.to_list(limit)
    for item in items:
        for k, v in list(item.items()):
            if hasattr(v, "isoformat"):
                item[k] = v.isoformat()
    return {"items": items}


@router.get("/licenses")
async def list_licenses(db: DatabaseDep):
    cursor = db.licenses.find({}, {"_id": 0})
    return {"items": await cursor.to_list(None)}
