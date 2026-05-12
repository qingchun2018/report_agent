import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// 路由切换时把滚动位置归零，避免从长页面切到短页面时停留在原位置
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // 使用双参数形式，兼容不支持 ScrollOptions.behavior 的旧浏览器
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
