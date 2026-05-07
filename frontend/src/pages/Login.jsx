import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const fromPath = location.state?.from?.pathname || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast.success('登录成功');
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError(err.message || '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--apple-bg)] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[var(--apple-border)] p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Report Agent</h1>
          <p className="text-sm text-[var(--apple-text-secondary)] mt-1">登录到数据洞察平台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              用户名
            </label>
            <input
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
              placeholder="请输入用户名"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              密码
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
              placeholder="请输入密码"
            />
          </div>

          {error && (
            <div className="bg-[var(--apple-red)]/10 border border-[var(--apple-red)]/30 rounded-lg px-3 py-2">
              <p className="text-xs text-[var(--apple-red)]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[var(--apple-blue)] text-white text-sm font-medium py-2 rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {submitting ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[var(--apple-text-secondary)]">
          还没有账号？
          <Link to="/register" className="ml-1 text-[var(--apple-blue)] hover:underline">
            立即注册
          </Link>
        </div>
      </div>
    </div>
  );
}
