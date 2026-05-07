"""轻量级内存限速器：仅适用于单进程开发/小规模部署。

提供两种能力：
1) 失败次数累计 + 锁定（用于登录失败防爆破）；
2) 滑动窗口计数（用于注册等高频请求限流）。
"""
import threading
import time
from collections import defaultdict, deque
from typing import Deque


class FailureLockout:
    """登录失败计数 + 锁定。线程安全。"""

    def __init__(self, max_failures: int = 5, lockout_seconds: int = 15 * 60):
        self.max_failures = max_failures
        self.lockout_seconds = lockout_seconds
        self._failures: dict[str, list[float]] = defaultdict(list)
        self._locked_until: dict[str, float] = {}
        self._lock = threading.Lock()

    def is_locked(self, key: str) -> tuple[bool, int]:
        """是否在锁定期；返回 (锁定中?, 剩余秒数)。"""
        with self._lock:
            until = self._locked_until.get(key, 0)
            now = time.time()
            if until > now:
                return True, int(until - now)
            if until and until <= now:
                self._locked_until.pop(key, None)
                self._failures.pop(key, None)
            return False, 0

    def record_failure(self, key: str) -> tuple[int, int]:
        """记一次失败；返回 (当前失败次数, 剩余可尝试次数)。
        触达上限时自动加锁。
        """
        with self._lock:
            now = time.time()
            window_start = now - self.lockout_seconds
            arr = [t for t in self._failures.get(key, []) if t >= window_start]
            arr.append(now)
            self._failures[key] = arr
            count = len(arr)
            if count >= self.max_failures:
                self._locked_until[key] = now + self.lockout_seconds
            return count, max(0, self.max_failures - count)

    def reset(self, key: str) -> None:
        with self._lock:
            self._failures.pop(key, None)
            self._locked_until.pop(key, None)


class SlidingWindowLimiter:
    """滑动窗口计数限速。线程安全。"""

    def __init__(self, max_calls: int, window_seconds: int):
        self.max_calls = max_calls
        self.window_seconds = window_seconds
        self._calls: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def allow(self, key: str) -> tuple[bool, int]:
        """放行一次请求；返回 (是否放行, 距离下一次可尝试的秒数)。"""
        with self._lock:
            now = time.time()
            window_start = now - self.window_seconds
            dq = self._calls[key]
            while dq and dq[0] < window_start:
                dq.popleft()
            if len(dq) >= self.max_calls:
                retry_after = int(dq[0] + self.window_seconds - now) + 1
                return False, max(retry_after, 1)
            dq.append(now)
            return True, 0


# 全局实例：登录失败按 username 计数；注册按 IP 计数
login_lockout = FailureLockout(max_failures=5, lockout_seconds=15 * 60)
register_limiter = SlidingWindowLimiter(max_calls=3, window_seconds=60)
