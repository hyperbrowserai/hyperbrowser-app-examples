# o5-automation

Next.js (App Router, TS). One flow: user describes a web task → Hyperbrowser
Claude Computer Use runs it with `claude-opus-5` → navigation knowledge is
written to `.memory/<domain>.json` for the next browser agent.

Keys in `.env.local` are server-side only. The product does not generate or
execute code. Use only official `@hyperbrowser/sdk` agent methods. Memory is
portable, versioned JSON; displayed counts and comparisons must be measured.
See README.md for the loop.
