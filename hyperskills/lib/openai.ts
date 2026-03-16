import OpenAI from "openai";
import { ScrapedContent, SkillTreeResult } from "@/types";

export async function generateSkill(
  topic: string,
  scrapedData: ScrapedContent[]
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
  });

  // Prepare context from scraped content
  const context = scrapedData
    .map((content, index) => {
      return `Source ${index + 1}: ${content.url}\n\n${content.markdown}\n\n---\n`;
    })
    .join("\n");

  const systemPrompt = `You are an expert at creating SKILL.md files for Claude Code AI agents following the official format.

CRITICAL FORMATTING RULES:

1. **name field**: 
   - Convert topic to kebab-case (lowercase letters, numbers, hyphens only)
   - Max 64 characters
   - Examples: "supabase-auth", "nextjs-15-routing", "prisma-migrations"

2. **description field** (MOST IMPORTANT):
   - Max 1024 characters
   - This is the PRIMARY trigger mechanism - Claude reads this to decide when to use the skill
   - MUST include: What the skill does + ALL trigger conditions/contexts when Claude should use it
   - Be specific about when to apply this knowledge
   - Example: "Supabase authentication patterns and implementation. Use when building auth flows with Supabase, implementing login/signup, handling sessions, or working with Supabase Auth APIs."

3. **Body content**:
   - Keep under 500 lines total
   - Use IMPERATIVE/DIRECTIVE language (tell Claude what to DO)
   - NO "When to Use This Skill" sections - that info belongs ONLY in the description field
   - Start with core implementation instructions
   - Be concise and actionable

4. **Structure**:
   - # <Topic> (main heading)
   - Core instructions in imperative form (do X, use Y, implement Z)
   - ## Key Information (bullet points of main concepts)
   - ## Examples (code snippets if available)
   - ## Sources (URLs used)

Generate a SKILL.md file that follows this EXACT format:

---
name: <topic-in-kebab-case>
description: <What this does and when Claude should use it. Include all trigger conditions. Max 1024 chars.>
---

# <Topic>

<Core instructions in imperative form. Tell Claude what to do, not what might happen.>

## Key Information

<Main facts and concepts from scraped sources as bullet points>

## Examples

<Code examples if available in the sources. Real working code only.>

## Sources

<List all URLs, one per line with dash prefix>

CRITICAL RULES:
- Extract REAL information from provided sources only
- Do NOT make up information
- Use imperative language: "Use X", "Implement Y", "Handle Z"
- NO "When to Use" sections in the body - only in description
- Keep body under 500 lines
- name: kebab-case, max 64 chars
- description: max 1024 chars, includes ALL triggers`;

  const userPrompt = `Create a SKILL.md file for the topic: "${topic}"

Use the following scraped content from web sources:

${context}

Generate a complete SKILL.md file following the official Claude Code format:
1. Convert "${topic}" to kebab-case for the name field
2. Write a comprehensive description (max 1024 chars) that includes WHEN Claude should use this skill
3. Use imperative instructions in the body
4. Extract real code examples from the sources
5. Keep total length under 500 lines`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.5,
      max_tokens: 3500,
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated from OpenAI");
    }

    return content;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate skill: ${error.message}`);
    }
    throw new Error("Failed to generate skill: Unknown error");
  }
}

export async function generateSkillTree(
  topic: string,
  scrapedData: ScrapedContent[]
): Promise<SkillTreeResult> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });

  const context = scrapedData
    .map((content, index) => {
      return `Source ${index + 1}: ${content.url}\n\n${content.markdown}\n\n---\n`;
    })
    .join("\n");

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

Scraped documentation content:

${context}

Generate 8-12 deeply detailed, interconnected skill files. Each file must have real code examples, specific API details, and actionable instructions extracted from the sources above. Do not generate thin stubs.`;

  try {
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

    if (!parsed.topic || !Array.isArray(parsed.files) || parsed.files.length === 0) {
      throw new Error("Invalid skill tree structure returned from OpenAI");
    }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error("Failed to parse skill tree JSON from OpenAI");
    }
    if (error instanceof Error) {
      throw new Error(`Failed to generate skill tree: ${error.message}`);
    }
    throw new Error("Failed to generate skill tree: Unknown error");
  }
}
