"""依赖注入：数据库等。"""
from typing import Annotated

from fastapi import Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.database import get_db


def get_database() -> AsyncIOMotorDatabase:
    return get_db()


DatabaseDep = Annotated[AsyncIOMotorDatabase, Depends(get_database)]
