import { useEffect, useState, useCallback } from 'react';
import { apiJson } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { SkeletonTable } from '../components/Skeleton';

function formatDate(value) {
  if (!value) return '-';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleString('zh-CN');
  } catch {
    return '-';
  }
}

export default function UsersAdmin() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState(null);
  const [actingId, setActingId] = useState(null);

  const reload = useCallback(async () => {
    try {
      const data = await apiJson('/api/auth/users', { silent: true });
      setUsers(data.data || []);
    } catch (e) {
      toast.error(e.message || '加载用户列表失败');
      setUsers([]);
    }
  }, [toast]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setActive = async (u, active) => {
    if (u.id === currentUser?.id) {
      toast.warning('不能修改自己的启用状态');
      return;
    }
    setActingId(u.id);
    try {
      await apiJson(`/api/auth/users/${u.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ active }),
        silent: true,
      });
      toast.success(active ? '已启用' : '已禁用');
      await reload();
    } catch (e) {
      toast.error(e.message || '操作失败');
    } finally {
      setActingId(null);
    }
  };

  const removeUser = async (u) => {
    if (u.id === currentUser?.id) {
      toast.warning('不能删除自己');
      return;
    }
    if (!window.confirm(`确认删除用户 ${u.username}？此操作不可恢复。`)) return;
    setActingId(u.id);
    try {
      await apiJson(`/api/auth/users/${u.id}`, { method: 'DELETE', silent: true });
      toast.success('用户已删除');
      await reload();
    } catch (e) {
      toast.error(e.message || '删除失败');
    } finally {
      setActingId(null);
    }
  };

  if (users === null) {
    return (
      <div className="space-y-6 max-w-7xl">
        <h2 className="text-2xl font-bold">用户管理</h2>
        <SkeletonTable rows={5} cols={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">用户管理</h2>
          <p className="text-xs text-[var(--apple-text-secondary)] mt-1">
            管理员视图：启用/禁用账号、删除账号；自己不可被禁用或删除。
          </p>
        </div>
        <button
          type="button"
          onClick={reload}
          className="px-4 py-1.5 text-sm font-medium bg-white border border-[var(--apple-border)] rounded-lg hover:bg-black/5 transition-colors"
        >
          刷新
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[var(--apple-border)] overflow-hidden">
        {users.length === 0 ? (
          <p className="text-center py-12 text-sm text-[var(--apple-text-secondary)]">暂无用户</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--apple-border)] bg-black/[0.02]">
                  <th className="text-left py-3 px-4 font-medium text-[var(--apple-text-secondary)]">用户名</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--apple-text-secondary)]">昵称</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--apple-text-secondary)]">角色</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--apple-text-secondary)]">状态</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--apple-text-secondary)]">注册时间</th>
                  <th className="text-left py-3 px-4 font-medium text-[var(--apple-text-secondary)]">最后登录</th>
                  <th className="text-center py-3 px-4 font-medium text-[var(--apple-text-secondary)]">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const acting = actingId === u.id;
                  return (
                    <tr key={u.id} className="border-b border-[var(--apple-border)]/50 hover:bg-black/[0.02]">
                      <td className="py-3 px-4 font-medium">
                        {u.username}
                        {isSelf && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--apple-blue)]/10 text-[var(--apple-blue)]">
                            当前账号
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--apple-text-secondary)]">{u.full_name || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {u.is_admin ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--apple-blue)]/10 text-[var(--apple-blue)] font-medium">
                            管理员
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--apple-text-secondary)]">普通</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {u.is_active ? (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--apple-green)]/10 text-[var(--apple-green)] font-medium">
                            正常
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--apple-red)]/10 text-[var(--apple-red)] font-medium">
                            已禁用
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[var(--apple-text-secondary)] text-xs">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="py-3 px-4 text-[var(--apple-text-secondary)] text-xs">
                        {formatDate(u.last_login_at)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center gap-2">
                          {u.is_active ? (
                            <button
                              type="button"
                              disabled={isSelf || acting}
                              onClick={() => setActive(u, false)}
                              className="px-3 py-1 text-xs rounded-lg border border-[var(--apple-orange)]/40 text-[var(--apple-orange)] hover:bg-[var(--apple-orange)]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              禁用
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isSelf || acting}
                              onClick={() => setActive(u, true)}
                              className="px-3 py-1 text-xs rounded-lg border border-[var(--apple-green)]/40 text-[var(--apple-green)] hover:bg-[var(--apple-green)]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              启用
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={isSelf || acting}
                            onClick={() => removeUser(u)}
                            className="px-3 py-1 text-xs rounded-lg border border-[var(--apple-red)]/40 text-[var(--apple-red)] hover:bg-[var(--apple-red)]/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
