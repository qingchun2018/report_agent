"""生成丰富的模拟数据并写入 MongoDB"""
import random
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase


VULN_TITLES = [
    "Remote Code Execution in {pkg}", "SQL Injection in {pkg} ORM",
    "XSS via Unsanitized Input in {pkg}", "Buffer Overflow in {pkg}",
    "Privilege Escalation via {pkg}", "Denial of Service in {pkg}",
    "Path Traversal in {pkg}", "CSRF Token Bypass in {pkg}",
    "Memory Leak in {pkg} Streams", "Authentication Bypass in {pkg}",
    "Deserialization Vulnerability in {pkg}", "XML External Entity in {pkg}",
    "Integer Overflow in {pkg}", "Race Condition in {pkg} Cluster",
    "Insecure Default Configuration in {pkg}", "Certificate Validation Bypass in {pkg}",
    "Heap Corruption in {pkg}", "Command Injection in {pkg}",
    "Information Disclosure in {pkg} API", "Weak Encryption in {pkg}",
    "Server-Side Request Forgery in {pkg}", "Prototype Pollution in {pkg}",
    "ReDoS in {pkg} Parser", "Arbitrary File Write via {pkg}",
    "Use-After-Free in {pkg} Runtime", "Null Pointer Dereference in {pkg}",
    "Improper Input Validation in {pkg}", "Cleartext Storage in {pkg}",
    "Open Redirect in {pkg}", "Timing Side-Channel in {pkg} Auth",
]

PACKAGES = [
    ("openssl", ["3.0.1", "3.0.2", "3.0.7", "3.1.0", "3.1.1", "3.2.0", "3.3.0"]),
    ("django", ["4.1.0", "4.2.0", "4.2.1", "4.2.8", "5.0.0", "5.0.1", "5.1.0"]),
    ("react", ["18.2.0", "18.3.0", "18.3.1", "19.0.0", "19.0.1"]),
    ("numpy", ["1.24.0", "1.25.0", "1.26.0", "1.26.4", "2.0.0", "2.1.0"]),
    ("fastapi", ["0.100.0", "0.104.0", "0.109.0", "0.110.0", "0.111.0"]),
    ("spring-boot", ["3.0.0", "3.1.0", "3.2.0", "3.2.5", "3.3.0", "3.4.0"]),
    ("kubernetes", ["1.27.0", "1.28.0", "1.29.0", "1.30.0", "1.31.0"]),
    ("redis", ["7.0.0", "7.2.0", "7.2.4", "7.4.0", "7.4.2"]),
    ("nginx", ["1.24.0", "1.25.0", "1.25.4", "1.27.0", "1.27.3"]),
    ("node", ["18.0.0", "20.0.0", "20.11.0", "22.0.0", "22.5.0"]),
    ("pytorch", ["2.0.0", "2.1.0", "2.2.0", "2.3.0", "2.4.0"]),
    ("tensorflow", ["2.13.0", "2.14.0", "2.15.0", "2.16.0", "2.17.0"]),
    ("flask", ["2.3.0", "2.3.3", "3.0.0", "3.0.2", "3.1.0"]),
    ("express", ["4.18.0", "4.18.2", "4.19.0", "4.20.0", "5.0.0"]),
    ("log4j", ["2.17.0", "2.17.1", "2.19.0", "2.20.0", "2.23.0"]),
    ("curl", ["7.88.0", "8.0.0", "8.4.0", "8.7.0", "8.9.0"]),
    ("golang", ["1.20.0", "1.21.0", "1.22.0", "1.23.0", "1.24.0"]),
    ("rust", ["1.70.0", "1.72.0", "1.75.0", "1.78.0", "1.80.0"]),
    ("postgres", ["15.0", "15.4", "16.0", "16.2", "17.0"]),
    ("elasticsearch", ["8.8.0", "8.10.0", "8.12.0", "8.14.0", "8.15.0"]),
]

LICENSES = [
    {"name": "MIT License", "spdx_id": "MIT", "risk_level": "low",
     "permissions": ["commercial-use", "modification", "distribution", "private-use"],
     "limitations": ["liability", "warranty"], "conditions": ["include-copyright"]},
    {"name": "Apache License 2.0", "spdx_id": "Apache-2.0", "risk_level": "low",
     "permissions": ["commercial-use", "modification", "distribution", "patent-use", "private-use"],
     "limitations": ["liability", "warranty", "trademark-use"], "conditions": ["include-copyright", "document-changes"]},
    {"name": "GNU GPLv3", "spdx_id": "GPL-3.0", "risk_level": "high",
     "permissions": ["commercial-use", "modification", "distribution", "patent-use", "private-use"],
     "limitations": ["liability", "warranty"], "conditions": ["include-copyright", "document-changes", "disclose-source", "same-license"]},
    {"name": "BSD 3-Clause", "spdx_id": "BSD-3-Clause", "risk_level": "low",
     "permissions": ["commercial-use", "modification", "distribution", "private-use"],
     "limitations": ["liability", "warranty"], "conditions": ["include-copyright"]},
    {"name": "GNU LGPLv3", "spdx_id": "LGPL-3.0", "risk_level": "medium",
     "permissions": ["commercial-use", "modification", "distribution", "patent-use", "private-use"],
     "limitations": ["liability", "warranty"], "conditions": ["include-copyright", "disclose-source", "same-license--library"]},
    {"name": "Mozilla Public License 2.0", "spdx_id": "MPL-2.0", "risk_level": "medium",
     "permissions": ["commercial-use", "modification", "distribution", "patent-use", "private-use"],
     "limitations": ["liability", "warranty", "trademark-use"], "conditions": ["disclose-source", "include-copyright"]},
    {"name": "GNU AGPLv3", "spdx_id": "AGPL-3.0", "risk_level": "high",
     "permissions": ["commercial-use", "modification", "distribution", "patent-use", "private-use"],
     "limitations": ["liability", "warranty"], "conditions": ["include-copyright", "document-changes", "disclose-source", "same-license", "network-use-disclose"]},
    {"name": "ISC License", "spdx_id": "ISC", "risk_level": "low",
     "permissions": ["commercial-use", "modification", "distribution"], "limitations": ["liability", "warranty"], "conditions": ["include-copyright"]},
    {"name": "Unlicense", "spdx_id": "Unlicense", "risk_level": "low",
     "permissions": ["commercial-use", "modification", "distribution", "private-use"],
     "limitations": ["liability", "warranty"], "conditions": []},
    {"name": "SSPL", "spdx_id": "SSPL-1.0", "risk_level": "high",
     "permissions": ["modification", "distribution"],
     "limitations": ["liability", "warranty", "commercial-use-restricted"], "conditions": ["disclose-source", "same-license", "network-use-disclose"]},
]

TRENDING_REPOS = [
    {"repo_name": "openclaw", "owner": "open-source-labs", "description": "Next-gen robotic claw controller with AI", "language": "Python", "topics": ["robotics", "ai", "hardware"]},
    {"repo_name": "deepseek-coder", "owner": "deepseek-ai", "description": "Code intelligence powered by DeepSeek", "language": "Python", "topics": ["ai", "coding", "llm"]},
    {"repo_name": "bolt.new", "owner": "stackblitz", "description": "AI-powered full-stack web development", "language": "TypeScript", "topics": ["ai", "web", "development"]},
    {"repo_name": "uv", "owner": "astral-sh", "description": "An extremely fast Python package installer", "language": "Rust", "topics": ["python", "packaging", "performance"]},
    {"repo_name": "ollama", "owner": "ollama", "description": "Get up and running with large language models locally", "language": "Go", "topics": ["llm", "local", "ai"]},
    {"repo_name": "shadcn-ui", "owner": "shadcn", "description": "Beautifully designed components", "language": "TypeScript", "topics": ["ui", "react", "components"]},
    {"repo_name": "dify", "owner": "langgenius", "description": "Open-source LLM app development platform", "language": "Python", "topics": ["llm", "platform", "ai"]},
    {"repo_name": "mise", "owner": "jdx", "description": "Dev tools version manager", "language": "Rust", "topics": ["devtools", "version-manager"]},
    {"repo_name": "zed", "owner": "zed-industries", "description": "High-performance multiplayer code editor", "language": "Rust", "topics": ["editor", "performance", "collaboration"]},
    {"repo_name": "hono", "owner": "honojs", "description": "Fast, lightweight web framework", "language": "TypeScript", "topics": ["web", "framework", "edge"]},
    {"repo_name": "cursor", "owner": "getcursor", "description": "The AI Code Editor", "language": "TypeScript", "topics": ["ai", "editor", "coding"]},
    {"repo_name": "vllm", "owner": "vllm-project", "description": "High-throughput LLM serving engine", "language": "Python", "topics": ["llm", "inference", "performance"]},
    {"repo_name": "biome", "owner": "biomejs", "description": "Performant toolchain for web projects", "language": "Rust", "topics": ["linter", "formatter", "web"]},
    {"repo_name": "pocketbase", "owner": "pocketbase", "description": "Open Source backend in 1 file", "language": "Go", "topics": ["backend", "database", "realtime"]},
    {"repo_name": "langchain", "owner": "langchain-ai", "description": "Build LLM-powered applications", "language": "Python", "topics": ["llm", "ai", "framework"]},
    {"repo_name": "bun", "owner": "oven-sh", "description": "All-in-one JavaScript runtime & toolkit", "language": "Zig", "topics": ["javascript", "runtime", "bundler"]},
    {"repo_name": "tauri", "owner": "tauri-apps", "description": "Build smaller, faster desktop apps", "language": "Rust", "topics": ["desktop", "webview", "cross-platform"]},
    {"repo_name": "llamafile", "owner": "Mozilla-Ocho", "description": "Distribute and run LLMs with a single file", "language": "C++", "topics": ["llm", "local", "portable"]},
    {"repo_name": "mojo", "owner": "modular", "description": "Programming language for AI developers", "language": "Mojo", "topics": ["ai", "language", "performance"]},
    {"repo_name": "excalidraw", "owner": "excalidraw", "description": "Virtual whiteboard for sketching", "language": "TypeScript", "topics": ["drawing", "collaboration", "whiteboard"]},
]


async def seed_database(db: AsyncIOMotorDatabase):
    """用丰富的模拟数据填充数据库"""
    existing = await db.list_collection_names()
    if "vulnerabilities" in existing:
        return False

    now = datetime.now()

    # --- 漏洞数据 (500条, 跨 365 天, 近期更密集) ---
    vulns = []
    severities = ["critical", "high", "medium", "low"]
    statuses = ["open", "in_progress", "fixed", "wont_fix"]
    for i in range(500):
        # 近 30 天的漏洞更密集（模拟真实场景：近期发现更多）
        if i < 120:
            days_ago = random.randint(0, 30)
        elif i < 250:
            days_ago = random.randint(31, 90)
        elif i < 400:
            days_ago = random.randint(91, 200)
        else:
            days_ago = random.randint(201, 365)

        pub_date = now - timedelta(days=days_ago)
        pkg_name, versions = random.choice(PACKAGES)
        affected = random.sample(versions, k=random.randint(1, min(3, len(versions))))
        sev = random.choices(severities, weights=[10, 25, 40, 25])[0]
        status = random.choices(statuses, weights=[30, 20, 40, 10])[0]
        # 近期漏洞更多是 open 状态
        if days_ago < 14:
            status = random.choices(statuses, weights=[50, 25, 15, 10])[0]
        cvss = {"critical": round(random.uniform(9.0, 10.0), 1),
                "high": round(random.uniform(7.0, 8.9), 1),
                "medium": round(random.uniform(4.0, 6.9), 1),
                "low": round(random.uniform(0.1, 3.9), 1)}[sev]
        title_tpl = random.choice(VULN_TITLES)
        vulns.append({
            "cve_id": f"CVE-2025-{10000 + i}",
            "title": title_tpl.format(pkg=pkg_name),
            "severity": sev,
            "status": status,
            "affected_versions": [f"{pkg_name}@{v}" for v in affected],
            "package": pkg_name,
            "description": f"A {sev} severity vulnerability found in {pkg_name}. "
                           f"CVSS score: {cvss}. Affected versions: {', '.join(affected)}.",
            "published_date": pub_date,
            "discovered_date": pub_date - timedelta(days=random.randint(1, 30)),
            "fixed_date": pub_date + timedelta(days=random.randint(5, 60)) if status == "fixed" else None,
            "cvss_score": cvss,
            "source": random.choice(["NVD", "GitHub Advisory", "Snyk", "OSV", "CISA KEV"]),
        })
    await db.vulnerabilities.insert_many(vulns)

    # --- 版本数据 ---
    version_docs = []
    for pkg_name, versions in PACKAGES:
        lic = random.choice(["MIT", "Apache-2.0", "GPL-3.0", "BSD-3-Clause", "ISC", "MPL-2.0"])
        for idx, v in enumerate(versions):
            release_days = 720 - idx * int(600 / max(len(versions) - 1, 1))
            version_docs.append({
                "name": pkg_name,
                "version": v,
                "release_date": now - timedelta(days=max(release_days + random.randint(-30, 30), 1)),
                "dependencies": random.sample([p[0] for p in PACKAGES if p[0] != pkg_name], k=random.randint(0, 4)),
                "vuln_count": random.randint(0, 12),
                "license": lic,
                "repo_url": f"https://github.com/{pkg_name}/{pkg_name}",
            })
    await db.versions.insert_many(version_docs)

    # --- License 数据 ---
    for lic in LICENSES:
        lic["used_by_count"] = random.randint(100, 8000)
    await db.licenses.insert_many(LICENSES)

    # --- GitHub 趋势数据（90 天快照，20 个项目） ---
    trend_docs = []
    for repo in TRENDING_REPOS:
        base_stars = random.randint(2000, 80000)
        base_forks = int(base_stars * random.uniform(0.05, 0.2))
        for day_offset in range(90):
            snapshot_date = now - timedelta(days=89 - day_offset)
            daily_stars = random.randint(20, 600)

            # 模拟爆火项目
            if repo["repo_name"] == "openclaw" and day_offset >= 80:
                daily_stars = random.randint(3000, 10000)
            elif repo["repo_name"] == "openclaw" and day_offset >= 75:
                daily_stars = random.randint(800, 3000)

            if repo["repo_name"] == "cursor" and day_offset >= 70:
                daily_stars = random.randint(1500, 5000)

            if repo["repo_name"] == "vllm" and day_offset >= 82:
                daily_stars = random.randint(2000, 6000)

            base_stars += daily_stars
            trend_docs.append({
                "repo_name": repo["repo_name"],
                "owner": repo["owner"],
                "description": repo["description"],
                "language": repo["language"],
                "stars": base_stars,
                "stars_today": daily_stars,
                "stars_week": daily_stars * random.randint(5, 7),
                "forks": base_forks + random.randint(0, day_offset * 2),
                "open_issues": random.randint(5, 300),
                "license": random.choice(["MIT", "Apache-2.0", "GPL-3.0"]),
                "topics": repo["topics"],
                "created_at": now - timedelta(days=random.randint(100, 1500)),
                "snapshot_date": snapshot_date,
            })
    await db.github_trends.insert_many(trend_docs)

    # --- OpenRank 指标数据（12 个月快照，20 个项目） ---
    openrank_docs = []
    for repo in TRENDING_REPOS:
        # 不同项目有不同的基础指标范围
        tier = random.choice(["top", "mid", "growing"])
        base_openrank = {"top": random.uniform(40, 80), "mid": random.uniform(15, 40), "growing": random.uniform(3, 15)}[tier]
        base_activity = {"top": random.uniform(500, 2000), "mid": random.uniform(100, 500), "growing": random.uniform(20, 100)}[tier]
        base_bus_factor = {"top": random.randint(8, 25), "mid": random.randint(3, 10), "growing": random.randint(1, 4)}[tier]
        base_contributors = {"top": random.randint(50, 300), "mid": random.randint(15, 60), "growing": random.randint(3, 20)}[tier]

        for month_offset in range(12):
            month_date = now - timedelta(days=(11 - month_offset) * 30)
            month_str = month_date.strftime("%Y-%m")

            # 模拟自然增长 + 波动
            growth = 1 + month_offset * random.uniform(0.01, 0.05)
            noise = random.uniform(0.85, 1.15)

            # openclaw 爆发式增长
            if repo["repo_name"] == "openclaw" and month_offset >= 9:
                growth *= (1 + (month_offset - 8) * 0.8)
            # cursor 稳定增长
            if repo["repo_name"] == "cursor" and month_offset >= 6:
                growth *= 1.3
            # vllm 近期爆发
            if repo["repo_name"] == "vllm" and month_offset >= 10:
                growth *= 2.0

            openrank_val = round(base_openrank * growth * noise, 2)
            activity_val = round(base_activity * growth * noise, 2)
            bus_factor_val = max(1, int(base_bus_factor * min(growth, 2.0) * random.uniform(0.8, 1.2)))
            participants = max(1, int(base_contributors * growth * random.uniform(0.7, 1.3)))
            new_contributors = max(0, int(participants * random.uniform(0.05, 0.25)))
            code_add = random.randint(500, 50000) * max(1, int(growth))
            code_remove = int(code_add * random.uniform(0.1, 0.6))
            code_sum = code_add + code_remove
            issues_new = random.randint(5, 200) * max(1, int(growth * 0.5))
            issues_closed = int(issues_new * random.uniform(0.5, 0.95))
            pr_merged = random.randint(3, 150) * max(1, int(growth * 0.5))
            pr_open = random.randint(1, 50)
            change_requests = random.randint(0, int(pr_merged * 0.3))
            change_requests_accepted = int(change_requests * random.uniform(0.6, 1.0))

            openrank_docs.append({
                "repo_name": repo["repo_name"],
                "owner": repo["owner"],
                "month": month_str,
                "snapshot_date": month_date,
                # 核心 OpenRank 指标
                "openrank": openrank_val,
                "activity": activity_val,
                "bus_factor": bus_factor_val,
                # 参与者指标
                "participants": participants,
                "new_contributors": new_contributors,
                # 代码变更指标
                "code_change_lines_add": code_add,
                "code_change_lines_remove": code_remove,
                "code_change_lines_sum": code_sum,
                # Issue 指标
                "issues_new": issues_new,
                "issues_closed": issues_closed,
                "issue_resolution_duration": round(random.uniform(0.5, 30), 1),
                # PR 指标
                "pr_merged": pr_merged,
                "pr_open": pr_open,
                "change_requests": change_requests,
                "change_requests_accepted": change_requests_accepted,
                # 关注度
                "attention": random.randint(100, 10000) * max(1, int(growth)),
                "technical_fork": random.randint(5, 500) * max(1, int(growth * 0.3)),
            })
    await db.openrank_metrics.insert_many(openrank_docs)

    # --- Hive 表数据差异对比（不同层之间的前两侧表对比） ---
    hive_layer_db = {"ODS": "ods_db", "DWD": "dwd_db", "DWS": "dws_db", "ADS": "ads_db"}
    hive_layer_storage = {"ODS": "TextFile", "DWD": "ORC", "DWS": "ORC", "ADS": "Parquet"}
    hive_table_pairs = [
        {
            "source_table": "ods_user_login_log", "target_table": "dwd_user_login_detail",
            "source_layer": "ODS", "target_layer": "DWD",
            "partition_field": "dt", "source_columns": 18, "target_columns": 22,
            "comment": "用户登录日志 → 登录明细宽表",
        },
        {
            "source_table": "ods_order_raw", "target_table": "dwd_order_detail",
            "source_layer": "ODS", "target_layer": "DWD",
            "partition_field": "dt", "source_columns": 25, "target_columns": 32,
            "comment": "订单原始数据 → 订单明细宽表",
        },
        {
            "source_table": "ods_payment_flow", "target_table": "dwd_payment_detail",
            "source_layer": "ODS", "target_layer": "DWD",
            "partition_field": "dt", "source_columns": 15, "target_columns": 20,
            "comment": "支付流水 → 支付明细宽表",
        },
        {
            "source_table": "ods_product_info", "target_table": "dwd_product_dim",
            "source_layer": "ODS", "target_layer": "DWD",
            "partition_field": "dt", "source_columns": 12, "target_columns": 16,
            "comment": "商品信息 → 商品维度表",
        },
        {
            "source_table": "ods_click_stream", "target_table": "dwd_user_behavior",
            "source_layer": "ODS", "target_layer": "DWD",
            "partition_field": "dt", "source_columns": 20, "target_columns": 28,
            "comment": "点击流 → 用户行为明细",
        },
        {
            "source_table": "dwd_user_login_detail", "target_table": "dws_user_daily_stat",
            "source_layer": "DWD", "target_layer": "DWS",
            "partition_field": "dt", "source_columns": 22, "target_columns": 14,
            "comment": "登录明细 → 用户日统计",
        },
        {
            "source_table": "dwd_order_detail", "target_table": "dws_order_daily_agg",
            "source_layer": "DWD", "target_layer": "DWS",
            "partition_field": "dt", "source_columns": 32, "target_columns": 18,
            "comment": "订单明细 → 订单日汇总",
        },
        {
            "source_table": "dwd_payment_detail", "target_table": "dws_payment_summary",
            "source_layer": "DWD", "target_layer": "DWS",
            "partition_field": "dt", "source_columns": 20, "target_columns": 12,
            "comment": "支付明细 → 支付汇总",
        },
        {
            "source_table": "dws_user_daily_stat", "target_table": "ads_user_portrait",
            "source_layer": "DWS", "target_layer": "ADS",
            "partition_field": "dt", "source_columns": 14, "target_columns": 10,
            "comment": "用户日统计 → 用户画像",
        },
        {
            "source_table": "dws_order_daily_agg", "target_table": "ads_sales_dashboard",
            "source_layer": "DWS", "target_layer": "ADS",
            "partition_field": "dt", "source_columns": 18, "target_columns": 8,
            "comment": "订单日汇总 → 销售看板",
        },
    ]
    diff_fields = ["user_id", "order_id", "amount", "pay_time", "status", "product_id",
                    "channel", "region", "device_type", "login_time", "quantity", "price"]
    diff_types = ["missing_in_target", "missing_in_source", "value_mismatch", "type_mismatch", "null_diff"]

    hive_diff_docs = []
    for day_offset in range(30):
        compare_date = (now - timedelta(days=29 - day_offset)).strftime("%Y-%m-%d")
        for pair in hive_table_pairs:
            src_layer = pair["source_layer"]
            tgt_layer = pair["target_layer"]
            src_rows = random.randint(50000, 500000)
            match_rate = random.uniform(95.0, 100.0)
            diff_count = int(src_rows * (100 - match_rate) / 100)
            tgt_rows = src_rows - random.randint(-diff_count, diff_count)

            diff_samples = []
            for _ in range(min(diff_count, random.randint(3, 8))):
                field = random.choice(diff_fields)
                dtype = random.choice(diff_types)
                sample = {"field": field, "diff_type": dtype}
                if dtype == "value_mismatch":
                    sample["source_value"] = str(random.randint(1000, 9999))
                    sample["target_value"] = str(random.randint(1000, 9999))
                elif dtype == "null_diff":
                    sample["source_value"] = str(random.randint(1, 999))
                    sample["target_value"] = None
                diff_samples.append(sample)

            hive_diff_docs.append({
                "source_table": pair["source_table"],
                "target_table": pair["target_table"],
                "source_db": hive_layer_db[src_layer],
                "target_db": hive_layer_db[tgt_layer],
                "source_layer": src_layer,
                "target_layer": tgt_layer,
                "source_storage": hive_layer_storage[src_layer],
                "target_storage": hive_layer_storage[tgt_layer],
                "partition_field": pair["partition_field"],
                "partition_value": compare_date,
                "source_columns": pair["source_columns"],
                "target_columns": pair["target_columns"],
                "comment": pair["comment"],
                "compare_date": compare_date,
                "total_source_rows": src_rows,
                "total_target_rows": tgt_rows,
                "diff_count": diff_count,
                "match_rate": round(match_rate, 2),
                "diff_samples": diff_samples,
                "status": "matched" if diff_count == 0 else "has_diff",
                "hdfs_source": f"/user/hive/warehouse/{hive_layer_db[src_layer]}.db/{pair['source_table']}/dt={compare_date}",
                "hdfs_target": f"/user/hive/warehouse/{hive_layer_db[tgt_layer]}.db/{pair['target_table']}/dt={compare_date}",
            })
    await db.hive_table_diffs.insert_many(hive_diff_docs)

    # --- 年报数据（按年月，含同比/环比指标） ---
    annual_metrics = [
        ("revenue", "营业收入", "万元", "financial"),
        ("net_profit", "净利润", "万元", "financial"),
        ("gross_margin", "毛利率", "%", "financial"),
        ("operating_cost", "营业成本", "万元", "financial"),
        ("total_assets", "总资产", "万元", "financial"),
        ("active_users", "活跃用户数", "万人", "operational"),
        ("new_users", "新增用户数", "万人", "operational"),
        ("order_count", "订单总量", "万笔", "operational"),
        ("avg_order_value", "客单价", "元", "operational"),
        ("retention_rate", "用户留存率", "%", "operational"),
        ("dau", "日活用户", "万人", "operational"),
        ("conversion_rate", "转化率", "%", "operational"),
    ]
    base_values = {
        "revenue": 15000, "net_profit": 3000, "gross_margin": 42.0,
        "operating_cost": 8500, "total_assets": 120000,
        "active_users": 850, "new_users": 120, "order_count": 650,
        "avg_order_value": 186, "retention_rate": 68.5, "dau": 320,
        "conversion_rate": 3.8,
    }
    annual_docs = []
    for year in range(2022, 2027):
        for month in range(1, 13):
            if year == 2026 and month > 3:
                break
            for metric_key, label, unit, category in annual_metrics:
                base = base_values[metric_key]
                year_growth = 1 + (year - 2022) * random.uniform(0.08, 0.18)
                season_factor = 1.0
                if month in [1, 2]:
                    season_factor = random.uniform(0.85, 0.95)
                elif month in [6, 11, 12]:
                    season_factor = random.uniform(1.1, 1.3)
                noise = random.uniform(0.92, 1.08)
                value = round(base * year_growth * season_factor * noise, 2)
                if unit == "%":
                    value = round(min(value, 99.9), 1)

                annual_docs.append({
                    "year": year,
                    "month": month,
                    "period": f"{year}-{month:02d}",
                    "metric_key": metric_key,
                    "metric_label": label,
                    "unit": unit,
                    "category": category,
                    "value": value,
                })
    await db.annual_reports.insert_many(annual_docs)

    # 创建索引
    await db.vulnerabilities.create_index("cve_id", unique=True)
    await db.vulnerabilities.create_index("severity")
    await db.vulnerabilities.create_index("published_date")
    await db.vulnerabilities.create_index("package")
    await db.vulnerabilities.create_index("status")
    await db.versions.create_index([("name", 1), ("version", 1)])
    await db.github_trends.create_index([("repo_name", 1), ("snapshot_date", -1)])
    await db.licenses.create_index("spdx_id", unique=True)
    await db.openrank_metrics.create_index([("repo_name", 1), ("month", -1)])
    await db.openrank_metrics.create_index("openrank")
    await db.hive_table_diffs.create_index([("compare_date", -1), ("source_table", 1)])
    await db.hive_table_diffs.create_index([("source_layer", 1), ("target_layer", 1)])
    await db.annual_reports.create_index([("year", 1), ("month", 1), ("metric_key", 1)])
    await db.annual_reports.create_index("period")

    return True
