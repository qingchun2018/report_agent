"""鉴权工具：密码哈希（bcrypt）与 JWT 编解码。

密码哈希使用 bcrypt 官方 Python 包直接实现，避免 passlib 与 bcrypt 4.x 组合时
在部分环境下对「字节长度」校验异常（短密码仍报错）的兼容性问题。
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Any

import bcrypt
import jwt

# bcrypt 算法仅使用前 72 字节的 UTF-8 密码；与 schemas 中校验保持一致
MAX_BCRYPT_PASSWORD_BYTES = 72


def hash_password(plain_password: str) -> str:
    """对明文密码进行 bcrypt 哈希。"""
    pw = plain_password.encode("utf-8")
    if len(pw) > MAX_BCRYPT_PASSWORD_BYTES:
        raise ValueError(
            "密码过长：bcrypt 最多支持 72 字节（UTF-8），请缩短密码。"
        )
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pw, salt)
    return hashed.decode("ascii")


def verify_password(plain_password: str, password_hash: str) -> bool:
    """校验明文密码与已存哈希是否匹配（兼容此前 passlib 写入的 $2b$ 格式）。"""
    try:
        pw = plain_password.encode("utf-8")
        ph = password_hash.encode("utf-8") if isinstance(password_hash, str) else password_hash
        return bcrypt.checkpw(pw, ph)
    except (ValueError, TypeError):
        return False
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
