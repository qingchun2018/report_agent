"""鉴权相关 API：注册、登录、获取当前用户、修改密码、注销、用户管理。"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm

from app.api.deps import CurrentAdminDep, CurrentUserDep, DatabaseDep
from app.schemas.auth import (
    ChangePasswordBody,
    LoginBody,
    RegisterBody,
    TokenResponse,
    UserOut,
)
from app.services.auth_service import AuthService
from app.utils.rate_limit import login_lockout, register_limiter
from app.utils.security import create_access_token

router = APIRouter(prefix="/auth", tags=["Auth"])


def _client_ip(request: Request) -> str:
    """获取调用方 IP，优先取反代头，便于内网部署。"""
    fwd = request.headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _build_token_response(user_doc: dict) -> TokenResponse:
    """根据用户文档生成 TokenResponse。"""
    user_out_dict = AuthService._to_user_out(user_doc)
    token, expire_minutes = create_access_token(
        subject=user_out_dict["id"],
        extra_claims={"username": user_out_dict["username"]},
    )
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in_minutes=expire_minutes,
        user=UserOut(**user_out_dict),
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: RegisterBody, db: DatabaseDep, request: Request):
    """注册新用户。同一 IP 1 分钟内最多 3 次。注册成功直接返回登录 token。"""
    ip = _client_ip(request)
    allowed, retry_after = register_limiter.allow(f"register:{ip}")
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"注册过于频繁，请 {retry_after} 秒后再试",
            headers={"Retry-After": str(retry_after)},
        )
    service = AuthService(db)
    try:
        user_doc = await service.register(
            username=body.username,
            password=body.password,
            full_name=body.full_name,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return _build_token_response(user_doc)


async def _do_login(username: str, password: str, db) -> TokenResponse:
    """登录核心逻辑：失败计数 + 锁定。"""
    key = f"login:{username.strip().lower()}"
    locked, remain = login_lockout.is_locked(key)
    if locked:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"登录失败次数过多，账号已锁定，请 {remain} 秒后再试",
            headers={"Retry-After": str(remain)},
        )

    service = AuthService(db)
    user_doc = await service.authenticate(username, password)
    if user_doc is None:
        count, left = login_lockout.record_failure(key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"用户名或密码错误（剩余尝试次数：{left}）",
            headers={"WWW-Authenticate": "Bearer"},
        )
    login_lockout.reset(key)
    return _build_token_response(user_doc)


@router.post("/login", response_model=TokenResponse)
async def login(
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: DatabaseDep,
):
    """登录：兼容 OAuth2 表单（username/password），方便 Swagger Authorize。"""
    return await _do_login(form.username, form.password, db)


@router.post("/login-json", response_model=TokenResponse)
async def login_json(body: LoginBody, db: DatabaseDep):
    """登录（JSON 形式），供前端 fetch 使用。"""
    return await _do_login(body.username, body.password, db)


@router.get("/me", response_model=UserOut)
async def me(current_user: CurrentUserDep):
    """获取当前登录用户信息。"""
    return UserOut(**AuthService._to_user_out(current_user))


@router.post("/change-password", response_model=TokenResponse)
async def change_password(
    body: ChangePasswordBody,
    current_user: CurrentUserDep,
    db: DatabaseDep,
):
    """修改当前登录用户的密码。

    成功后返回一个新的 access_token，前端立即用它替换旧 token；
    旧 token 因 password_changed_at 校验会立即失效。
    """
    service = AuthService(db)
    try:
        updated = await service.change_password(
            user_id=str(current_user["_id"]),
            old_password=body.old_password,
            new_password=body.new_password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    return _build_token_response(updated)


@router.post("/logout")
async def logout(current_user: CurrentUserDep):
    """注销：JWT 无状态，前端清除本地 token 即可；这里仅用作语义入口。"""
    return {"success": True, "message": "已注销"}


# ---------- 管理员：用户管理 ----------


@router.get("/users")
async def admin_list_users(
    _admin: CurrentAdminDep,
    db: DatabaseDep,
    skip: int = 0,
    limit: int = 100,
):
    """管理员：列出用户。"""
    service = AuthService(db)
    docs = await service.list_users(skip=skip, limit=limit)
    return {"data": [AuthService._to_user_out(d) for d in docs]}


@router.patch("/users/{user_id}/active")
async def admin_set_active(
    user_id: str,
    payload: dict,
    admin: CurrentAdminDep,
    db: DatabaseDep,
):
    """管理员：启用/禁用用户。请求体：{"active": true|false}。

    禁止禁用自己，避免锁死管理员入口。
    """
    if user_id == str(admin["_id"]):
        raise HTTPException(status_code=400, detail="不能修改自己的启用状态")
    active = bool(payload.get("active", True))
    service = AuthService(db)
    try:
        await service.set_active(user_id, active)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"success": True}


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    admin: CurrentAdminDep,
    db: DatabaseDep,
):
    """管理员：删除用户。禁止删除自己。"""
    if user_id == str(admin["_id"]):
        raise HTTPException(status_code=400, detail="不能删除自己")
    service = AuthService(db)
    try:
        await service.delete_user(user_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"success": True}
