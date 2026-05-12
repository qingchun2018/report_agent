"""依赖注入：数据库、当前登录用户、管理员等。"""
from datetime import timezone
from typing import Annotated, Any

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.services.auth_service import AuthService
from app.utils.database import get_db
from app.utils.security import decode_access_token


def get_database() -> AsyncIOMotorDatabase:
    return get_db()


DatabaseDep = Annotated[AsyncIOMotorDatabase, Depends(get_database)]


# tokenUrl 仅用于 Swagger 调试时的「Authorize」按钮
_oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=True)


async def get_current_user(
    token: Annotated[str, Depends(_oauth2_scheme)],
    db: DatabaseDep,
) -> dict[str, Any]:
    """从 Authorization: Bearer <token> 解析当前登录用户。

    若 token 的 iat 早于用户的 password_changed_at（说明改密之后签发），同样视为失效，
    强制用户重新登录，避免泄露的旧 token 一直可用。
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="登录态无效或已过期",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        raise credentials_exc
    except jwt.InvalidTokenError:
        raise credentials_exc

    user_id = payload.get("sub")
    if not user_id:
        raise credentials_exc

    service = AuthService(db)
    user = await service.get_by_id(user_id)
    if user is None or not user.get("is_active", True):
        raise credentials_exc

    # 改密后旧 token 失效：token 的 iat 必须不早于用户最近一次改密时间
    iat = payload.get("iat")
    pwd_changed = user.get("password_changed_at")
    if iat is not None and pwd_changed is not None:
        try:
            # 真实 MongoDB（pymongo 默认 tz_aware=False）返回的 datetime 是 naive，
            # 但实际表示 UTC 时间；若直接调用 .timestamp() 会按本地时区解释，导致 token
            # 失效判定窗口出现时区偏差。这里若发现无 tzinfo 即按 UTC 补全。
            if pwd_changed.tzinfo is None:
                pwd_changed = pwd_changed.replace(tzinfo=timezone.utc)
            pwd_changed_ts = int(pwd_changed.timestamp())
            if int(iat) < pwd_changed_ts:
                raise credentials_exc
        except (AttributeError, TypeError):
            # 旧用户记录没有 password_changed_at 时不强制失效
            pass

    return user


CurrentUserDep = Annotated[dict[str, Any], Depends(get_current_user)]


async def get_current_admin(current_user: CurrentUserDep) -> dict[str, Any]:
    """要求当前用户具备管理员权限。"""
    if not current_user.get("is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="需要管理员权限",
        )
    return current_user


CurrentAdminDep = Annotated[dict[str, Any], Depends(get_current_admin)]
