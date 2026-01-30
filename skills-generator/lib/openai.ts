import OpenAI from "openai";
import { ScrapedContent } from "@/types";

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
