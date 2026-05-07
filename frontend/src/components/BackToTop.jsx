import { useEffect, useState } from 'react';

export default function BackToTop({ threshold = 300 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="返回顶部"
      title="返回顶部"
      className="fixed bottom-6 right-6 z-50 w-10 h-10 rounded-full bg-white/90 backdrop-blur border border-[var(--apple-border)] shadow-lg text-[var(--apple-text)] hover:bg-[var(--apple-blue)] hover:text-white transition-colors flex items-center justify-center"
    >
      <span className="text-lg leading-none">↑</span>
    </button>
  );
}
