"""鉴权相关请求与响应模型。"""
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

# bcrypt 算法只处理密码的前 72 字节（UTF-8），超过会报错或需截断；此处在入库前校验字节长度
MAX_PASSWORD_UTF8_BYTES = 72


def validate_password_utf8_bytes(v: str, field_name: str = "密码") -> str:
    """校验 UTF-8 编码后的字节长度不超过 bcrypt 上限。"""
    n = len(v.encode("utf-8"))
    if n > MAX_PASSWORD_UTF8_BYTES:
        raise ValueError(
            f"{field_name}过长：安全哈希算法最多支持 72 字节（UTF-8），当前约 {n} 字节。"
            "请缩短密码；若含中文，每个汉字通常占 3 字节，可用英文与数字组合。"
        )
    return v


class RegisterBody(BaseModel):
    """注册请求体：用户名 + 密码。"""

    username: str = Field(..., min_length=3, max_length=32, description="用户名（3-32 位）")
    password: str = Field(..., min_length=6, max_length=64, description="密码（6-64 位）")
    full_name: str | None = Field(None, max_length=64, description="昵称，可选")

    @field_validator("password")
    @classmethod
    def password_bytes_limit(cls, v: str) -> str:
        return validate_password_utf8_bytes(v, "密码")


class LoginBody(BaseModel):
    """登录请求体。"""

    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")

    @field_validator("password")
    @classmethod
    def password_bytes_limit(cls, v: str) -> str:
        return validate_password_utf8_bytes(v, "密码")


class ChangePasswordBody(BaseModel):
    """修改密码请求体。"""

    old_password: str = Field(..., description="原密码")
    new_password: str = Field(..., min_length=6, max_length=64, description="新密码（6-64 位）")

    @field_validator("old_password", "new_password")
    @classmethod
    def password_bytes_limit(cls, v: str) -> str:
        return validate_password_utf8_bytes(v, "密码")


class UserOut(BaseModel):
    """用户对外响应（不含密码哈希）。"""

    id: str
    username: str
    full_name: str | None = None
    is_active: bool = True
    is_admin: bool = False
    created_at: datetime | None = None
    last_login_at: datetime | None = None


class TokenResponse(BaseModel):
    """登录/注册成功响应：含 token 与用户信息。"""

    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserOut
