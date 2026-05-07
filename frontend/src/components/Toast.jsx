import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

const TYPE_STYLES = {
  success: {
    bg: 'bg-[var(--apple-green)]',
    text: 'text-white',
    border: 'border-[var(--apple-green)]',
  },
  error: {
    bg: 'bg-[var(--apple-red)]',
    text: 'text-white',
    border: 'border-[var(--apple-red)]',
  },
  warning: {
    bg: 'bg-[var(--apple-orange)]',
    text: 'text-white',
    border: 'border-[var(--apple-orange)]',
  },
  info: {
    bg: 'bg-[var(--apple-blue)]',
    text: 'text-white',
    border: 'border-[var(--apple-blue)]',
  },
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const idRef = useRef(0);

  const remove = useCallback((id) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((message, options = {}) => {
    const id = ++idRef.current;
    const item = {
      id,
      message,
      type: options.type || 'info',
      duration: options.duration ?? 3000,
    };
    setItems((prev) => [...prev, item]);
    if (item.duration > 0) {
      setTimeout(() => remove(id), item.duration);
    }
    return id;
  }, [remove]);

  // 用 useMemo 稳定 api 引用，避免下游 useEffect 反复执行
  const api = useMemo(() => ({
    show: push,
    success: (msg, opts) => push(msg, { ...opts, type: 'success' }),
    error: (msg, opts) => push(msg, { ...opts, type: 'error' }),
    warning: (msg, opts) => push(msg, { ...opts, type: 'warning' }),
    info: (msg, opts) => push(msg, { ...opts, type: 'info' }),
    dismiss: remove,
  }), [push, remove]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-4 right-4 z-[1000] flex flex-col gap-2 pointer-events-none">
        {items.map((t) => {
          const style = TYPE_STYLES[t.type] || TYPE_STYLES.info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto min-w-[220px] max-w-sm rounded-xl shadow-lg border ${style.bg} ${style.text} ${style.border} px-4 py-3 text-sm flex items-start gap-3 animate-toast-in`}
              role="alert"
            >
              <span className="flex-1 break-words">{t.message}</span>
              <button
                type="button"
                onClick={() => remove(t.id)}
                className="opacity-70 hover:opacity-100 text-base leading-none"
                aria-label="关闭"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // 兜底：未挂载 Provider 时不报错，仅 console
    return {
      show: (m) => console.log('[toast]', m),
      success: (m) => console.log('[toast.success]', m),
      error: (m) => console.error('[toast.error]', m),
      warning: (m) => console.warn('[toast.warning]', m),
      info: (m) => console.info('[toast.info]', m),
      dismiss: () => {},
    };
  }
  return ctx;
}

// 暴露一个非 hook 的全局发射器：在非组件代码（如 fetch 拦截）里用
let _emit = null;
export function bindToastEmitter(toastApi) {
  _emit = toastApi;
}
export function emitToast(message, options = {}) {
  if (_emit) _emit.show(message, options);
}

// 把 useToast() 拿到的 api 注册给非组件代码用，组件卸载时解绑
export function ToastBridge() {
  const toast = useToast();
  useEffect(() => {
    bindToastEmitter(toast);
    return () => bindToastEmitter(null);
  }, [toast]);
  return null;
}
