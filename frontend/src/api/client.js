// 统一 API 调用封装：自动携带 Authorization、统一错误处理、401 触发回调、可选 toast 提示
import { emitToast } from '../components/Toast';

const TOKEN_KEY = 'auth_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// 由 AuthProvider 注册：当后端返回 401 时调用，用于清空登录态
let onUnauthorized = null;
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

// 底层 fetch：自动加 Authorization 与 JSON Content-Type
export async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = tokenStore.get();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }
  let resp;
  try {
    resp = await fetch(url, { ...options, headers });
  } catch (err) {
    // 网络错误（断网、CORS、DNS 等）：抛出统一友好消息，避免界面出现英文 Failed to fetch
    const friendly = '网络异常，请检查网络或稍后重试';
    if (!options.silent) {
      emitToast(friendly, { type: 'error' });
    }
    const wrapped = new Error(friendly);
    wrapped.cause = err;
    throw wrapped;
  }
  if (resp.status === 401) {
    tokenStore.clear();
    if (onUnauthorized) onUnauthorized();
  }
  return resp;
}

// 期望 JSON 响应，非 2xx 抛出 Error（message 取后端 detail）
// options.silent: 不自动弹 toast，由调用方决定
export async function apiJson(url, options = {}) {
  const resp = await apiFetch(url, options);
  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const data = await resp.json();
      if (data && data.detail) detail = data.detail;
    } catch {
      // 忽略 JSON 解析失败
    }
    if (!options.silent) {
      emitToast(detail, { type: 'error' });
    }
    throw new Error(detail);
  }
  return resp.json();
}
