import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiJson, tokenStore, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 401 时清空本地登录态，由路由守卫自动跳转登录页
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  // 启动时若本地有 token，尝试拉取当前用户验证有效性
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    apiJson('/api/auth/me', { silent: true })
      .then((u) => setUser(u))
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const data = await apiJson('/api/auth/login-json', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
      silent: true,
    });
    tokenStore.set(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (username, password, fullName) => {
    const data = await apiJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        full_name: fullName || null,
      }),
      silent: true,
    });
    tokenStore.set(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // 修改密码：后端返回新 token，旧 token 立即失效；同时调用方决定是否强制重登
  const changePassword = useCallback(async (oldPassword, newPassword) => {
    const data = await apiJson('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
      }),
      silent: true,
    });
    if (data?.access_token) {
      tokenStore.set(data.access_token);
      if (data.user) setUser(data.user);
    }
    return data;
  }, []);

  const value = { user, loading, login, register, logout, changePassword };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth 必须在 <AuthProvider> 内使用');
  return ctx;
}
