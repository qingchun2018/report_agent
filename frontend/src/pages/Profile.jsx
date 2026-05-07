import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

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

export default function Profile() {
  const { user, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('新密码至少 6 位');
      return;
    }
    if (newPassword !== confirm) {
      toast.error('两次输入的新密码不一致');
      return;
    }
    if (newPassword === oldPassword) {
      toast.error('新密码不能与原密码相同');
      return;
    }
    setSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      toast.success('密码修改成功，请重新登录');
      // 改密后，出于安全考虑强制重新登录
      setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, 600);
    } catch (err) {
      toast.error(err.message || '修改失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold">个人中心</h2>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--apple-border)]">
        <h3 className="text-sm font-semibold mb-4">账号信息</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
          <div>
            <dt className="text-xs text-[var(--apple-text-secondary)]">用户名</dt>
            <dd className="mt-0.5">{user?.username || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--apple-text-secondary)]">昵称</dt>
            <dd className="mt-0.5">{user?.full_name || '-'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--apple-text-secondary)]">角色</dt>
            <dd className="mt-0.5">{user?.is_admin ? '管理员' : '普通用户'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--apple-text-secondary)]">状态</dt>
            <dd className="mt-0.5">{user?.is_active ? '正常' : '已禁用'}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--apple-text-secondary)]">注册时间</dt>
            <dd className="mt-0.5">{formatDate(user?.created_at)}</dd>
          </div>
          <div>
            <dt className="text-xs text-[var(--apple-text-secondary)]">最后登录</dt>
            <dd className="mt-0.5">{formatDate(user?.last_login_at)}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--apple-border)]">
        <h3 className="text-sm font-semibold mb-1">修改密码</h3>
        <p className="text-xs text-[var(--apple-text-secondary)] mb-4">
          为了账号安全，密码修改成功后将自动退出，请使用新密码重新登录。
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              原密码
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              新密码
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
              placeholder="至少 6 位"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              确认新密码
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-[var(--apple-blue)] text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? '提交中...' : '保存新密码'}
          </button>
        </form>
      </div>
    </div>
  );
}
