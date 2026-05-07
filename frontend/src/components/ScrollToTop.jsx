import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// 路由切换时把滚动位置归零，避免从长页面切到短页面时停留在原位置
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}
