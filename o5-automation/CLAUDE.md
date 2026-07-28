# o5-automation

Next.js (App Router, TS). One flow: user describes a web task in plain English →
Claude Opus 5 inspects the real target site → writes a Hyperbrowser + Playwright
automation → it runs in an isolated Hyperbrowser sandbox → result + script returned.

Keys in `.env.local` (gitignored), server-side only. Model-written code NEVER runs
in the Next.js process — it runs in a fresh `node-chromium` Hyperbrowser sandbox.
See README.md for the loop.
