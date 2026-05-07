import { Link, useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-7xl font-bold text-[var(--apple-text-secondary)]">404</p>
      <h2 className="text-2xl font-semibold mt-4">页面不存在</h2>
      <p className="text-sm text-[var(--apple-text-secondary)] mt-2 max-w-md">
        你访问的地址可能已被移除、改名，或暂时无法访问。
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-4 py-2 text-sm rounded-lg border border-[var(--apple-border)] bg-white hover:bg-black/5 transition-colors"
        >
          返回上一页
        </button>
        <Link
          to="/"
          className="px-4 py-2 text-sm rounded-lg bg-[var(--apple-blue)] text-white hover:opacity-90 transition-opacity"
        >
          回到 Dashboard
        </Link>
      </div>
    </div>
  );
}
