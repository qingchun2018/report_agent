"""Generate historical GitHub trending data for 2021-2025."""
import random, math, asyncio
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient

REPOS = {
    2021: [
        ("bitcoin", "bitcoin", "Bitcoin Core integration/staging tree", "C++"),
        ("pytorch", "pytorch", "Tensors and Dynamic neural networks in Python", "Python"),
        ("tensorflow", "tensorflow", "An Open Source Machine Learning Framework", "C++"),
        ("vuejs", "vue", "Vue.js is a progressive framework for building UIs", "TypeScript"),
        ("facebook", "react", "A declarative library for building user interfaces", "JavaScript"),
        ("flutter", "flutter", "Flutter makes it easy to build beautiful apps", "Dart"),
        ("kubernetes", "kubernetes", "Production-Grade Container Scheduling", "Go"),
        ("microsoft", "vscode", "Visual Studio Code", "TypeScript"),
        ("apple", "swift", "The Swift Programming Language", "C++"),
        ("ohmyzsh", "ohmyzsh", "A delightful community-driven framework for zsh", "Shell"),
        ("golang", "go", "The Go programming language", "Go"),
        ("rust-lang", "rust", "Empowering everyone to build reliable software", "Rust"),
        ("ethereum", "go-ethereum", "Official Go implementation of Ethereum", "Go"),
        ("denoland", "deno", "A modern runtime for JavaScript and TypeScript", "Rust"),
        ("sveltejs", "svelte", "Cybernetically enhanced web apps", "TypeScript"),
        ("tailwindlabs", "tailwindcss", "A utility-first CSS framework", "JavaScript"),
        ("microsoft", "TypeScript", "TypeScript is a superset of JavaScript", "TypeScript"),
        ("vercel", "next.js", "The React Framework", "JavaScript"),
        ("grafana", "grafana", "Observability and data visualization platform", "TypeScript"),
        ("apache", "spark", "Apache Spark - A unified analytics engine", "Scala"),
    ],
    2022: [
        ("CompVis", "stable-diffusion", "A latent text-to-image diffusion model", "Python"),
        ("openai", "whisper", "Robust Speech Recognition via Large-Scale Weak Supervision", "Python"),
        ("tauri-apps", "tauri", "Build smaller, faster, and more secure desktop applications", "Rust"),
        ("oven-sh", "bun", "Incredibly fast JavaScript runtime, bundler, test runner", "Zig"),
        ("AUTOMATIC1111", "stable-diffusion-webui", "Stable Diffusion web UI", "Python"),
        ("withastro", "astro", "The web framework for content-driven websites", "TypeScript"),
        ("facebook", "react", "A declarative library for building user interfaces", "JavaScript"),
        ("microsoft", "vscode", "Visual Studio Code", "TypeScript"),
        ("pytorch", "pytorch", "Tensors and Dynamic neural networks in Python", "Python"),
        ("vercel", "turbo", "Incremental bundler and build system optimized for JS/TS", "Rust"),
        ("supabase", "supabase", "The open source Firebase alternative", "TypeScript"),
        ("novuhq", "novu", "Open-Source Notification Platform", "TypeScript"),
        ("hashicorp", "terraform", "Terraform enables you to safely build infrastructure", "Go"),
        ("facebook", "lexical", "Lexical is an extensible text editor framework", "JavaScript"),
        ("lucidrains", "imagen-pytorch", "Implementation of Imagen, Google's text-to-image NN", "Python"),
        ("ruffle-rs", "ruffle", "A Flash Player emulator written in Rust", "Rust"),
        ("google", "material-design-icons", "Material Design icons by Google", "TypeScript"),
        ("SerenityOS", "serenity", "The Serenity Operating System", "C++"),
        ("BuilderIO", "mitosis", "Write components once, run everywhere", "TypeScript"),
        ("t3-oss", "create-t3-app", "The best way to start a full-stack TypeScript web app", "TypeScript"),
    ],
    2023: [
        ("langchain-ai", "langchain", "Building applications with LLMs through composability", "Python"),
        ("nomic-ai", "gpt4all", "Open-source LLM that runs anywhere", "C++"),
        ("Chanzhaoyu", "chatgpt-web", "用 Express 和 Vue3 搭建的 ChatGPT 演示网页", "TypeScript"),
        ("microsoft", "vscode", "Visual Studio Code", "TypeScript"),
        ("facebook", "react", "A declarative library for building user interfaces", "JavaScript"),
        ("Binary-Husky", "gpt_academic", "为ChatGPT/GLM提供实用化交互界面", "Python"),
        ("ggerganov", "llama.cpp", "LLM inference in C/C++", "C++"),
        ("openai", "openai-cookbook", "Examples and guides for using the OpenAI API", "Python"),
        ("AntonOsika", "gpt-engineer", "Specify what you want it to build in natural language", "Python"),
        ("yoheinakajima", "babyagi", "AI-powered task management system", "Python"),
        ("Significant-Gravitas", "AutoGPT", "AutoGPT is the vision of accessible AI for all", "Python"),
        ("TabbyML", "tabby", "Self-hosted AI coding assistant", "Rust"),
        ("huggingface", "transformers", "State-of-the-art ML for JAX, PyTorch and TensorFlow", "Python"),
        ("ZuodaoTech", "everyone-can-use-english", "人人都能用英语", "TypeScript"),
        ("continuedev", "continue", "Open-source copilot for VS Code and JetBrains", "TypeScript"),
        ("jmorganca", "ollama", "Get up and running with Llama and other LLMs locally", "Go"),
        ("open-webui", "open-webui", "User-friendly WebUI for LLMs", "Python"),
        ("comfyanonymous", "ComfyUI", "The most powerful and modular diffusion GUI", "Python"),
        ("suno-ai", "bark", "Text-Prompted Generative Audio Model", "Python"),
        ("microsoft", "autogen", "A programming framework for agentic AI", "Python"),
    ],
    2024: [
        ("ollama", "ollama", "Get up and running with Llama and other LLMs locally", "Go"),
        ("open-webui", "open-webui", "User-friendly WebUI for LLMs", "Python"),
        ("microsoft", "vscode", "Visual Studio Code", "TypeScript"),
        ("openai", "whisper", "Robust Speech Recognition via Large-Scale Weak Supervision", "Python"),
        ("lobehub", "lobe-chat", "An open-source modern-design LLMs chat framework", "TypeScript"),
        ("langgenius", "dify", "Dify is an open-source LLM app development platform", "Python"),
        ("claudecode", "claude-code", "Claude Code is an agentic coding tool by Anthropic", "TypeScript"),
        ("getcursor", "cursor", "The AI Code Editor", "TypeScript"),
        ("All-Hands-AI", "OpenHands", "AI-powered software development agent", "Python"),
        ("labring", "FastGPT", "FastGPT is a knowledge-based platform on LLM", "TypeScript"),
        ("vllm-project", "vllm", "A high-throughput and memory-efficient inference engine", "Python"),
        ("anthropics", "courses", "Anthropic's educational courses", "Jupyter Notebook"),
        ("ChatGPTNextWeb", "ChatGPT-Next-Web", "A cross-platform ChatGPT UI", "TypeScript"),
        ("run-llama", "llama_index", "LlamaIndex is a data framework for your LLM applications", "Python"),
        ("n8n-io", "n8n", "Free and source-available fair-code licensed workflow tool", "TypeScript"),
        ("langflow-ai", "langflow", "Langflow is a low-code app builder for AI apps", "Python"),
        ("timescale", "pgai", "A suite of tools to develop RAG and search apps with PostgreSQL", "Python"),
        ("deepseek-ai", "DeepSeek-Coder", "DeepSeek Coder: Let the Code Write Itself", "Python"),
        ("browser-use", "browser-use", "Make websites accessible for AI agents", "Python"),
        ("CopilotKit", "CopilotKit", "React UI for AI copilots", "TypeScript"),
    ],
    2025: [
        ("deepseek-ai", "DeepSeek-V3", "DeepSeek-V3", "Python"),
        ("ollama", "ollama", "Get up and running with Llama and other LLMs locally", "Go"),
        ("open-webui", "open-webui", "User-friendly WebUI for LLMs", "Python"),
        ("microsoft", "vscode", "Visual Studio Code", "TypeScript"),
        ("open-source-labs", "openclaw", "OpenClaw - The operating system for AI agents", "TypeScript"),
        ("getcursor", "cursor", "The AI Code Editor", "TypeScript"),
        ("vllm-project", "vllm", "A high-throughput and memory-efficient inference engine", "Python"),
        ("oven-sh", "bun", "Incredibly fast JavaScript runtime, bundler, test runner", "Zig"),
        ("modular", "mojo", "The Mojo Programming Language", "Python"),
        ("claudecode", "claude-code", "Claude Code is an agentic coding tool by Anthropic", "TypeScript"),
        ("langgenius", "dify", "Dify is an open-source LLM app development platform", "Python"),
        ("All-Hands-AI", "OpenHands", "AI-powered software development agent", "Python"),
        ("n8n-io", "n8n", "Free and source-available fair-code licensed workflow tool", "TypeScript"),
        ("continuedev", "continue", "Open-source copilot for VS Code and JetBrains", "TypeScript"),
        ("nomic-ai", "gpt4all", "Open-source LLM that runs anywhere", "C++"),
        ("solidjs", "solid", "A declarative UI library for building web apps", "TypeScript"),
        ("jina-ai", "reader", "Convert any URL to a LLM-friendly input", "TypeScript"),
        ("Tencent", "Hunyuan3D-2", "High-Resolution and High-Quality 3D Generation", "Python"),
        ("nocodb", "nocodb", "Open Source Airtable Alternative", "TypeScript"),
        ("AppFlowy-IO", "AppFlowy", "Bring projects, wikis, and teams together with AI", "Dart"),
    ],
}

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.report_agent

    # Clear old github_trends data
    await db.github_trends.delete_many({})
    print("Cleared old github_trends data")

    docs = []

    for year in range(2021, 2026):
        repos = REPOS[year]
        start_date = datetime(year, 1, 1)
        end_date = min(datetime(year + 1, 1, 1), datetime(2026, 5, 9))

        # For each repo, generate a growth trajectory
        for owner, name, desc, lang in repos:
            # Each repo starts with some base stars in Jan 1, grows over the year
            # Base stars depend on the repo's "size category"
            base_stars = random.randint(1000, 50000)
            year_growth_target = random.randint(5000, 80000)

            # Growth curve: use logistic-like sigmoid shape with noise
            total_days = (end_date - start_date).days
            current_stars = base_stars
            day_num = 0
            date = start_date

            while date < end_date:
                # Sigmoid-like growth rate through the year
                # Some repos surge early, some late
                surge_point = random.uniform(0.2, 0.8)
                progress = day_num / max(total_days, 1)
                # How fast it's growing at this point
                if progress < surge_point:
                    intensity = 0.3 + 0.7 * (progress / surge_point)
                else:
                    intensity = 1.0 - 0.5 * ((progress - surge_point) / (1 - surge_point))

                # Stars gained today
                daily_gain = max(0, int(
                    (year_growth_target / total_days) * intensity * random.uniform(0.3, 2.5)
                ))
                current_stars += daily_gain * random.randint(1, 3)  # compound effect

                # Only insert weekly snapshots (every 7 days) to keep data manageable
                if date.day % 7 == 1 or date.day == 1:
                    docs.append({
                        "repo_name": name,
                        "owner": owner,
                        "description": desc,
                        "language": lang,
                        "stars": current_stars,
                        "forks": int(current_stars * random.uniform(0.05, 0.3)),
                        "stars_today": daily_gain * 7,  # cumulative for the week
                        "snapshot_date": date,
                    })

                day_num += 1
                date += timedelta(days=1)

            if len(docs) >= 5000:
                await db.github_trends.insert_many(docs)
                print(f"  Inserted batch ({len(docs)} docs)... year={year}, date={date.date()}")
                docs = []

    if docs:
        await db.github_trends.insert_many(docs)
        print(f"  Final batch: {len(docs)} docs")

    # Add indexes
    try:
        await db.github_trends.create_index([("repo_name", 1), ("snapshot_date", -1)])
    except Exception:
        pass

    total = await db.github_trends.count_documents({})
    print(f"\nDone! Total github_trends docs: {total}")

    # Verify years
    try:
        pipeline = [{"$group": {"_id": {"$year": "$snapshot_date"}}}, {"$sort": {"_id": 1}}]
        years = await db.github_trends.aggregate(pipeline).to_list(None)
        print(f"Years: {[r['_id'] for r in years]}")
    except Exception as e:
        print(f"Year check: {e}")

    client.close()

asyncio.run(main())
