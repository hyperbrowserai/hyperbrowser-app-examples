import Anthropic from "@anthropic-ai/sdk";

/**
 * Generate DESIGN.md from viewport screenshot + scraped markdown using Opus 4.7.
 */
export async function generateDesignMdStream(
  url: string,
  base64Png: string,
  scrapedMarkdown: string,
  onChunk: (text: string) => void
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const anthropic = new Anthropic({ apiKey });

  const stream = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    stream: true,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: base64Png,
            },
          },
          {
            type: "text",
            text: `You are a design system extraction expert. You have been given:

1. A screenshot of a website (above) — viewport only
2. Scraped HTML/CSS-related content from the same page as markdown (below)

Your task: Generate a DESIGN.md file following Google's open DESIGN.md specification.
Reference: https://github.com/google-labs-code/design.md

The DESIGN.md format uses YAML frontmatter for machine-readable tokens, followed by markdown sections explaining the design rationale.

## YAML Frontmatter (between --- delimiters)

Extract these from the screenshot AND the scraped content:

- name: [brand/site name visible on the page]
- colors:
    primary: [exact hex from CSS or best visual match]
    secondary: [exact hex]
    tertiary: [exact hex if present]
    neutral: [background hex]
    error: [red-ish color if visible]
    success: [green-ish color if visible]
- typography:
    h1: { fontFamily, fontSize (in rem), fontWeight, lineHeight, letterSpacing }
    body-md: { fontFamily, fontSize, fontWeight, lineHeight }
    label-caps: { fontFamily, fontSize } (if visible; omit key if not)
- rounded: { sm, md, lg } in px
- spacing: { sm, md, lg } in px

Use nested YAML maps for typography keys (h1, body-md, label-caps) with the properties as sub-keys.

## Markdown Body (after frontmatter)

Write these sections:
- ## Overview — 1-2 sentence design philosophy description
- ## Colors — explain what each color is for semantically
- ## Typography — describe the type hierarchy and when to use each
- ## Layout — spacing system, border radius philosophy, grid patterns observed
- ## Components — describe key UI components visible (buttons, cards, inputs, navigation) with their visual characteristics

Rules:
- Use EXACT hex codes from the scraped content wherever possible. Only estimate from the screenshot if CSS does not provide them.
- Font families must be exact from CSS when present. Do not invent font names.
- Keep the overview concise and opinionated, like a creative brief.
- Output ONLY the DESIGN.md content. No preamble, no explanation.

Source URL: ${url}

## Scraped page content (markdown):

${scrapedMarkdown}`,
          },
        ],
      },
    ],
  });

  let fullText = "";
  for await (const chunk of stream) {
    if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
      fullText += chunk.delta.text;
      onChunk(chunk.delta.text);
    }
  }

  if (!fullText) {
    throw new Error("No content generated from Anthropic");
  }

  return fullText;
}
