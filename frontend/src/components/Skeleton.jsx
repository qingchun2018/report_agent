// 通用骨架屏组件：用于替代 "Loading..." 文字，提升加载体验
export function SkeletonBlock({ className = '', style }) {
  return (
    <div
      className={`bg-black/[0.06] rounded-lg animate-pulse ${className}`}
      style={style}
    />
  );
}

// 卡片网格骨架：参数化行列与高度
export function SkeletonCardGrid({ cols = 4, rows = 1, height = 96 }) {
  const total = cols * rows;
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl p-4 shadow-sm border border-[var(--apple-border)]"
        >
          <SkeletonBlock className="h-3 w-1/2 mb-3" />
          <SkeletonBlock className="h-7 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// 图表区骨架：模拟一个带标题的图表卡片
export function SkeletonChart({ height = 240 }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
      <SkeletonBlock className="h-3 w-1/4 mb-4" />
      <SkeletonBlock style={{ height }} />
    </div>
  );
}

// 表格骨架
export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-[var(--apple-border)]">
      <SkeletonBlock className="h-3 w-1/4 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, ri) => (
          <div
            key={ri}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, ci) => (
              <SkeletonBlock key={ci} className="h-4" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// 通用页面骨架：标题 + 一行卡片 + 两行图表
export default function PageSkeleton() {
  return (
    <div className="space-y-6 max-w-7xl">
      <SkeletonBlock className="h-8 w-40" />
      <SkeletonCardGrid cols={4} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
    </div>
  );
}
