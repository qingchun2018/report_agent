"""鉴权相关请求与响应模型。"""
from datetime import datetime

from pydantic import BaseModel, Field


class RegisterBody(BaseModel):
    """注册请求体：用户名 + 密码。"""

    username: str = Field(..., min_length=3, max_length=32, description="用户名（3-32 位）")
    password: str = Field(..., min_length=6, max_length=64, description="密码（6-64 位）")
    full_name: str | None = Field(None, max_length=64, description="昵称，可选")


class LoginBody(BaseModel):
    """登录请求体。"""

    username: str = Field(..., description="用户名")
    password: str = Field(..., description="密码")


class ChangePasswordBody(BaseModel):
    """修改密码请求体。"""

    old_password: str = Field(..., description="原密码")
    new_password: str = Field(..., min_length=6, max_length=64, description="新密码（6-64 位）")


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
