import OpenAI from "openai";
import { SkillTreeResult } from "./types";

export async function generateSkillTree(
  topic: string,
  extractedContent: string
): Promise<SkillTreeResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are a skill tree generator for Claude Code AI agents. Given scraped documentation, generate a knowledge graph of interconnected SKILL.md files — each one a real, actionable skill file, not a stub.

Output a JSON object:
{
  "topic": "stripe-api",
  "files": [
    { "path": "index.md", "content": "..." },
    { "path": "core-concepts/authentication.md", "content": "..." }
  ]
}

STRUCTURE — generate 8-12 concept files + 1 index.md.

EVERY concept file MUST follow this template and be 80-200 lines:

---
title: <Concept Name>
description: <One-line summary of what this concept covers>
links: [<related-file-names-without-md-extension>]
---

# <Concept Name>

<2-3 sentence overview. Weave in [[wikilinks]] to related concepts naturally.>

## Key Information

<Bullet points of essential facts, parameters, configuration options, or API details extracted from the scraped sources. Be specific — include actual parameter names, types, default values, valid ranges, etc. 10-20 bullets minimum.>

## Implementation

<Step-by-step imperative instructions: "Use X", "Set Y to Z", "Call this endpoint with...". Include real code examples from the sources.>

\`\`\`<language>
<Real code example from scraped content — actual API calls, config blocks, or usage patterns. NOT pseudocode.>
\`\`\`

## Common Patterns

<Practical patterns, best practices, and gotchas. Weave in [[wikilinks]] where other concepts are relevant.>

## Sources

<URLs used>

CONTENT RULES:
- Use IMPERATIVE language: "Use X", "Configure Y", "Handle Z with..."
- Extract REAL information from provided sources only — never invent APIs or hallucinate
- Include actual code examples, config snippets, CLI commands from the sources
- Each bullet in Key Information must contain a concrete fact, not a vague description
- [[Wikilinks]] must be woven into prose: "Authentication requires [[api-keys]] to..." NOT "Related: [[api-keys]]"
- Every file must link to at least 2 other files; no orphan nodes
- Group into folders only when 3+ files form a natural cluster

INDEX.MD RULES:
- List every concept area with a 2-3 sentence description
- Note cross-cutting connections between areas
- Include a Gaps section if sources lack coverage on expected topics
- Do NOT include YAML frontmatter in index.md

Return ONLY the JSON object.`;

  const userPrompt = `Create a skill tree for: "${topic}"

Extracted documentation content:

${extractedContent}

Generate 8-12 deeply detailed, interconnected skill files. Each file must have real code examples, specific API details, and actionable instructions extracted from the sources above. Do not generate thin stubs.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.5,
    max_tokens: 16384,
    response_format: { type: "json_object" },
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No content generated from OpenAI");
  }

  const parsed: SkillTreeResult = JSON.parse(content);

  if (
    !parsed.topic ||
    !Array.isArray(parsed.files) ||
    parsed.files.length === 0
  ) {
    throw new Error("Invalid skill tree structure returned from OpenAI");
  }

  return parsed;
}
