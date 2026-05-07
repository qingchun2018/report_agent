"""鉴权业务逻辑：用户增删改查、密码校验、索引初始化。"""
import logging
from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError

from app.utils.security import hash_password, verify_password

logger = logging.getLogger(__name__)


class AuthService:
    """用户与鉴权相关服务。集合名：users。"""

    COLLECTION = "users"

    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.col = db[self.COLLECTION]

    async def ensure_indexes(self) -> None:
        """创建用户名唯一索引，避免重复注册。"""
        try:
            await self.col.create_index("username", unique=True)
        except Exception as exc:
            # mongomock 等场景偶发不支持，记录后忽略，不影响主流程
            logger.warning("Failed to create users index: %s", exc)

    @staticmethod
    def _to_user_out(doc: dict[str, Any]) -> dict[str, Any]:
        """将 MongoDB 文档转为对外用户字典（不含密码哈希）。"""
        return {
            "id": str(doc.get("_id")),
            "username": doc.get("username", ""),
            "full_name": doc.get("full_name"),
            "is_active": doc.get("is_active", True),
            "is_admin": doc.get("is_admin", False),
            "created_at": doc.get("created_at"),
            "last_login_at": doc.get("last_login_at"),
        }

    async def get_by_username(self, username: str) -> dict[str, Any] | None:
        return await self.col.find_one({"username": username})

    async def get_by_id(self, user_id: str) -> dict[str, Any] | None:
        try:
            oid = ObjectId(user_id)
        except Exception:
            return None
        return await self.col.find_one({"_id": oid})

    async def count_users(self) -> int:
        return await self.col.count_documents({})

    async def register(self, username: str, password: str, full_name: str | None = None) -> dict[str, Any]:
        """注册新用户；用户名重复会抛 ValueError。
        若是系统中第一个用户，则自动赋予管理员权限，便于初始化。
        """
        await self.ensure_indexes()
        username = username.strip()
        if not username:
            raise ValueError("用户名不能为空")

        existed = await self.get_by_username(username)
        if existed is not None:
            raise ValueError("用户名已存在")

        # 第一个注册的账号自动成为 admin，方便系统初始化与用户管理
        is_first = (await self.count_users()) == 0

        now = datetime.now(timezone.utc)
        doc = {
            "username": username,
            "password_hash": hash_password(password),
            "full_name": (full_name or "").strip() or None,
            "is_active": True,
            "is_admin": is_first,
            "created_at": now,
            "updated_at": now,
            "last_login_at": None,
            # 用于令旧 JWT 失效：token.iat < password_changed_at 即视为失效
            "password_changed_at": now,
        }
        try:
            result = await self.col.insert_one(doc)
        except DuplicateKeyError:
            raise ValueError("用户名已存在")
        doc["_id"] = result.inserted_id
        return doc

    async def authenticate(self, username: str, password: str) -> dict[str, Any] | None:
        """校验用户名+密码，成功返回用户文档（含 password_hash），失败返回 None。"""
        user = await self.get_by_username(username.strip())
        if user is None:
            return None
        if not user.get("is_active", True):
            return None
        if not verify_password(password, user.get("password_hash", "")):
            return None
        # 更新最后登录时间
        now = datetime.now(timezone.utc)
        await self.col.update_one({"_id": user["_id"]}, {"$set": {"last_login_at": now}})
        user["last_login_at"] = now
        return user

    async def change_password(self, user_id: str, old_password: str, new_password: str) -> dict[str, Any]:
        """修改密码：校验旧密码，成功后写入新哈希。返回更新后的用户文档。
        同时刷新 password_changed_at，用于使先前签发的 JWT 失效。
        """
        user = await self.get_by_id(user_id)
        if user is None:
            raise ValueError("用户不存在")
        if not verify_password(old_password, user.get("password_hash", "")):
            raise ValueError("原密码不正确")
        if old_password == new_password:
            raise ValueError("新密码不能与原密码相同")
        now = datetime.now(timezone.utc)
        await self.col.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "password_hash": hash_password(new_password),
                "updated_at": now,
                "password_changed_at": now,
            }},
        )
        user["password_changed_at"] = now
        user["updated_at"] = now
        return user

    async def list_users(self, skip: int = 0, limit: int = 100) -> list[dict[str, Any]]:
        cursor = self.col.find({}).sort("created_at", -1).skip(skip).limit(limit)
        return await cursor.to_list(limit)

    async def set_active(self, user_id: str, active: bool) -> bool:
        """启用/禁用用户。"""
        try:
            oid = ObjectId(user_id)
        except Exception:
            raise ValueError("用户 ID 非法")
        result = await self.col.update_one(
            {"_id": oid},
            {"$set": {"is_active": active, "updated_at": datetime.now(timezone.utc)}},
        )
        if result.matched_count == 0:
            raise ValueError("用户不存在")
        return True

    async def delete_user(self, user_id: str) -> bool:
        try:
            oid = ObjectId(user_id)
        except Exception:
            raise ValueError("用户 ID 非法")
        result = await self.col.delete_one({"_id": oid})
        if result.deleted_count == 0:
            raise ValueError("用户不存在")
        return True
