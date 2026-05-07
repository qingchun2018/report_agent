"""鉴权工具：密码哈希（bcrypt）与 JWT 编解码。"""
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from passlib.context import CryptContext

# 使用 bcrypt 算法做密码哈希
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """对明文密码进行 bcrypt 哈希。"""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """校验明文密码与已存哈希是否匹配。"""
    try:
        return _pwd_context.verify(plain_password, password_hash)
    except Exception:
        return False


def _get_jwt_settings() -> tuple[str, str, int]:
    """读取 JWT 相关环境变量；运行时读取以便测试可覆盖。"""
    secret = os.getenv("JWT_SECRET_KEY", "please_change_me_to_a_long_random_string")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    expire_minutes = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))
    return secret, algorithm, expire_minutes


def create_access_token(subject: str, extra_claims: dict[str, Any] | None = None) -> tuple[str, int]:
    """生成 JWT access token；返回 (token, 过期分钟数)。"""
    secret, algorithm, expire_minutes = _get_jwt_settings()
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": subject,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expire_minutes)).timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(payload, secret, algorithm=algorithm)
    return token, expire_minutes


def decode_access_token(token: str) -> dict[str, Any]:
    """解码 JWT；非法或过期会抛出 jwt 相关异常。"""
    secret, algorithm, _ = _get_jwt_settings()
    return jwt.decode(token, secret, algorithms=[algorithm])
