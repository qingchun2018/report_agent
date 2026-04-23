"""DeepSeek AI Agent：自然语言 → MongoDB 查询 → 数据解读（多轮会话、工具循环、失败重试、任务分解）"""
import os
import json
import logging
import copy
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from openai import OpenAI
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

# 多轮会话内存（进程内）；生产环境可换 Redis
SESSION_MEMORY: Dict[str, List[Dict[str, str]]] = {}
MAX_SESSION_TURNS = 12
MAX_TOOL_ROUNDS = 8

SYSTEM_PROMPT = """你是一个企业级数据分析 Agent，负责查询 MongoDB 数据库并回答用户问题。

## 数据库中的集合（Collections）

### 1. vulnerabilities（漏洞表）
字段：cve_id, title, severity(critical/high/medium/low), status(open/in_progress/fixed/wont_fix), 
affected_versions(数组), package, description, published_date(日期), discovered_date(日期), 
fixed_date(日期或null), cvss_score(浮点数), source

### 2. versions（版本表）
字段：name(包名), version, release_date(日期), dependencies(数组), vuln_count(整数), license, repo_url

### 3. licenses（License表）
字段：name, spdx_id, risk_level(high/medium/low), permissions(数组), limitations(数组), 
conditions(数组), used_by_count(整数)

### 4. github_trends（GitHub 趋势表）
字段：repo_name, owner, description, language, stars(整数), stars_today(整数), stars_week(整数),
forks(整数), open_issues(整数), license, topics(数组), created_at(日期), snapshot_date(日期)

### 5. openrank_metrics（OpenRank 开源指标表，基于 X-lab OpenDigger 体系）
字段：repo_name, owner, month(字符串如"2025-01"), snapshot_date(日期),
openrank(浮点数，核心影响力指标), activity(浮点数，项目活跃度),
bus_factor(整数，巴士因子/关键贡献者数), participants(整数，参与者数),
new_contributors(整数，新贡献者数),
code_change_lines_add(整数), code_change_lines_remove(整数), code_change_lines_sum(整数),
issues_new(整数), issues_closed(整数), issue_resolution_duration(浮点数，天),
pr_merged(整数), pr_open(整数), change_requests(整数), change_requests_accepted(整数),
attention(整数，关注度), technical_fork(整数，技术性 fork 数)

## 你的任务
1. 根据用户问题，生成合适的 MongoDB 聚合管道（aggregate pipeline）
2. 指定要查询的集合名称
3. 对查询结果进行分析和解读

## 输出格式
严格输出 JSON，格式如下：
```json
{
  "collection": "集合名称",
  "pipeline": [MongoDB 聚合管道],
  "explanation": "查询逻辑简要说明",
  "chart_type": "bar|line|pie|table|number",
  "chart_title": "图表标题"
}
```

## 重要约束（必须遵守）
- 日期字段使用 ISODate 格式，在 pipeline 中用 {"$gte": "DATE:2025-01-01"} 表示日期，我会替换
- pipeline 必须是有效的 MongoDB 聚合管道数组
- 根据数据特点选择最合适的 chart_type
- 如果只是一个数字结果，chart_type 用 "number"
- **只能使用以下基础聚合操作符**：$match, $group, $sort, $limit, $skip, $project, $count, $unwind
- **$group 中只能使用**：$sum, $avg, $min, $max, $push, $addToSet, $first, $last
- **禁止使用以下高级操作符**：$arrayToObject, $map, $filter, $reduce, $mergeObjects, $dateToString, $cond, $switch, $let, $lookup, $facet, $bucket, $setWindowFields
- 保持 pipeline 尽量简洁，通常 2-4 个 stage 就足够了
- $group 的 _id 字段应该是简单的字段引用（如 "$severity"），不要嵌套表达式
"""

TOOL_SYSTEM_PROMPT = """你是企业级数据分析 Agent，通过调用工具查询 MongoDB。

## 集合与字段说明
""" + SYSTEM_PROMPT.split("## 数据库中的集合", 1)[1].split("## 你的任务", 1)[0] + """
## 工具使用规则
1. 可先调用 list_collections 确认集合名称。
2. 使用 run_aggregate 执行查询；若工具返回 ok=false 和 error，阅读错误后修正 pipeline 再次调用（允许在同一轮对话中多次调用）。
3. 得到满意数据后，用简短中文向用户说明要点（不要再输出 JSON 查询计划）。

## pipeline 约束（与原先一致）
- 日期用 {"$gte": "DATE:2025-01-01"} 形式，由系统替换为 datetime
- 仅允许 $match, $group, $sort, $limit, $skip, $project, $count, $unwind
- $group 内仅 $sum, $avg, $min, $max, $push, $addToSet, $first, $last
- 禁止 $lookup、$facet、$dateToString 等高级算子
"""


def _replace_date_strings(obj):
    """递归替换 pipeline 中的 DATE: 前缀字符串为 datetime 对象"""
    if isinstance(obj, str) and obj.startswith("DATE:"):
        try:
            return datetime.fromisoformat(obj[5:])
        except ValueError:
            return obj
    elif isinstance(obj, dict):
        return {k: _replace_date_strings(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [_replace_date_strings(item) for item in obj]
    return obj


def _append_session(session_id: Optional[str], user_text: str, assistant_summary: str) -> None:
    """写入多轮会话摘要"""
    if not session_id:
        return
    if session_id not in SESSION_MEMORY:
        SESSION_MEMORY[session_id] = []
    mem = SESSION_MEMORY[session_id]
    mem.append({"role": "user", "content": user_text[:4000]})
    mem.append({"role": "assistant", "content": assistant_summary[:4000]})
    overflow = len(mem) - MAX_SESSION_TURNS * 2
    if overflow > 0:
        del mem[:overflow]


def _session_context_messages(session_id: Optional[str]) -> List[Dict[str, str]]:
    if not session_id or session_id not in SESSION_MEMORY:
        return []
    tail = SESSION_MEMORY[session_id][-MAX_SESSION_TURNS * 2 :]
    return [{"role": m["role"], "content": m["content"]} for m in tail]


def _agent_tools() -> List[Dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": "list_collections",
                "description": "列出当前数据库中可供查询的业务集合名称",
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "run_aggregate",
                "description": "在指定集合上执行 MongoDB aggregate pipeline，最多返回 100 条",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "collection": {"type": "string", "description": "集合名"},
                        "pipeline": {"type": "array", "description": "聚合管道数组"},
                        "chart_type": {
                            "type": "string",
                            "enum": ["bar", "line", "pie", "table", "number"],
                            "description": "建议图表类型",
                        },
                        "chart_title": {"type": "string"},
                        "explanation": {"type": "string", "description": "查询意图简述"},
                    },
                    "required": ["collection", "pipeline"],
                },
            },
        },
    ]


class AgentService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.api_key = os.getenv("DEEPSEEK_API_KEY", "")
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com",
        )

    async def chat(self, user_query: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """对外入口：保留原返回字段，并增加 decomposition、trace、sub_results、session_id。"""
        try:
            if not self.api_key or self.api_key.startswith("your_"):
                return {"error": "DeepSeek API Key 未配置。请在 backend/.env 文件中设置 DEEPSEEK_API_KEY"}

            hist = _session_context_messages(session_id)
            parts = await self._decompose(user_query)
            trace_root: Dict[str, Any] = {"decomposition": parts, "subtasks": []}

            sub_outputs: List[Dict[str, Any]] = []
            for idx, part in enumerate(parts):
                ctx = copy.deepcopy(hist)
                if idx > 0 and sub_outputs:
                    prev = sub_outputs[-1]
                    ctx.append(
                        {
                            "role": "assistant",
                            "content": f"（上一子问题结果摘要）{prev.get('summary', '')[:800]}",
                        }
                    )
                one_trace: List[Dict[str, Any]] = []
                sub_out = await self._tool_loop_resolve(part, ctx, one_trace)
                if sub_out.get("error"):
                    sub_out = await self._legacy_json_chat(part, ctx, one_trace)
                trace_root["subtasks"].append({"index": idx, "query": part, "trace": one_trace})
                sub_outputs.append(sub_out)

            if len(sub_outputs) == 1:
                final = sub_outputs[0]
            else:
                final = await self._merge_multi_subtask(user_query, parts, sub_outputs)

            final["query"] = user_query
            final["decomposition"] = parts
            final["trace"] = trace_root
            final["session_id"] = session_id
            if len(sub_outputs) > 1:
                final["sub_results"] = sub_outputs

            summary_for_memory = final.get("summary") or final.get("pipeline_explanation") or ""
            _append_session(session_id, user_query, summary_for_memory)
            return final

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse DeepSeek response: {e}")
            return {"error": "AI 返回格式异常，请重试"}
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Agent error: {error_msg}")
            if "401" in error_msg or "Authentication" in error_msg or "api key" in error_msg.lower():
                return {"error": "DeepSeek API Key 无效，请检查 backend/.env 中的 DEEPSEEK_API_KEY 配置"}
            return {"error": f"AI 服务异常：{error_msg}"}

    async def _decompose(self, user_query: str) -> List[str]:
        """任务分解：单一意图则一项，多意图则拆成多条子问题。"""
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "system",
                        "content": "你是任务拆分器。若用户只有一个清晰的数据统计/查询意图，输出 {\"parts\":[\"原句\"]}"
                        "；若明显包含多个彼此独立、需分别查库的子问题，拆成多条互不依赖的中文问句。"
                        "只输出合法 JSON，不要 markdown。",
                    },
                    {"role": "user", "content": user_query},
                ],
                temperature=0,
                max_tokens=500,
            )
            raw = response.choices[0].message.content.strip()
            if "```" in raw:
                raw = raw.split("```", 1)[-1].replace("json", "", 1).strip()
                if "```" in raw:
                    raw = raw.split("```")[0].strip()
            data = json.loads(raw)
            parts = data.get("parts") or []
            parts = [p.strip() for p in parts if isinstance(p, str) and p.strip()]
            if not parts:
                return [user_query]
            if len(parts) > 6:
                parts = parts[:6]
            return parts
        except Exception as e:
            logger.warning(f"decompose fallback: {e}")
            return [user_query]

    async def _list_collection_names(self) -> List[str]:
        names = await self.db.list_collection_names()
        return sorted(n for n in names if not str(n).startswith("system."))

    def _serialize_rows(self, results: List[Dict]) -> List[Dict]:
        for r in results:
            for k, v in list(r.items()):
                if hasattr(v, "__str__") and type(v).__name__ == "ObjectId":
                    r[k] = str(v)
                elif isinstance(v, datetime):
                    r[k] = v.isoformat()
                elif isinstance(v, list):
                    r[k] = [str(item) if hasattr(item, "isoformat") else item for item in v]
        return results

    async def _execute_aggregate(
        self, collection_name: str, pipeline: List, explanation: str
    ) -> Tuple[List[Dict], str, Optional[str]]:
        """执行聚合；失败时沿用原先的 find 简化逻辑。返回 (rows, explanation, error_msg)。"""
        pipeline = _replace_date_strings(pipeline)
        collection = self.db[collection_name]
        err_msg: Optional[str] = None
        try:
            results = await collection.aggregate(pipeline).to_list(100)
        except Exception as agg_err:
            err_msg = str(agg_err)
            logger.warning(f"Aggregation failed ({agg_err}), falling back to simple find")
            match_filter: Dict = {}
            for stage in pipeline:
                if isinstance(stage, dict) and "$match" in stage:
                    match_filter = stage["$match"]
                    break
            cursor = collection.find(match_filter, {"_id": 0}).limit(100)
            results = await cursor.to_list(100)
            explanation += "（注：复杂查询已自动简化为基础查询）"
        self._serialize_rows(results)
        return results, explanation, err_msg

    async def _tool_list_collections(self) -> str:
        names = await self._list_collection_names()
        return json.dumps({"collections": names}, ensure_ascii=False)

    async def _tool_run_aggregate_body(self, args: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """执行 run_aggregate 工具，返回 (tool_content_json_str, meta_for_last_good)。"""
        collection_name = args.get("collection") or ""
        pipeline = args.get("pipeline") or []
        chart_type = args.get("chart_type") or "table"
        chart_title = args.get("chart_title") or "查询结果"
        explanation = args.get("explanation") or ""
        meta = {
            "collection": collection_name,
            "pipeline_explanation": explanation,
            "chart_type": chart_type,
            "chart_title": chart_title,
            "data": [],
        }
        if not collection_name:
            return json.dumps({"ok": False, "error": "缺少 collection"}, ensure_ascii=False), meta
        try:
            rows, expl, agg_err = await self._execute_aggregate(collection_name, pipeline, explanation)
            meta["data"] = rows
            meta["pipeline_explanation"] = expl
            payload = {
                "ok": True,
                "row_count": len(rows),
                "preview": rows[:5],
                "chart_type": chart_type,
                "chart_title": chart_title,
            }
            if agg_err:
                payload["warning"] = f"聚合报错已降级：{agg_err}"
            return json.dumps(payload, ensure_ascii=False, default=str), meta
        except Exception as e:
            return json.dumps({"ok": False, "error": str(e)}, ensure_ascii=False), meta

    def _parse_assistant_json_plan(self, content: str) -> Optional[Dict[str, Any]]:
        if not content:
            return None
        text = content.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return None

    async def _legacy_json_chat(
        self, user_query: str, ctx: List[Dict[str, str]], trace: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """保留原先「单次补全 + JSON 计划」整条链路，供工具循环未产出结果时使用。"""
        messages = [{"role": "system", "content": SYSTEM_PROMPT}, *ctx, {"role": "user", "content": user_query}]
        response = self.client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            temperature=0.1,
        )
        content = (response.choices[0].message.content or "").strip()
        logger.info(f"DeepSeek legacy raw response: {content[:500]}")
        trace.append({"type": "legacy_json", "note": "工具循环未收敛，回退到 JSON 计划模式"})
        query_plan = self._parse_assistant_json_plan(content)
        if not query_plan:
            return {"error": "AI 返回格式异常，请重试"}
        collection_name = query_plan.get("collection", "")
        pipeline = query_plan.get("pipeline", [])
        chart_type = query_plan.get("chart_type", "table")
        chart_title = query_plan.get("chart_title", "查询结果")
        explanation = query_plan.get("explanation", "")
        results, explanation, _ = await self._execute_aggregate(collection_name, pipeline, explanation)
        summary = await self._generate_summary(user_query, results)
        return {
            "query": user_query,
            "collection": collection_name,
            "pipeline_explanation": explanation,
            "chart_type": chart_type,
            "chart_title": chart_title,
            "data": results,
            "summary": summary,
        }

    async def _tool_loop_resolve(
        self, user_query: str, ctx: List[Dict[str, str]], trace: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """多轮工具调用：list_collections / run_aggregate，失败时由模型根据 error 重试。"""
        messages: List[Dict[str, Any]] = [
            {"role": "system", "content": TOOL_SYSTEM_PROMPT},
            *ctx,
            {"role": "user", "content": user_query},
        ]
        last_good: Optional[Dict[str, Any]] = None
        final_text = ""

        for round_i in range(MAX_TOOL_ROUNDS):
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=messages,
                tools=_agent_tools(),
                tool_choice="auto",
                temperature=0.1,
            )
            choice = response.choices[0]
            msg = choice.message
            finish = choice.finish_reason

            if msg.tool_calls:
                assistant_msg: Dict[str, Any] = {
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {"name": tc.function.name, "arguments": tc.function.arguments or "{}"},
                        }
                        for tc in msg.tool_calls
                    ],
                }
                messages.append(assistant_msg)

                for tc in msg.tool_calls:
                    name = tc.function.name
                    raw_args = tc.function.arguments or "{}"
                    try:
                        args = json.loads(raw_args)
                    except json.JSONDecodeError:
                        args = {}
                    trace.append({"type": "tool_call", "round": round_i, "name": name, "arguments": raw_args[:2000]})

                    if name == "list_collections":
                        out = await self._tool_list_collections()
                        messages.append({"role": "tool", "tool_call_id": tc.id, "content": out})
                        trace.append({"type": "tool_result", "name": name, "ok": True})
                    elif name == "run_aggregate":
                        body, meta = await self._tool_run_aggregate_body(args)
                        messages.append({"role": "tool", "tool_call_id": tc.id, "content": body})
                        body_obj = json.loads(body)
                        trace.append(
                            {
                                "type": "tool_result",
                                "name": name,
                                "ok": body_obj.get("ok"),
                                "error": body_obj.get("error"),
                                "row_count": body_obj.get("row_count"),
                            }
                        )
                        if body_obj.get("ok"):
                            last_good = meta
                    else:
                        messages.append(
                            {
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "content": json.dumps({"ok": False, "error": f"未知工具 {name}"}),
                            }
                        )
                continue

            final_text = (msg.content or "").strip()
            if last_good:
                summary = await self._generate_summary(user_query, last_good["data"])
                if final_text:
                    summary = f"{final_text}\n\n{summary}"
                out = {
                    "query": user_query,
                    "collection": last_good["collection"],
                    "pipeline_explanation": last_good["pipeline_explanation"],
                    "chart_type": last_good["chart_type"],
                    "chart_title": last_good["chart_title"],
                    "data": last_good["data"],
                    "summary": summary,
                }
                trace.append({"type": "final", "round": round_i, "finish": finish})
                return out

            plan = self._parse_assistant_json_plan(final_text)
            if plan and plan.get("collection") and plan.get("pipeline") is not None:
                trace.append({"type": "text_json_plan", "round": round_i})
                collection_name = plan.get("collection", "")
                pipeline = plan.get("pipeline", [])
                chart_type = plan.get("chart_type", "table")
                chart_title = plan.get("chart_title", "查询结果")
                explanation = plan.get("explanation", "")
                results, explanation, _ = await self._execute_aggregate(collection_name, pipeline, explanation)
                summary = await self._generate_summary(user_query, results)
                return {
                    "query": user_query,
                    "collection": collection_name,
                    "pipeline_explanation": explanation,
                    "chart_type": chart_type,
                    "chart_title": chart_title,
                    "data": results,
                    "summary": summary,
                }

            trace.append({"type": "no_data", "round": round_i, "finish": finish, "hint": final_text[:300]})
            return {"error": "未能从数据库得到有效结果，请换一种问法试试。"}

        trace.append({"type": "abort", "reason": "max_tool_rounds"})
        return {"error": "工具调用轮数过多，请简化问题后重试。"}

    async def _merge_multi_subtask(
        self, user_query: str, parts: List[str], sub_outputs: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """合并多子任务的结果与解读"""
        lines = []
        for i, (p, o) in enumerate(zip(parts, sub_outputs)):
            if o.get("error"):
                lines.append(f"子问题{i+1}「{p}」：{o['error']}")
            else:
                lines.append(
                    f"子问题{i+1}「{p}」：{o.get('summary','')}（{o.get('chart_title','')}，{len(o.get('data') or [])} 条）"
                )
        merged_summary = "\n".join(lines)
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "system",
                        "content": "你是数据分析师。用户在一次提问中完成了多个子查询。请用 3-6 句中文综合解读整体结论与关联，不要重复罗列原始数字。",
                    },
                    {"role": "user", "content": f"总问题：{user_query}\n\n各子结果摘要：\n{merged_summary}"},
                ],
                temperature=0.3,
                max_tokens=500,
            )
            merged_summary = response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"merge summary failed: {e}")

        last = sub_outputs[-1]
        return {
            "query": user_query,
            "collection": last.get("collection", ""),
            "pipeline_explanation": "；".join(
                str(o.get("pipeline_explanation", "")) for o in sub_outputs if not o.get("error")
            ),
            "chart_type": last.get("chart_type", "table"),
            "chart_title": f"多步分析（{len(parts)} 个子问题）",
            "data": last.get("data") or [],
            "summary": merged_summary,
        }

    async def _generate_summary(self, query: str, data: list) -> str:
        if not data:
            return "查询未返回数据。"
        try:
            data_preview = json.dumps(data[:10], ensure_ascii=False, default=str)
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "你是数据分析师。根据用户问题和查询结果，用简洁的中文给出数据解读（2-4句话）。如果发现异常趋势要指出。"},
                    {"role": "user", "content": f"问题：{query}\n\n数据：{data_preview}"},
                ],
                temperature=0.3,
                max_tokens=300,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.warning(f"Summary generation failed: {e}")
            return f"共返回 {len(data)} 条数据。"
