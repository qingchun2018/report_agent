#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
本地体验 AI Agent 优化效果：多轮会话、任务分解、工具循环与执行轨迹。

前置条件：
  1. 已启动后端：cd backend && python -m uvicorn app.main:app --reload --port 8002
  2. backend/.env 中已配置有效的 DEEPSEEK_API_KEY

用法（在仓库根目录执行）:
  python backend/scripts/agent_feature_demo.py

可选环境变量：
  AGENT_BASE_URL  默认 http://127.0.0.1:8002
"""
from __future__ import annotations

import json
import os
import re
import sys
import urllib.error
import urllib.request

# Windows 终端默认 GBK 时避免打印接口返回的 emoji 等字符报错
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _safe_text(s: str, max_len: int = 8000) -> str:
    """控制台无法编码的字符去掉，保证脚本能跑完。"""
    t = (s or "")[:max_len]
    enc = getattr(sys.stdout, "encoding", None) or ""
    if enc.upper() in ("GBK", "CP936"):
        return t.encode("gbk", errors="ignore").decode("gbk", errors="ignore")
    return re.sub(r"[\U00010000-\U0010ffff]", "", t)


def _post_chat(base: str, query: str, session_id: str | None = None) -> dict:
    url = f"{base.rstrip('/')}/api/agent/chat"
    body: dict = {"query": query}
    if session_id:
        body["session_id"] = session_id
    raw = json.dumps(body, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=raw,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        text = e.read().decode("utf-8", errors="replace")
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return {"error": f"HTTP {e.code}: {text[:300]}"}
    except Exception as e:
        return {"error": str(e)}


def _print_block(title: str, data: dict) -> None:
    line = "=" * 64
    print(f"\n{line}\n{title}\n{line}")
    if data.get("error"):
        print("错误:", data["error"])
        return
    print("问题:", _safe_text(str(data.get("query", ""))))
    if data.get("decomposition"):
        print("\n【任务分解】")
        for i, p in enumerate(data["decomposition"], 1):
            print(f"  {i}. {_safe_text(str(p))}")
    print("\n【查询说明】", _safe_text(data.get("pipeline_explanation") or "", 400))
    print("\n【数据解读】\n", _safe_text(data.get("summary") or "", 1200))
    trace = data.get("trace")
    if trace:
        print("\n【执行轨迹概要】")
        print("  decomposition:", trace.get("decomposition"))
        for st in trace.get("subtasks") or []:
            idx = st.get("index")
            n = len(st.get("trace") or [])
            print(f"  子任务 {idx}: 内部步骤数 = {n}")
            for step in (st.get("trace") or [])[-6:]:
                t = step.get("type")
                if t == "tool_call":
                    print(f"    -> 调用工具 {step.get('name')}")
                elif t == "tool_result":
                    ok = step.get("ok")
                    err = step.get("error")
                    print(f"    <- 结果 ok={ok}" + (f" err={err}" if err else ""))
                elif t == "legacy_json":
                    print("    :: 回退到 JSON 计划模式")
                elif t == "final":
                    print("    :: 模型结束工具轮次")


def main() -> int:
    base = os.environ.get("AGENT_BASE_URL", "http://127.0.0.1:8002").rstrip("/")

    # 场景一：单意图（主要走工具循环 + 解读）
    r1 = _post_chat(base, "统计各严重级别的漏洞数量，用柱状图展示意图即可。")
    _print_block("场景一：单意图查询（工具链）", r1)

    # 场景二：明显复合问题，触发任务分解
    r2 = _post_chat(
        base,
        "请分两步完成：先统计各严重级别漏洞数量；再列出当前 GitHub 趋势里 stars 最高的 3 个项目名称和 star 数。",
    )
    _print_block("场景二：复合问题（任务分解 + 多子结果）", r2)

    # 场景三：同一 session 多轮（第二轮依赖上文）
    sid = "demo-session-local-001"
    _post_chat(base, "当前数据库里漏洞集合一共有多少条文档？", session_id=sid)
    r3 = _post_chat(base, "在上一个问题的基础上，其中 severity 为 critical 的有多少条？", session_id=sid)
    _print_block("场景三：多轮会话（同一 session_id）", r3)

    if any("Key" in str(x.get("error", "")) for x in (r1, r2, r3) if x.get("error")):
        print("\n提示：若涉及 API Key，请编辑 backend/.env 中的 DEEPSEEK_API_KEY 后重试。")
    if any(
        "Connection" in str(x.get("error", "")) or "拒绝" in str(x.get("error", "")) or "10061" in str(x.get("error", ""))
        for x in (r1, r2, r3)
        if x.get("error")
    ):
        print("\n提示：请先启动后端 uvicorn --port 8002。")

    return 0


if __name__ == "__main__":
    sys.exit(main())
