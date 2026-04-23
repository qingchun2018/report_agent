"""报表统计服务：漏洞统计、版本统计、GitHub 趋势分析"""
from datetime import datetime, timedelta
from typing import Dict, Any, List
from motor.motor_asyncio import AsyncIOMotorDatabase


class StatsService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    async def get_dashboard_summary(self) -> Dict[str, Any]:
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        total_vulns = await self.db.vulnerabilities.count_documents({})
        open_vulns = await self.db.vulnerabilities.count_documents({"status": "open"})
        critical_vulns = await self.db.vulnerabilities.count_documents({"severity": "critical"})
        new_this_week = await self.db.vulnerabilities.count_documents({"published_date": {"$gte": week_ago}})
        new_this_month = await self.db.vulnerabilities.count_documents({"published_date": {"$gte": month_ago}})
        total_versions = await self.db.versions.count_documents({})
        total_packages = len(await self.db.versions.distinct("name"))

        return {
            "total_vulns": total_vulns,
            "open_vulns": open_vulns,
            "critical_vulns": critical_vulns,
            "new_this_week": new_this_week,
            "new_this_month": new_this_month,
            "total_versions": total_versions,
            "total_packages": total_packages,
        }

    async def get_vuln_by_severity(self) -> List[Dict]:
        pipeline = [
            {"$group": {"_id": "$severity", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        results = await self.db.vulnerabilities.aggregate(pipeline).to_list(None)
        return [{"severity": r["_id"], "count": r["count"]} for r in results]

    async def get_vuln_by_status(self) -> List[Dict]:
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        results = await self.db.vulnerabilities.aggregate(pipeline).to_list(None)
        return [{"status": r["_id"], "count": r["count"]} for r in results]

    async def get_vuln_trend(self, days: int = 30) -> List[Dict]:
        now = datetime.now()
        start = now - timedelta(days=days)
        try:
            pipeline = [
                {"$match": {"published_date": {"$gte": start}}},
                {"$group": {
                    "_id": {"$dateToString": {"format": "%Y-%m-%d", "date": "$published_date"}},
                    "count": {"$sum": 1},
                }},
                {"$sort": {"_id": 1}},
            ]
            results = await self.db.vulnerabilities.aggregate(pipeline).to_list(None)
            return [{"date": r["_id"], "count": r["count"]} for r in results]
        except Exception:
            # Fallback for mock DB that doesn't support $dateToString
            cursor = self.db.vulnerabilities.find({"published_date": {"$gte": start}})
            docs = await cursor.to_list(None)
            from collections import Counter
            counts = Counter(d["published_date"].strftime("%Y-%m-%d") for d in docs if d.get("published_date"))
            return [{"date": k, "count": v} for k, v in sorted(counts.items())]

    async def get_vuln_by_package(self) -> List[Dict]:
        pipeline = [
            {"$group": {"_id": "$package", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10},
        ]
        results = await self.db.vulnerabilities.aggregate(pipeline).to_list(None)
        return [{"package": r["_id"], "count": r["count"]} for r in results]

    async def get_github_trending(self, days: int = 7) -> List[Dict]:
        now = datetime.now()
        start = now - timedelta(days=days)
        try:
            pipeline = [
                {"$match": {"snapshot_date": {"$gte": start}}},
                {"$sort": {"snapshot_date": -1}},
                {"$group": {
                    "_id": "$repo_name",
                    "latest_stars": {"$first": "$stars"},
                    "owner": {"$first": "$owner"},
                    "description": {"$first": "$description"},
                    "language": {"$first": "$language"},
                    "total_stars_gained": {"$sum": "$stars_today"},
                    "avg_daily_stars": {"$avg": "$stars_today"},
                    "latest_forks": {"$first": "$forks"},
                }},
                {"$sort": {"total_stars_gained": -1}},
                {"$limit": 10},
            ]
            results = await self.db.github_trends.aggregate(pipeline).to_list(None)
            return [{
                "repo": r["_id"],
                "owner": r["owner"],
                "description": r["description"],
                "language": r["language"],
                "stars": r["latest_stars"],
                "stars_gained": r["total_stars_gained"],
                "avg_daily": round(r["avg_daily_stars"], 1),
                "forks": r["latest_forks"],
            } for r in results]
        except Exception:
            # Fallback for mock DB
            cursor = self.db.github_trends.find({"snapshot_date": {"$gte": start}})
            docs = await cursor.to_list(None)
            from collections import defaultdict
            grouped = defaultdict(list)
            for d in docs:
                grouped[d["repo_name"]].append(d)
            results = []
            for repo_name, entries in grouped.items():
                entries.sort(key=lambda x: x["snapshot_date"], reverse=True)
                latest = entries[0]
                total_gained = sum(e.get("stars_today", 0) for e in entries)
                avg_daily = total_gained / len(entries) if entries else 0
                results.append({
                    "repo": repo_name,
                    "owner": latest.get("owner", ""),
                    "description": latest.get("description", ""),
                    "language": latest.get("language", ""),
                    "stars": latest.get("stars", 0),
                    "stars_gained": total_gained,
                    "avg_daily": round(avg_daily, 1),
                    "forks": latest.get("forks", 0),
                })
            results.sort(key=lambda x: x["stars_gained"], reverse=True)
            return results[:10]

    async def get_github_star_history(self, repo_name: str, days: int = 30) -> List[Dict]:
        now = datetime.now()
        start = now - timedelta(days=days)
        try:
            pipeline = [
                {"$match": {"repo_name": repo_name, "snapshot_date": {"$gte": start}}},
                {"$sort": {"snapshot_date": 1}},
                {"$project": {
                    "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$snapshot_date"}},
                    "stars": 1,
                    "stars_today": 1,
                }},
            ]
            results = await self.db.github_trends.aggregate(pipeline).to_list(None)
            return [{"date": r["date"], "stars": r["stars"], "daily": r["stars_today"]} for r in results]
        except Exception:
            cursor = self.db.github_trends.find(
                {"repo_name": repo_name, "snapshot_date": {"$gte": start}}
            ).sort("snapshot_date", 1)
            docs = await cursor.to_list(None)
            return [{"date": d["snapshot_date"].strftime("%Y-%m-%d"), "stars": d["stars"], "daily": d.get("stars_today", 0)} for d in docs]

    async def detect_trending_anomalies(self, threshold: float = 3.0) -> List[Dict]:
        """检测 Star 增速异常的项目（日增 > 均值 * threshold 倍）"""
        now = datetime.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        repos = await self.db.github_trends.distinct("repo_name")
        anomalies = []
        for repo in repos:
            month_data = await self.db.github_trends.find(
                {"repo_name": repo, "snapshot_date": {"$gte": month_ago, "$lt": week_ago}}
            ).to_list(None)
            week_data = await self.db.github_trends.find(
                {"repo_name": repo, "snapshot_date": {"$gte": week_ago}}
            ).to_list(None)
            if not month_data or not week_data:
                continue
            avg_before = sum(d["stars_today"] for d in month_data) / len(month_data)
            avg_recent = sum(d["stars_today"] for d in week_data) / len(week_data)
            if avg_before > 0 and avg_recent > avg_before * threshold:
                anomalies.append({
                    "repo": repo,
                    "avg_daily_before": round(avg_before, 1),
                    "avg_daily_recent": round(avg_recent, 1),
                    "growth_ratio": round(avg_recent / avg_before, 1),
                    "alert": "TRENDING",
                })
        anomalies.sort(key=lambda x: x["growth_ratio"], reverse=True)
        return anomalies

    # ─── OpenRank 指标 ───

    async def get_openrank_ranking(self, limit: int = 20) -> List[Dict]:
        """获取最新月份的 OpenRank 排名"""
        cursor = self.db.openrank_metrics.find({}, {"_id": 0}).sort([("month", -1), ("openrank", -1)])
        docs = await cursor.to_list(500)
        if not docs:
            return []
        latest_month = docs[0]["month"]
        latest = [d for d in docs if d["month"] == latest_month]
        latest.sort(key=lambda x: x["openrank"], reverse=True)
        return [{
            "repo": d["repo_name"],
            "owner": d["owner"],
            "openrank": d["openrank"],
            "activity": d["activity"],
            "bus_factor": d["bus_factor"],
            "participants": d["participants"],
            "new_contributors": d["new_contributors"],
            "attention": d["attention"],
            "month": d["month"],
        } for d in latest[:limit]]

    async def get_openrank_trend(self, repo_name: str) -> List[Dict]:
        """获取某项目的 OpenRank 趋势（12 个月）"""
        cursor = self.db.openrank_metrics.find(
            {"repo_name": repo_name}, {"_id": 0, "month": 1, "openrank": 1, "activity": 1, "bus_factor": 1, "participants": 1}
        ).sort("month", 1)
        return await cursor.to_list(None)

    async def get_openrank_overview(self) -> Dict[str, Any]:
        """OpenRank 总览仪表盘数据"""
        cursor = self.db.openrank_metrics.find({}, {"_id": 0}).sort("month", -1)
        all_docs = await cursor.to_list(500)
        if not all_docs:
            return {"ranking": [], "top_active": [], "health_scores": [], "growth_leaders": []}

        latest_month = all_docs[0]["month"]
        latest = [d for d in all_docs if d["month"] == latest_month]
        latest.sort(key=lambda x: x["openrank"], reverse=True)

        # 排名
        ranking = [{
            "rank": i + 1, "repo": d["repo_name"], "owner": d["owner"],
            "openrank": d["openrank"], "activity": d["activity"],
            "bus_factor": d["bus_factor"], "participants": d["participants"],
            "new_contributors": d["new_contributors"],
            "pr_merged": d.get("pr_merged", 0), "issues_closed": d.get("issues_closed", 0),
            "attention": d["attention"], "technical_fork": d.get("technical_fork", 0),
        } for i, d in enumerate(latest)]

        # 活跃度 Top 10
        by_activity = sorted(latest, key=lambda x: x["activity"], reverse=True)[:10]
        top_active = [{"repo": d["repo_name"], "activity": d["activity"]} for d in by_activity]

        # 健康度评分（综合 bus_factor、issue 关闭率、PR 合并数）
        health_scores = []
        for d in latest:
            issue_rate = d["issues_closed"] / max(d["issues_new"], 1)
            bf_score = min(d["bus_factor"] / 10, 1.0)
            pr_score = min(d.get("pr_merged", 0) / 50, 1.0)
            health = round((issue_rate * 0.3 + bf_score * 0.4 + pr_score * 0.3) * 100, 1)
            health_scores.append({"repo": d["repo_name"], "health": min(health, 100), "bus_factor": d["bus_factor"]})
        health_scores.sort(key=lambda x: x["health"], reverse=True)

        # 增长最快（对比倒数第 2 个月）
        months = sorted(set(d["month"] for d in all_docs), reverse=True)
        growth_leaders = []
        if len(months) >= 2:
            prev_month = months[1]
            prev = {d["repo_name"]: d for d in all_docs if d["month"] == prev_month}
            for d in latest:
                prev_d = prev.get(d["repo_name"])
                if prev_d and prev_d["openrank"] > 0:
                    growth = round((d["openrank"] - prev_d["openrank"]) / prev_d["openrank"] * 100, 1)
                    growth_leaders.append({"repo": d["repo_name"], "growth_pct": growth, "current": d["openrank"], "previous": prev_d["openrank"]})
            growth_leaders.sort(key=lambda x: x["growth_pct"], reverse=True)

        return {
            "ranking": ranking,
            "top_active": top_active,
            "health_scores": health_scores,
            "growth_leaders": growth_leaders[:10],
        }

    async def get_license_risk_distribution(self) -> List[Dict]:
        pipeline = [
            {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        results = await self.db.licenses.aggregate(pipeline).to_list(None)
        return [{"risk_level": r["_id"], "count": r["count"]} for r in results]

    async def get_vuln_source_distribution(self) -> List[Dict]:
        pipeline = [
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
        ]
        results = await self.db.vulnerabilities.aggregate(pipeline).to_list(None)
        return [{"source": r["_id"], "count": r["count"]} for r in results]

    async def get_top_critical_vulns(self, limit: int = 10) -> List[Dict]:
        cursor = self.db.vulnerabilities.find(
            {"severity": {"$in": ["critical", "high"]}},
            {"_id": 0, "cve_id": 1, "title": 1, "severity": 1, "package": 1, "cvss_score": 1, "status": 1}
        ).sort("cvss_score", -1).limit(limit)
        docs = await cursor.to_list(limit)
        return docs

    # ─── Hive 表数据差异 ───

    async def get_hive_table_pairs(self) -> List[Dict]:
        """获取所有 Hive 表对（含库名、存储格式等元信息），不重复"""
        pipeline = [
            {"$group": {
                "_id": {"src": "$source_table", "tgt": "$target_table"},
                "source_layer": {"$first": "$source_layer"},
                "target_layer": {"$first": "$target_layer"},
                "source_db": {"$first": "$source_db"},
                "target_db": {"$first": "$target_db"},
                "source_storage": {"$first": "$source_storage"},
                "target_storage": {"$first": "$target_storage"},
                "partition_field": {"$first": "$partition_field"},
                "source_columns": {"$first": "$source_columns"},
                "target_columns": {"$first": "$target_columns"},
                "comment": {"$first": "$comment"},
            }},
            {"$sort": {"_id.src": 1}},
        ]
        try:
            results = await self.db.hive_table_diffs.aggregate(pipeline).to_list(None)
        except Exception:
            docs = await self.db.hive_table_diffs.find({}).to_list(None)
            seen = {}
            for d in docs:
                key = (d["source_table"], d["target_table"])
                if key not in seen:
                    seen[key] = d
            results = [{"_id": {"src": k[0], "tgt": k[1]}, **{
                f: v.get(f, "") for f in [
                    "source_layer", "target_layer", "source_db", "target_db",
                    "source_storage", "target_storage", "partition_field",
                    "source_columns", "target_columns", "comment",
                ]}} for k, v in seen.items()]
        return [{
            "source_table": r["_id"]["src"],
            "target_table": r["_id"]["tgt"],
            "source_layer": r.get("source_layer", ""),
            "target_layer": r.get("target_layer", ""),
            "source_db": r.get("source_db", ""),
            "target_db": r.get("target_db", ""),
            "source_storage": r.get("source_storage", ""),
            "target_storage": r.get("target_storage", ""),
            "partition_field": r.get("partition_field", "dt"),
            "source_columns": r.get("source_columns", 0),
            "target_columns": r.get("target_columns", 0),
            "comment": r.get("comment", ""),
        } for r in results]

    async def get_hive_diff_list(self, source_table: str = None, target_table: str = None,
                                  compare_date: str = None, limit: int = 50) -> List[Dict]:
        """查询 Hive 表差异记录"""
        query_filter = {}
        if source_table:
            query_filter["source_table"] = source_table
        if target_table:
            query_filter["target_table"] = target_table
        if compare_date:
            query_filter["compare_date"] = compare_date

        cursor = self.db.hive_table_diffs.find(query_filter, {"_id": 0}).sort("compare_date", -1).limit(limit)
        return await cursor.to_list(limit)

    async def get_hive_diff_trend(self, source_table: str, target_table: str, days: int = 30) -> List[Dict]:
        """某对表的差异趋势"""
        cursor = self.db.hive_table_diffs.find(
            {"source_table": source_table, "target_table": target_table},
            {"_id": 0, "compare_date": 1, "diff_count": 1, "match_rate": 1,
             "total_source_rows": 1, "total_target_rows": 1}
        ).sort("compare_date", -1).limit(days)
        docs = await cursor.to_list(days)
        docs.reverse()
        return docs

    # ─── 年报数据 ───

    async def get_annual_years(self) -> List[int]:
        """获取有数据的年份列表"""
        years = await self.db.annual_reports.distinct("year")
        return sorted(years, reverse=True)

    async def get_annual_metrics(self, year: int, category: str = None) -> List[Dict]:
        """获取指定年份的月度指标数据"""
        query_filter = {"year": year}
        if category:
            query_filter["category"] = category
        cursor = self.db.annual_reports.find(query_filter, {"_id": 0}).sort([("metric_key", 1), ("month", 1)])
        return await cursor.to_list(None)

    async def get_annual_comparison(self, year: int, category: str = None) -> Dict[str, Any]:
        """年报：同比 & 环比分析"""
        query_current = {"year": year}
        query_prev = {"year": year - 1}
        if category:
            query_current["category"] = category
            query_prev["category"] = category

        current_docs = await self.db.annual_reports.find(query_current, {"_id": 0}).to_list(None)
        prev_docs = await self.db.annual_reports.find(query_prev, {"_id": 0}).to_list(None)

        prev_map = {}
        for d in prev_docs:
            prev_map[(d["metric_key"], d["month"])] = d["value"]

        metrics_by_key = {}
        for d in current_docs:
            key = d["metric_key"]
            if key not in metrics_by_key:
                metrics_by_key[key] = {
                    "metric_key": key,
                    "metric_label": d["metric_label"],
                    "unit": d["unit"],
                    "category": d["category"],
                    "monthly_data": [],
                }
            prev_val = prev_map.get((key, d["month"]))
            yoy = round((d["value"] - prev_val) / prev_val * 100, 1) if prev_val and prev_val != 0 else None

            months_data = metrics_by_key[key]["monthly_data"]
            last_val = months_data[-1]["value"] if months_data else None
            mom = round((d["value"] - last_val) / last_val * 100, 1) if last_val and last_val != 0 else None

            months_data.append({
                "month": d["month"],
                "period": d["period"],
                "value": d["value"],
                "yoy": yoy,
                "mom": mom,
            })

        yearly_summary = []
        for key, info in metrics_by_key.items():
            current_total = sum(m["value"] for m in info["monthly_data"])
            prev_total = sum(prev_map.get((key, m), 0) for m in range(1, 13))
            yoy_total = round((current_total - prev_total) / prev_total * 100, 1) if prev_total > 0 else None
            yearly_summary.append({
                "metric_key": key,
                "metric_label": info["metric_label"],
                "unit": info["unit"],
                "category": info["category"],
                "current_year_total": round(current_total, 2),
                "prev_year_total": round(prev_total, 2),
                "yoy_pct": yoy_total,
            })

        return {
            "year": year,
            "prev_year": year - 1,
            "metrics": list(metrics_by_key.values()),
            "yearly_summary": yearly_summary,
        }

    async def generate_report(self, period: str = "weekly") -> Dict[str, Any]:
        days_map = {"daily": 1, "weekly": 7, "monthly": 30}
        days = days_map.get(period, 7)

        summary = await self.get_dashboard_summary()
        vuln_trend = await self.get_vuln_trend(days if period != "daily" else 7)
        by_severity = await self.get_vuln_by_severity()
        by_status = await self.get_vuln_by_status()
        by_package = await self.get_vuln_by_package()
        trending = await self.get_github_trending(days)
        anomalies = await self.detect_trending_anomalies()
        license_risk = await self.get_license_risk_distribution()
        vuln_sources = await self.get_vuln_source_distribution()
        top_critical = await self.get_top_critical_vulns()

        return {
            "period": period,
            "generated_at": datetime.now().isoformat(),
            "summary": summary,
            "vuln_trend": vuln_trend,
            "vuln_by_severity": by_severity,
            "vuln_by_status": by_status,
            "vuln_by_package": by_package,
            "github_trending": trending,
            "anomalies": anomalies,
            "license_risk": license_risk,
            "vuln_sources": vuln_sources,
            "top_critical": top_critical,
        }
