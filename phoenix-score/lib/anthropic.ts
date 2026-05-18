import Anthropic from "@anthropic-ai/sdk";
import type { ScoreResult } from "./types";

const MODEL = "claude-sonnet-4-20250514";

function buildPrompt(tweetText: string, isFromUrl: boolean): string {
  return `You are a tweet engagement analyzer using the documented weights from xAI's open-source X algorithm (xai-org/x-algorithm, Phoenix model, May 2026).

The algorithm's engagement action weights from the source code:
- Favorite (like): base signal, 1.0x weight in ranking
- Reply: 13.5x weight (highest conversational signal)
- Repost (retweet): 20.0x weight (highest amplification signal)
- Bookmark: 10.0x weight (high-value save signal)
- Profile click: 12.0x weight
- Link click: 11.0x weight
- Dwell time: continuous signal, longer dwell = better
- Video quality view (VQV): important for video tweets
- Share via DM: ~8.0x weight
- Share via copy link: ~8.0x weight
- Quote tweet: ~15.0x weight
- Follow author: strong positive signal

Negative signals (reduce distribution):
- Not interested: strong negative
- Block author: very strong negative
- Mute author: strong negative
- Report: strongest negative

Algorithm behavior factors from the source code:
- First 30-60 minutes velocity is critical for distribution
- External links get a 30-50% reach penalty
- Video content is heavily weighted
- Images boost engagement over text-only
- Questions drive replies (13.5x weight makes this valuable)
- 100-200 characters tends to perform best
- Threads: first tweet carries the most weight
- Author diversity: algorithm penalizes if one author dominates feed
- Hashtags: minimal impact, can look spammy if overused
- Mentions: tagging relevant accounts can help if they engage

Analyze this tweet and predict how the algorithm would score it:

"""
${tweetText}
"""

${isFromUrl ? "This is a live tweet fetched from X." : "This is a draft tweet (not yet posted)."}

Return ONLY a JSON object (no markdown, no backticks, no preamble):
{
  "score": <number 0-100>,
  "verdict": "<one short sentence about the score>",
  "predictions": {
    "favorite": <0.0-1.0>,
    "reply": <0.0-1.0>,
    "repost": <0.0-1.0>,
    "bookmark": <0.0-1.0>,
    "profile_click": <0.0-1.0>,
    "dwell": <0.0-1.0>,
    "vqv": <0.0-1.0>,
    "share": <0.0-1.0>,
    "quote": <0.0-1.0>,
    "follow_author": <0.0-1.0>,
    "not_interested": <0.0-1.0>,
    "block_author": <0.0-1.0>,
    "mute_author": <0.0-1.0>,
    "report": <0.0-1.0>
  },
  "breakdown": {
    "favoriteWeighted": <favorite * 1.0>,
    "replyWeighted": <reply * 13.5>,
    "repostWeighted": <repost * 20.0>,
    "bookmarkWeighted": <bookmark * 10.0>,
    "profileClickWeighted": <profile_click * 12.0>,
    "shareWeighted": <share * 8.0>,
    "quoteWeighted": <quote * 15.0>,
    "negativeTotal": <sum of all negative signals weighted>
  },
  "signals": [
    {
      "type": "positive" | "warning" | "negative",
      "label": "<short label>",
      "detail": "<one sentence explanation>"
    }
  ],
  "suggestions": [
    "<specific, actionable suggestion to improve the score>"
  ]
}

Scoring guide for the "score" field:
- 90-100: Exceptional. High reply/repost/bookmark probability. Low negative signals.
- 70-89: Strong. Good engagement signals across multiple weighted actions.
- 50-69: Average. Some positive signals but missing key engagement drivers.
- 30-49: Below average. Weak engagement signals or presence of negative factors.
- 0-29: Low distribution likely. High negative signals or structural problems.

Be specific in signals and suggestions. Reference the actual weights. For example:
- "Questions drive replies, which carry 13.5x weight in the ranking formula"
- "External links reduce reach by 30-50%. Move the link to a reply."
- "Short, punchy text (100-200 chars) tends to maximize dwell-to-engagement ratio"

Generate 3-6 signals and 2-4 suggestions.`;
}

const EXTRACT_PROMPT = `You will be given the markdown content of an x.com or twitter.com page.
Extract the primary tweet's text content only. Strip away profile chrome, navigation, sidebars, reply chains, and engagement counts.
Return ONLY the raw tweet text, nothing else. No quotes, no prefix, no preamble.`;

function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }
  return new Anthropic({ apiKey });
}

function textFromResponse(content: Anthropic.Messages.ContentBlock[]): string {
  const block = content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("No text response from Claude");
  }
  return block.text;
}

export async function extractTweetText(pageMarkdown: string): Promise<string> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `${EXTRACT_PROMPT}\n\n---\n\n${pageMarkdown.slice(0, 12000)}`,
      },
    ],
  });

  const text = textFromResponse(response.content).trim();
  if (!text) {
    throw new Error("Could not extract tweet text from page");
  }
  return text;
}

export async function scoreTweet(
  tweetText: string,
  isFromUrl: boolean,
): Promise<ScoreResult> {
  const client = getClient();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: buildPrompt(tweetText, isFromUrl),
      },
    ],
  });

  const raw = textFromResponse(response.content);
  const cleaned = stripCodeFences(raw);

  let parsed: ScoreResult;
  try {
    parsed = JSON.parse(cleaned) as ScoreResult;
  } catch {
    throw new Error("Claude returned malformed JSON");
  }

  return parsed;
}
