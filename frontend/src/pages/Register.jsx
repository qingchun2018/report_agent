import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) {
      setError('用户名至少 3 位');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    // 与后端 bcrypt 一致：按 UTF-8 字节数上限 72，避免注册时报 cryptic 英文错误
    const pwdBytes = new TextEncoder().encode(password).length;
    if (pwdBytes > 72) {
      setError(
        `密码过长：系统最多支持 72 字节（UTF-8），当前约 ${pwdBytes} 字节。若含中文，每个汉字通常占 3 字节，请缩短或使用英文与数字。`,
      );
      return;
    }
    setSubmitting(true);
    try {
      await register(username.trim(), password, fullName.trim());
      toast.success('注册成功，已自动登录');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || '注册失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--apple-bg)] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-[var(--apple-border)] p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">创建账号</h1>
          <p className="text-sm text-[var(--apple-text-secondary)] mt-1">注册一个 Report Agent 账号</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              用户名 <span className="text-[var(--apple-red)]">*</span>
            </label>
            <input
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
              placeholder="3-32 位"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              昵称（可选）
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
              placeholder="展示名"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              密码 <span className="text-[var(--apple-red)]">*</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
              placeholder="至少 6 位"
            />
            <p className="text-[10px] text-[var(--apple-text-secondary)] mt-1">
              说明：密码按 UTF-8 累计字节数，总长不得超过 72 字节（纯英文数字约 72 个字符；纯中文约 24 个字）。
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--apple-text-secondary)] mb-1.5">
              确认密码 <span className="text-[var(--apple-red)]">*</span>
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--apple-border)] focus:outline-none focus:ring-2 focus:ring-[var(--apple-blue)] text-sm"
              placeholder="再次输入密码"
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
            {submitting ? '注册中...' : '注册并登录'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-[var(--apple-text-secondary)]">
          已有账号？
          <Link to="/login" className="ml-1 text-[var(--apple-blue)] hover:underline">
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}
