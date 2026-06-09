# HYPERHARNESS

**Your markdown is probably lying to your AI agents.**

HyperHarness runs your coding agent inside a Hyperbrowser sandbox, watches it fail against your real repo, and generates a `CLAUDE.md` + `AGENTS.md` from the actual failures — every rule traces to a mistake the agent really made.

## What it does

Paste a public GitHub repo URL. HyperHarness:

1. Spins up a [Hyperbrowser](https://hyperbrowser.ai) sandbox and clones your repo into it
2. Detects the stack and installs dependencies
3. Runs an OpenAI coding agent against **6 test tasks** — with real `run_command` / `read_file` tools, so it actually executes inside the sandbox
4. Records every observed failure: failed commands (by exit code), wrong paths, hallucinated files, broken assumptions
5. Clusters those failures into rules and generates `CLAUDE.md` + `AGENTS.md`
6. Returns a **HarnessScore (0–100)** with a breakdown across Discovery, Specificity, Testability, Documentation, and Structure

## The score

The HarnessScore reflects how well the agent navigated your repo:

- **90–100** — Agent completed most tasks without wrong assumptions
- **70–89** — Some failures, but the project is well-structured
- **50–69** — Multiple failures, unclear structure or docs
- **30–49** — Agent struggled, many wrong assumptions
- **0–29** — Agent could barely navigate the repo

Every rule in the generated harness files maps to an observed failure — no generic boilerplate.

## Setup

```bash
git clone <this-repo>
cd hyperharness
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

```
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key
OPENAI_API_KEY=your_openai_api_key
# Optional: override the model (defaults to gpt-5.4-mini)
# OPENAI_MODEL=gpt-5.4-mini
```

## Tech

- Next.js (App Router) + TypeScript + Tailwind CSS
- Framer Motion for animations
- `@hyperbrowser/sdk` for all sandbox operations
- `openai` (gpt-5.4-mini) for the agent runner and harness writer

Built with **Hyperbrowser Sandboxes**. Open source.
