import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// 只允许未登录访客访问的页面（登录、注册）。
// 已登录用户直接跳转到首页，避免重复登录或回到登录页造成困惑。
export default function GuestOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-[var(--apple-text-secondary)]">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}
