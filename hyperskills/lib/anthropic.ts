import Anthropic from "@anthropic-ai/sdk";

const SKILL_FORMAT_PROMPT = `You are an expert at creating SKILL.md files for Claude Code AI agents following the official format.

CRITICAL FORMATTING RULES:

1. **name field**:
   - Convert the website/tool name to kebab-case (lowercase letters, numbers, hyphens only)
   - Max 64 characters
   - Examples: "supabase-auth", "nextjs-15-routing", "prisma-migrations"

2. **description field** (MOST IMPORTANT):
   - Max 1024 characters
   - This is the PRIMARY trigger mechanism - Claude reads this to decide when to use the skill
   - MUST include: What the skill does + ALL trigger conditions/contexts when Claude should use it
   - Be specific about when to apply this knowledge

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

<Main facts and concepts from the visual analysis as bullet points>

## Examples

<Code examples only when they are clearly visible from the screenshot. Use real visible snippets only.>

## Sources

<List all URLs, one per line with dash prefix>

CRITICAL RULES:
- Extract REAL information from the image only
- Do NOT make up information
- Use imperative language: "Use X", "Implement Y", "Handle Z"
- NO "When to Use" sections in the body - only in description
- Keep body under 500 lines
- name: kebab-case, max 64 chars
- description: max 1024 chars, includes ALL triggers
- Output ONLY the SKILL.md file content`;

export async function generateVisionSkill(
  url: string,
  base64Screenshot: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const anthropic = new Anthropic({ apiKey });

  const response = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: base64Screenshot,
            },
          },
          {
            type: "text",
            text: `${SKILL_FORMAT_PROMPT}

Analyze this screenshot visually (no HTML parsing or scraping context is provided) and generate one complete SKILL.md.

Target URL: ${url}

Analyze all visible UI details including:
1. Product purpose and visible workflows
2. Layout, information architecture, and navigation
3. Interactive controls, forms, buttons, filters, tables, charts, and status indicators
4. Data entities, terms, and patterns visible on-screen
5. Operational gotchas an agent should know from the UI

In the ## Sources section include exactly one source line:
- ${url}`,
          },
        ],
      },
    ],
  });

  const textContent = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!textContent) {
    throw new Error("No content generated from Anthropic");
  }

  return textContent;
}
