"""Regenerate historical GitHub trending data with repos spanning ALL years."""
import random, math, asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

# Core repos that appear in every year
CORE_REPOS = [
    ("microsoft", "vscode", "Visual Studio Code", "TypeScript", 80000),
    ("facebook", "react", "A declarative UI library", "JavaScript", 150000),
    ("kubernetes", "kubernetes", "Production-Grade Container Orchestration", "Go", 60000),
    ("pytorch", "pytorch", "Tensors and Dynamic neural networks", "Python", 50000),
    ("tensorflow", "tensorflow", "An Open Source ML Framework", "C++", 50000),
    ("rust-lang", "rust", "Empowering everyone to build reliable software", "Rust", 40000),
    ("golang", "go", "The Go programming language", "Go", 40000),
    ("vercel", "next.js", "The React Framework", "JavaScript", 60000),
    ("tailwindlabs", "tailwindcss", "A utility-first CSS framework", "JavaScript", 30000),
    ("vuejs", "vue", "Progressive JavaScript Framework", "TypeScript", 40000),
    ("sveltejs", "svelte", "Cybernetically enhanced web apps", "TypeScript", 25000),
    ("flutter", "flutter", "UI toolkit for building natively compiled apps", "Dart", 30000),
    ("grafana", "grafana", "Observability and data visualization platform", "TypeScript", 25000),
]

# New repos added each year
YEARLY_BATCH = {
    2021: [
        ("ethereum", "go-ethereum", "Official Go implementation of Ethereum", "Go", 20000),
        ("apple", "swift", "The Swift Programming Language", "C++", 20000),
        ("denoland", "deno", "A modern runtime for JavaScript and TypeScript", "Rust", 10000),
        ("apache", "spark", "Apache Spark - analytics engine", "Scala", 15000),
        ("ohmyzsh", "ohmyzsh", "Community-driven framework for zsh", "Shell", 10000),
        ("hashicorp", "terraform", "Infrastructure as Code", "Go", 10000),
        ("bitcoin", "bitcoin", "Bitcoin Core integration tree", "C++", 20000),
    ],
    2022: [
        ("oven-sh", "bun", "Incredibly fast JavaScript runtime", "Zig", 15000),
        ("tauri-apps", "tauri", "Build smaller desktop applications", "Rust", 10000),
        ("CompVis", "stable-diffusion", "Latent text-to-image diffusion model", "Python", 20000),
        ("supabase", "supabase", "The open source Firebase alternative", "TypeScript", 12000),
        ("withastro", "astro", "The web framework for content-driven sites", "TypeScript", 8000),
        ("microsoft", "TypeScript", "TypeScript is JS with syntax for types", "TypeScript", 20000),
        ("facebook", "lexical", "Extensible text editor framework", "JavaScript", 5000),
    ],
    2023: [
        ("langchain-ai", "langchain", "Building apps with LLMs through composability", "Python", 25000),
        ("ollama", "ollama", "Get up and running with LLMs locally", "Go", 20000),
        ("open-webui", "open-webui", "User-friendly WebUI for LLMs", "Python", 15000),
        ("ggerganov", "llama.cpp", "LLM inference in C/C++", "C++", 12000),
        ("huggingface", "transformers", "State-of-the-art ML for PyTorch", "Python", 30000),
        ("continuedev", "continue", "Open-source copilot for VS Code", "TypeScript", 8000),
        ("Significant-Gravitas", "AutoGPT", "Autonomous GPT-4 experiment", "Python", 15000),
    ],
    2024: [
        ("getcursor", "cursor", "The AI Code Editor", "TypeScript", 25000),
        ("vllm-project", "vllm", "High-throughput LLM inference engine", "Python", 15000),
        ("n8n-io", "n8n", "Source-available workflow automation", "TypeScript", 12000),
        ("langgenius", "dify", "Open-source LLM app dev platform", "Python", 10000),
        ("All-Hands-AI", "OpenHands", "AI-powered software dev agent", "Python", 10000),
        ("lobehub", "lobe-chat", "Modern-design LLM chat framework", "TypeScript", 8000),
        ("claudecode", "claude-code", "Anthropic agentic coding tool", "TypeScript", 12000),
    ],
    2025: [
        ("deepseek-ai", "DeepSeek-V3", "DeepSeek-V3", "Python", 20000),
        ("open-source-labs", "openclaw", "OS for AI agents", "TypeScript", 15000),
        ("modular", "mojo", "The Mojo Programming Language", "Python", 10000),
        ("jina-ai", "reader", "Convert any URL to LLM-friendly input", "TypeScript", 8000),
        ("browser-use", "browser-use", "Make websites accessible for AI agents", "Python", 8000),
        ("CopilotKit", "CopilotKit", "React UI for AI copilots", "TypeScript", 6000),
        ("nocodb", "nocodb", "Open Source Airtable Alternative", "TypeScript", 6000),
    ],
}

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.report_agent
    await db.github_trends.delete_many({})
    print("Cleared old data")

    docs = []
    total_docs = 0

    for year in range(2021, 2026):
        # Build repo list: core + yearly batch
        repos = list(CORE_REPOS)
        repos.extend(YEARLY_BATCH.get(year, []))
        print(f"\n{year}: generating {len(repos)} repos...")

        start_date = datetime(year, 1, 1)
        end_date = datetime(year + 1, 1, 1)

        for owner, name, desc, lang, base_stars in repos:
            # Each repo has a growth trajectory starting from base_stars
            current_stars = base_stars
            # Growth is stronger for newer repos
            year_growth = int(base_stars * random.uniform(0.3, 1.5))

            date = start_date
            while date < end_date:
                # Seasonal growth with noise
                progress = (date - start_date).days / max((end_date - start_date).days, 1)
                # Summer dip, December surge
                month = date.month
                season = 0.7 if month in [7, 8] else (1.3 if month in [11, 12] else 1.0)
                daily = max(0, int(
                    (year_growth / 365) * random.uniform(0.5, 3.0) * season
                ))
                current_stars += daily * random.randint(1, 2)

                # Snapshot every 7 days
                if date.day % 7 == 1 or date.day == 1:
                    docs.append({
                        "repo_name": name,
                        "owner": owner,
                        "description": desc,
                        "language": lang,
                        "stars": current_stars,
                        "forks": int(current_stars * random.uniform(0.05, 0.25)),
                        "stars_today": daily * 7,
                        "snapshot_date": date,
                    })

                date += timedelta(days=1)

                if len(docs) >= 5000:
                    await db.github_trends.insert_many(docs)
                    total_docs += len(docs)
                    print(f"  {total_docs:,} docs...", end="\r")
                    docs = []

    if docs:
        await db.github_trends.insert_many(docs)
        total_docs += len(docs)

    await db.github_trends.create_index([("repo_name", 1), ("snapshot_date", -1)])
    print(f"\n\nDone! Total: {total_docs:,} docs")

    # Verify
    years = sorted(await db.github_trends.distinct("$year", "snapshot_date"))
    repo_count = len(await db.github_trends.distinct("repo_name"))
    print(f"Years in DB: {years}")
    print(f"Unique repos in DB: {repo_count}")

    # Verify continuity: check how many repos span all years
    from collections import defaultdict
    pipeline = [
        {"$group": {
            "_id": "$repo_name",
            "years": {"$addToSet": {"$year": "$snapshot_date"}}
        }}
    ]
    results = await db.github_trends.aggregate(pipeline).to_list(None)
    spans = defaultdict(int)
    for r in results:
        spans[len(r["years"])] += 1
    print(f"\nRepo year-span distribution:")
    for n in sorted(spans.keys(), reverse=True):
        print(f"  {n} years: {spans[n]} repos")

    client.close()

asyncio.run(main())
